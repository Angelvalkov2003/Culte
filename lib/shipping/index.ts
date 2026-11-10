import { round2 } from "@/lib/format";
import type { Order, ShippingMethod } from "@/lib/types";

/**
 * Абстракция за куриер. Днес всички методи са `manual` (цена от таблицата shipping_methods).
 * За Еконт/Спиди: добавете провайдър със същия интерфейс (напр. lib/shipping/econt.ts),
 * регистрирайте го в PROVIDERS и задайте provider = 'econt' на метода в админ панела.
 */
export interface ShippingProvider {
  id: string;
  label: string;
  /** Цена на доставката за дадена сума на продуктите */
  quote(method: ShippingMethod, subtotal: number): number;
  /** Създаване на товарителница — по избор (за API интеграции) */
  createShipment?(order: Order): Promise<{ trackingNumber: string }>;
  /** Списък с офиси — по избор (за доставка до офис) */
  listOffices?(city: string): Promise<{ id: string; name: string; address: string }[]>;
}

const manual: ShippingProvider = {
  id: "manual",
  label: "Ръчно (по тарифа)",
  quote(method, subtotal) {
    if (method.free_over != null && subtotal >= Number(method.free_over)) return 0;
    return round2(Number(method.price));
  },
};

export const PROVIDERS: Record<string, ShippingProvider> = { manual };

export function providerFor(method: Pick<ShippingMethod, "provider">): ShippingProvider {
  return PROVIDERS[method.provider] ?? manual;
}

export function shippingQuote(method: ShippingMethod, subtotal: number): number {
  return providerFor(method).quote(method, subtotal);
}
