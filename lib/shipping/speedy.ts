import "server-only";

/**
 * Speedy API v1 wrapper (https://api.speedy.bg/v1).
 * Правила, проверени в продукция:
 * - userName/password/language във ВСЕКИ POST body;
 * - /location/office/ се вика САМО със siteId (officeType → HTTP 400); OFFICE/APT филтрираме локално;
 * - едно и също тегло при calculate и shipment;
 * - при calculate за адрес се праща само siteId (без улица).
 */

const BASE = "https://api.speedy.bg/v1";
export const SPEEDY_COUNTRY_ID = 100; // България
export const SPEEDY_SERVICE_ID = 505; // Speedy Standard
/** Фиксирано тегло на пратка (козметика): ползва се и при calculate, и при shipment. */
export const SPEEDY_WEIGHT_KG = 1;
const BGN_PER_EUR = 1.95583;

export type SpeedyMethod = "speedy_office" | "speedy_apt" | "speedy_address";
export type OfficeType = "OFFICE" | "APT";

export class SpeedyError extends Error {
  code?: string | number;
  constructor(message: string, code?: string | number) {
    super(message);
    this.name = "SpeedyError";
    this.code = code;
  }
}

export function speedyConfigured(): boolean {
  return Boolean(process.env.SPEEDY_USERNAME?.trim() && process.env.SPEEDY_PASSWORD?.trim());
}

function auth() {
  if (!speedyConfigured()) throw new SpeedyError("Speedy не е конфигуриран (SPEEDY_USERNAME / SPEEDY_PASSWORD).");
  return { userName: process.env.SPEEDY_USERNAME!.trim(), password: process.env.SPEEDY_PASSWORD!.trim(), language: "BG" };
}

/** Четимо съобщение от { error: { message, context, code } } — без да показваме паролата. */
export function formatSpeedyError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const e = err as { message?: string; context?: string; code?: string | number };
    return [e.message, e.context && `(${e.context})`, e.code != null && `[код ${e.code}]`].filter(Boolean).join(" ");
  }
  return "Неизвестна грешка от Speedy";
}

async function post<T>(path: string, body: Record<string, unknown>, opts: { raw?: boolean; timeoutMs?: number } = {}): Promise<T> {
  const credentials = auth(); // хвърля ясна грешка, ако липсват ключове
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15000);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: opts.raw ? "application/pdf, application/json" : "application/json" },
      body: JSON.stringify({ ...credentials, ...body }),
      signal: ctrl.signal,
      cache: "no-store",
    });
  } catch (e) {
    throw new SpeedyError(e instanceof Error && e.name === "AbortError" ? "Speedy не отговори навреме." : "Няма връзка със Speedy.");
  } finally {
    clearTimeout(timer);
  }

  const type = res.headers.get("content-type") ?? "";
  if (opts.raw && !type.includes("json")) {
    if (!res.ok) throw new SpeedyError(`Speedy върна HTTP ${res.status}`);
    return (await res.arrayBuffer()) as T;
  }
  let json: Record<string, unknown>;
  try {
    json = await res.json();
  } catch {
    throw new SpeedyError(`Speedy върна невалиден отговор (HTTP ${res.status}).`);
  }
  if (json?.error) {
    const e = json.error as { code?: string | number };
    throw new SpeedyError(formatSpeedyError(json.error), e.code);
  }
  if (!res.ok) throw new SpeedyError(`Speedy върна HTTP ${res.status}.`);
  return json as T;
}

/* ------------------------------------------------------------------ */
/* Кеш в паметта (за търсене на места и офиси)                         */
/* ------------------------------------------------------------------ */
const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return value;
}

/* ------------------------------------------------------------------ */
/* Населени места                                                      */
/* ------------------------------------------------------------------ */
export interface SpeedySite {
  id: number;
  label: string; // "гр. София (1000)"
  name: string;
  postCode: string;
  municipality: string;
  region: string;
}

interface RawSite {
  id: number;
  type?: string;
  name: string;
  postCode?: string;
  municipality?: string;
  region?: string;
}

export async function searchSites(q: string): Promise<SpeedySite[]> {
  const name = q.trim();
  if (name.length < 2) return [];
  return cached(`site:${name.toLowerCase()}`, 6 * 3600_000, async () => {
    const r = await post<{ sites?: RawSite[] }>("/location/site/", { countryId: SPEEDY_COUNTRY_ID, name });
    return (r.sites ?? []).slice(0, 30).map((s) => ({
      id: s.id,
      name: s.name,
      postCode: s.postCode ?? "",
      municipality: s.municipality ?? "",
      region: s.region ?? "",
      label: `${s.type ? `${s.type} ` : ""}${s.name}${s.postCode ? ` (${s.postCode})` : ""}`,
    }));
  });
}

/* ------------------------------------------------------------------ */
/* Офиси и автомати                                                    */
/* ------------------------------------------------------------------ */
export interface SpeedyOffice {
  id: number;
  name: string;
  type: OfficeType;
  address: string;
}

interface RawOffice {
  id: number;
  name: string;
  type?: string;
  address?: { fullAddressString?: string; localAddressString?: string };
}

/** ВНИМАНИЕ: само siteId към Speedy; типът се филтрира локално. */
export async function listOffices(siteId: number, type?: OfficeType): Promise<SpeedyOffice[]> {
  const all = await cached(`offices:${siteId}`, 3600_000, async () => {
    const r = await post<{ offices?: RawOffice[] }>("/location/office/", { siteId });
    return (r.offices ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      type: (o.type === "APT" ? "APT" : "OFFICE") as OfficeType,
      address: o.address?.fullAddressString || o.address?.localAddressString || "",
    }));
  });
  return type ? all.filter((o) => o.type === type) : all;
}

/* ------------------------------------------------------------------ */
/* Калкулация                                                           */
/* ------------------------------------------------------------------ */
export interface SpeedyQuote {
  price: number; // EUR, с ДДС
  deadline: string | null;
}

interface RawCalc {
  calculations?: {
    serviceId: number;
    price?: { total?: number; currencyLocal?: string; currency?: string };
    deliveryDeadline?: string;
    error?: { message?: string; context?: string; code?: number };
  }[];
}

function toEur(amount: number, currency?: string): number {
  const v = currency === "BGN" ? amount / BGN_PER_EUR : amount;
  return Math.round(v * 100) / 100;
}

export async function calculate(input: { method: SpeedyMethod; siteId: number; officeId?: number | null }): Promise<SpeedyQuote> {
  const recipient =
    input.method === "speedy_address"
      ? { privatePerson: true, addressLocation: { siteId: input.siteId } }
      : { privatePerson: true, pickupOfficeId: input.officeId };
  if (input.method !== "speedy_address" && !input.officeId) throw new SpeedyError("Изберете офис или автомат.");

  const key = `calc:${input.method}:${input.siteId}:${input.officeId ?? ""}`;
  return cached(key, 10 * 60_000, async () => {
    const r = await post<RawCalc>("/calculate/", {
      recipient,
      service: { autoAdjustPickupDate: true, serviceIds: [SPEEDY_SERVICE_ID] },
      content: { parcelsCount: 1, totalWeight: SPEEDY_WEIGHT_KG },
      payment: { courierServicePayer: "SENDER" },
    });
    const c = r.calculations?.find((x) => x.serviceId === SPEEDY_SERVICE_ID) ?? r.calculations?.[0];
    if (!c) throw new SpeedyError("Speedy не върна цена за тази дестинация.");
    if (c.error) throw new SpeedyError(formatSpeedyError(c.error), c.error.code);
    if (c.price?.total == null) throw new SpeedyError("Speedy не върна цена.");
    return { price: toEur(c.price.total, c.price.currency), deadline: c.deliveryDeadline ?? null };
  });
}

/* ------------------------------------------------------------------ */
/* Товарителница                                                       */
/* ------------------------------------------------------------------ */
/** BG телефон: само цифри; 359… → 0…; 9 цифри → водеща 0. */
export function normalizePhone(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00359")) d = d.slice(2);
  if (d.startsWith("359")) d = `0${d.slice(3)}`;
  if (d.length === 9) d = `0${d}`;
  return d;
}

export interface ShipmentInput {
  orderId: string;
  orderNumber: number;
  method: SpeedyMethod;
  siteId: number | null;
  officeId: number | null;
  addressLine: string;
  name: string;
  email: string;
  phone: string;
  codAmount: number | null; // null = без наложен платеж
}

export interface ShipmentResult {
  shipmentId: string;
  parcelId: string;
  deadline: string | null;
}

export async function createShipment(i: ShipmentInput): Promise<ShipmentResult> {
  const phone = normalizePhone(i.phone);
  if (phone.length < 10) throw new SpeedyError("Невалиден телефон на получателя.");

  const recipient: Record<string, unknown> = {
    clientName: i.name.slice(0, 60),
    privatePerson: true,
    phone1: { number: phone },
    ...(i.email ? { email: i.email } : {}),
  };
  if (i.method === "speedy_address") {
    if (!i.siteId || !i.addressLine.trim()) throw new SpeedyError("Липсва населено място или адрес.");
    recipient.address = { countryId: SPEEDY_COUNTRY_ID, siteId: i.siteId, addressNote: i.addressLine.slice(0, 200) };
  } else {
    if (!i.officeId) throw new SpeedyError("Липсва офис/автомат.");
    recipient.pickupOfficeId = i.officeId;
  }

  const sender: Record<string, unknown> = {};
  if (process.env.SPEEDY_SENDER_PHONE) sender.phone1 = { number: normalizePhone(process.env.SPEEDY_SENDER_PHONE) };
  if (process.env.SPEEDY_SENDER_CONTACT_NAME) sender.contactName = process.env.SPEEDY_SENDER_CONTACT_NAME;
  if (process.env.SPEEDY_SENDER_EMAIL) sender.email = process.env.SPEEDY_SENDER_EMAIL;

  const r = await post<{ id?: string; parcels?: { id: string }[]; deliveryDeadline?: string }>(
    "/shipment/",
    {
      ...(Object.keys(sender).length ? { sender } : {}),
      recipient,
      service: {
        serviceId: SPEEDY_SERVICE_ID,
        autoAdjustPickupDate: true,
        ...(i.codAmount != null && i.codAmount > 0
          ? { additionalServices: { cod: { amount: Math.round(i.codAmount * 100) / 100, processingType: "CASH" } } }
          : {}),
      },
      content: {
        parcelsCount: 1,
        totalWeight: SPEEDY_WEIGHT_KG,
        contents: `Козметика за животни, поръчка ${i.orderNumber}`.slice(0, 100),
        package: "BOX",
      },
      payment: { courierServicePayer: "SENDER" },
      ref1: i.orderId.slice(0, 30),
    },
    { timeoutMs: 30000 },
  );
  const parcelId = r.parcels?.[0]?.id;
  if (!r.id || !parcelId) throw new SpeedyError("Speedy не върна номер на товарителница.");
  return { shipmentId: String(r.id), parcelId: String(parcelId), deadline: r.deliveryDeadline ?? null };
}

/** PDF етикет A6. Опитва документирания формат {parcel:{id}}, после {id}. */
export async function printLabel(parcelId: string): Promise<ArrayBuffer> {
  const variants = [[{ parcel: { id: parcelId } }], [{ id: parcelId }]];
  let lastErr: unknown;
  for (const parcels of variants) {
    try {
      const buf = await post<ArrayBuffer>("/print", { paperSize: "A6", format: "pdf", parcels }, { raw: true, timeoutMs: 30000 });
      if (buf instanceof ArrayBuffer && buf.byteLength > 100) return buf;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new SpeedyError("Неуспешно генериране на етикет.");
}

/* ------------------------------------------------------------------ */
/* Проследяване                                                        */
/* ------------------------------------------------------------------ */
export const DELIVERED_CODES = new Set([-14]);
export const IN_TRANSIT_CODES = new Set([39, 148, 1, 2, 11, 21, 12, 217, 176, 152, 1134]);

export interface TrackResult {
  parcelId: string;
  codes: number[];
  lastDescription: string | null;
  error?: string;
}

export async function track(parcelIds: string[]): Promise<TrackResult[]> {
  if (!parcelIds.length) return [];
  const r = await post<{
    parcels?: { parcelId: string; operations?: { operationCode: number; description?: string }[]; error?: unknown }[];
  }>("/track", { parcels: parcelIds.map((id) => ({ id })) }, { timeoutMs: 30000 });
  return (r.parcels ?? []).map((p) => ({
    parcelId: String(p.parcelId),
    codes: (p.operations ?? []).map((o) => Number(o.operationCode)),
    lastDescription: p.operations?.at(-1)?.description ?? null,
    error: p.error ? formatSpeedyError(p.error) : undefined,
  }));
}

/** Нов статус на поръчка по операциите на Speedy, или null = без промяна. */
export function statusFromTrack(current: string, codes: number[]): "shipped" | "delivered" | null {
  if (codes.some((c) => DELIVERED_CODES.has(c))) return current === "delivered" ? null : "delivered";
  if (current === "processing" && codes.some((c) => IN_TRANSIT_CODES.has(c))) return "shipped";
  return null;
}
