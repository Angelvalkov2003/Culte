import "server-only";

/**
 * BoxNow Partner API (България). Отделно от Speedy — никакви общи endpoints.
 * Документация: https://boxnow.bg/en/diy/eshops/api · https://www.boxnow.bg/en/partner-api
 * - Auth: POST /api/v1/auth-sessions (client_credentials), токен 1 час.
 * - Автомати: публичен JSON locationapi-*.boxnow.bg/v1/apms_bg-BG.json (без auth).
 * - Пратка: POST /api/v1/delivery-requests; етикет: GET /api/v1/parcels/{id}/label.pdf.
 * - Няма API за цена → фиксирана цена за клиента (BOXNOW_PRICE).
 * - Телефон в международен формат (+359…), суми като низ с 2 знака.
 */

export class BoxnowError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "BoxnowError";
    this.code = code;
  }
}

const isProd = () => (process.env.BOXNOW_ENV ?? "stage").trim().toLowerCase() === "production";
const apiBase = () => (isProd() ? "https://api-production.boxnow.bg" : "https://api-stage.boxnow.bg");
const lockersUrl = () =>
  isProd() ? "https://locationapi-production.boxnow.bg/v1/apms_bg-BG.json" : "https://locationapi-stage.boxnow.bg/v1/apms_bg-BG.json";

export function boxnowConfigured(): boolean {
  return Boolean(
    process.env.BOXNOW_CLIENT_ID?.trim() && process.env.BOXNOW_CLIENT_SECRET?.trim() && process.env.BOXNOW_ORIGIN_ID?.trim(),
  );
}

/** Цена на доставката за клиента, EUR (по договор с BoxNow). */
export function boxnowPrice(): number {
  const v = Number(String(process.env.BOXNOW_PRICE ?? "").replace(",", "."));
  return Number.isFinite(v) && v >= 0 && String(process.env.BOXNOW_PRICE ?? "").trim() !== "" ? Math.round(v * 100) / 100 : 3.9;
}

export function boxnowPartnerId(): string | null {
  return process.env.BOXNOW_PARTNER_ID?.trim() || null;
}

/** BoxNow грешки: { code: "P405", message, ... } */
const CODES: Record<string, string> = {
  P400: "невалидни данни",
  P401: "невалиден склад (origin)",
  P402: "невалиден автомат (destination)",
  P405: "невалиден телефон",
  P406: "невалиден размер на клетката",
  P410: "дублиран номер на поръчка",
  P411: "наложеният платеж не е разрешен за акаунта",
  P420: "пратката не може да бъде отказана",
};
function formatBoxnowError(json: unknown, status: number): string {
  const j = (json ?? {}) as { code?: string; message?: string; error?: string };
  const code = j.code;
  const text = [code && CODES[code], j.message || j.error].filter(Boolean).join(" — ");
  return `BoxNow${code ? ` ${code}` : ""}: ${text || `HTTP ${status}`}`;
}

/* ---------------- Токен ---------------- */
let token: { value: string; exp: number } | null = null;

async function getToken(): Promise<string> {
  if (!boxnowConfigured()) throw new BoxnowError("BoxNow не е конфигуриран (BOXNOW_CLIENT_ID / SECRET / ORIGIN_ID).");
  if (token && token.exp > Date.now() + 60_000) return token.value;
  const res = await fetch(`${apiBase()}/api/v1/auth-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.BOXNOW_CLIENT_ID!.trim(),
      client_secret: process.env.BOXNOW_CLIENT_SECRET!.trim(),
    }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.access_token) throw new BoxnowError(formatBoxnowError(json, res.status));
  token = { value: json.access_token, exp: Date.now() + (Number(json.expires_in) || 3600) * 1000 };
  return token.value;
}

async function api<T>(path: string, init: RequestInit & { raw?: boolean } = {}): Promise<T> {
  const t = await getToken();
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  if (res.status === 401) token = null;
  if (init.raw && res.ok) return (await res.arrayBuffer()) as T;
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new BoxnowError(formatBoxnowError(json, res.status), (json as { code?: string })?.code);
  return json as T;
}

/* ---------------- Автомати (публичен списък) ---------------- */
export interface BoxnowLocker {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
}

let lockers: { at: number; list: BoxnowLocker[] } | null = null;

export async function getBoxnowLockers(): Promise<BoxnowLocker[]> {
  if (lockers && Date.now() - lockers.at < 6 * 3600_000) return lockers.list;
  const res = await fetch(lockersUrl(), { cache: "no-store" });
  if (!res.ok) throw new BoxnowError(`Списъкът с автомати не е достъпен (HTTP ${res.status}).`);
  const json = (await res.json()) as unknown;
  const raw = (Array.isArray(json) ? json : ((json as { data?: unknown[] })?.data ?? [])) as Record<string, string>[];
  const list = raw
    .filter((x) => x.id && (x.type ?? "apm").includes("apm"))
    .map((x) => ({
      id: String(x.id),
      name: x.name || x.title || `Автомат ${x.id}`,
      address: [x.addressLine1, x.addressLine2].filter(Boolean).join(", "),
      postalCode: x.postalCode ?? "",
      city: x.addressLine2 ?? "",
    }));
  lockers = { at: Date.now(), list };
  return list;
}

export async function getBoxnowLocker(id: string): Promise<BoxnowLocker | null> {
  try {
    return (await getBoxnowLockers()).find((l) => l.id === id) ?? null;
  } catch {
    return null;
  }
}

export async function searchBoxnowLockers(q: string, limit = 30): Promise<BoxnowLocker[]> {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  return (await getBoxnowLockers())
    .filter((l) => `${l.name} ${l.address} ${l.postalCode}`.toLowerCase().includes(s))
    .slice(0, limit);
}

/* ---------------- Пратка, етикет, статус ---------------- */
/** +359XXXXXXXXX */
export function boxnowPhone(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("359")) return `+${d}`;
  if (d.startsWith("0")) d = d.slice(1);
  return `+359${d}`;
}

const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

export interface BoxnowDeliveryInput {
  orderNumber: number;
  lockerId: string;
  name: string;
  email: string;
  phone: string;
  total: number;
  cod: boolean;
}

export async function createBoxnowDelivery(i: BoxnowDeliveryInput): Promise<{ deliveryId: string; parcelId: string }> {
  const senderPhone = process.env.BOXNOW_SENDER_PHONE?.trim();
  const senderEmail = process.env.BOXNOW_SENDER_EMAIL?.trim() || process.env.CONTACT_EMAIL?.trim();
  if (!senderPhone || !senderEmail) throw new BoxnowError("Липсват BOXNOW_SENDER_PHONE / BOXNOW_SENDER_EMAIL.");
  const size = Number(process.env.BOXNOW_COMPARTMENT_SIZE) || 2;

  const r = await api<{ id?: string; parcels?: { id: string }[] }>("/api/v1/delivery-requests", {
    method: "POST",
    body: JSON.stringify({
      // Уникален номер (повторен опит не се блъска в P410)
      orderNumber: `${i.orderNumber}_${Math.floor(10000 + Math.random() * 90000)}`,
      invoiceValue: money(i.total),
      paymentMode: i.cod ? "cod" : "prepaid",
      amountToBeCollected: i.cod ? money(i.total) : "0.00",
      allowReturn: true,
      notifyOnAccepted: senderEmail,
      origin: { contactNumber: boxnowPhone(senderPhone), contactEmail: senderEmail, locationId: process.env.BOXNOW_ORIGIN_ID!.trim() },
      destination: {
        contactNumber: boxnowPhone(i.phone),
        contactEmail: i.email,
        contactName: i.name.slice(0, 100),
        locationId: String(i.lockerId),
      },
      items: [{ id: String(i.orderNumber), name: `Поръчка ${i.orderNumber}`, value: money(i.total), weight: 1, compartmentSize: size }],
    }),
  });
  const parcelId = r.parcels?.[0]?.id;
  if (!r.id || !parcelId) throw new BoxnowError("BoxNow не върна номер на пратката.");
  return { deliveryId: String(r.id), parcelId: String(parcelId) };
}

export async function boxnowLabel(parcelId: string): Promise<ArrayBuffer> {
  return api<ArrayBuffer>(`/api/v1/parcels/${encodeURIComponent(parcelId)}/label.pdf`, {
    method: "GET",
    headers: { Accept: "application/pdf" },
    raw: true,
  });
}

/** Статус на пратката → статус на поръчката (null = без промяна). */
export async function boxnowParcelState(parcelId: string): Promise<string | null> {
  const r = await api<{ data?: { id: string; state?: string }[] }>(`/api/v1/parcels?parcelId=${encodeURIComponent(parcelId)}`, {
    method: "GET",
  });
  return r.data?.find((p) => String(p.id) === parcelId)?.state ?? r.data?.[0]?.state ?? null;
}

export function statusFromBoxnow(current: string, state: string | null): "shipped" | "delivered" | null {
  if (state === "delivered") return current === "delivered" ? null : "delivered";
  if (current === "processing" && (state === "in-transit" || state === "in-final-destination")) return "shipped";
  return null;
}
