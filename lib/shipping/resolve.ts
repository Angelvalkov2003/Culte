import "server-only";
import { z } from "zod";
import { round2 } from "@/lib/format";
import { getShippingMethods } from "@/lib/shop/catalog";
import { calculate, speedyConfigured, SpeedyError } from "@/lib/shipping/speedy";
import { boxnowConfigured, boxnowPrice, getBoxnowLocker } from "@/lib/shipping/boxnow";
import { shippingQuote } from "@/lib/shipping";
import type { DeliveryType } from "@/lib/types";

/** Какво праща клиентът от checkout-а (цената е само за UI — сървърът я преизчислява). */
export const shippingSelectionSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.enum(["speedy_office", "speedy_apt"]),
    siteId: z.number().int().positive(),
    siteName: z.string().trim().max(120),
    officeId: z.number().int().positive(),
    officeName: z.string().trim().max(200),
  }),
  z.object({
    method: z.literal("speedy_address"),
    siteId: z.number().int().positive(),
    siteName: z.string().trim().max(120),
    addressLine: z.string().trim().min(5, "Въведете адрес (улица, номер, блок…)").max(200),
  }),
  z.object({
    method: z.literal("boxnow"),
    lockerId: z.string().trim().min(1).max(40),
    lockerName: z.string().trim().max(200).default(""),
    lockerAddress: z.string().trim().max(300).default(""),
  }),
  z.object({
    method: z.literal("manual"),
    methodId: z.uuid(),
  }),
]);
export type ShippingSelection = z.infer<typeof shippingSelectionSchema>;

export interface ResolvedShipping {
  provider: "speedy" | "boxnow" | "manual";
  method: string;
  method_id: string | null;
  name: string;
  price: number;
  delivery: DeliveryType;
  site_id: number | null;
  site_name: string;
  office_id: number | null;
  office_name: string;
  deadline: string | null;
  details: Record<string, unknown>;
  boxnow_locker_id: string | null;
  boxnow_locker_name: string;
  /** За полетата city/address на поръчката (човешко резюме) */
  city: string;
  address: string;
}

const LABEL = {
  speedy_office: "Speedy — до офис",
  speedy_apt: "Speedy — до автомат",
  speedy_address: "Speedy — до адрес",
  boxnow: "BoxNow — автомат",
} as const;

export class ShippingError extends Error {}

/** Преизчислява доставката на сървъра със същите IDs и същото тегло. */
export async function resolveShipping(sel: ShippingSelection, subtotal: number): Promise<ResolvedShipping> {
  const base = {
    method_id: null,
    site_id: null,
    site_name: "",
    office_id: null,
    office_name: "",
    deadline: null,
    details: {},
    boxnow_locker_id: null,
    boxnow_locker_name: "",
  };

  if (sel.method === "manual") {
    const m = (await getShippingMethods()).find((x) => x.id === sel.methodId);
    if (!m) throw new ShippingError("Избраният начин на доставка вече не е наличен.");
    return {
      ...base,
      provider: "manual",
      method: m.delivery === "pickup" ? "pickup" : "manual",
      method_id: m.id,
      name: m.name,
      price: shippingQuote(m, subtotal),
      delivery: m.delivery,
      city: m.delivery === "pickup" ? "Пловдив" : "",
      address: m.delivery === "pickup" ? "Вземане от салона" : "",
    };
  }

  if (sel.method === "boxnow") {
    if (!boxnowConfigured()) throw new ShippingError("BoxNow в момента не е достъпен.");
    const locker = await getBoxnowLocker(sel.lockerId);
    const name = locker?.name || sel.lockerName || `Автомат ${sel.lockerId}`;
    const addr = locker?.address || sel.lockerAddress;
    return {
      ...base,
      provider: "boxnow",
      method: "boxnow",
      name: LABEL.boxnow,
      price: boxnowPrice(),
      delivery: "locker",
      boxnow_locker_id: sel.lockerId,
      boxnow_locker_name: name,
      details: { lockerAddress: addr, postalCode: locker?.postalCode ?? "" },
      city: locker?.city ?? "",
      address: `BoxNow: ${name}${addr ? `, ${addr}` : ""}`,
    };
  }

  if (!speedyConfigured()) throw new ShippingError("Доставката със Speedy в момента не е достъпна.");
  try {
    const q = await calculate({
      method: sel.method,
      siteId: sel.siteId,
      officeId: sel.method === "speedy_address" ? null : sel.officeId,
    });
    if (sel.method === "speedy_address") {
      return {
        ...base,
        provider: "speedy",
        method: sel.method,
        name: LABEL[sel.method],
        price: q.price,
        delivery: "address",
        site_id: sel.siteId,
        site_name: sel.siteName,
        deadline: q.deadline,
        details: { addressLine: sel.addressLine },
        city: sel.siteName,
        address: sel.addressLine,
      };
    }
    return {
      ...base,
      provider: "speedy",
      method: sel.method,
      name: LABEL[sel.method],
      price: q.price,
      delivery: sel.method === "speedy_apt" ? "locker" : "office",
      site_id: sel.siteId,
      site_name: sel.siteName,
      office_id: sel.officeId,
      office_name: sel.officeName,
      deadline: q.deadline,
      details: {},
      city: sel.siteName,
      address: `${sel.method === "speedy_apt" ? "Автомат" : "Офис"} Speedy: ${sel.officeName}`,
    };
  } catch (e) {
    if (e instanceof SpeedyError) throw new ShippingError(`Speedy: ${e.message}`);
    throw e;
  }
}

/** Отказ, ако клиентът е видял различен тотал (разлика > 0.05 €). */
export function totalMatches(clientTotal: number, subtotal: number, shipping: number): boolean {
  return Math.abs(round2(clientTotal) - round2(subtotal + shipping)) <= 0.05;
}
