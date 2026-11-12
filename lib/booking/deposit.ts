import type { Service } from "@/lib/types";

/**
 * Предложено капаро за услуга:
 * - точна цена → % от нея;
 * - диапазон → % от началната цена, закръглено до 10 € (мин. 10 €). Напр. 90–207 € → 50 €.
 */
export function suggestDeposit(priceFrom: number, priceTo: number, percent = 50): number {
  const base = (Number(priceFrom) * percent) / 100;
  if (Number(priceFrom) === Number(priceTo)) return Math.round(base * 100) / 100;
  return Math.max(10, Math.round(base / 10) * 10);
}

/** Капарото на услугата: зададеното от админа или по правилото. */
export function serviceDeposit(s: Pick<Service, "deposit" | "price_from" | "price_to">, percent = 50): number {
  return s.deposit != null ? Number(s.deposit) : suggestDeposit(s.price_from, s.price_to, percent);
}

export function isRangePrice(s: Pick<Service, "price_from" | "price_to">): boolean {
  return Number(s.price_from) !== Number(s.price_to);
}
