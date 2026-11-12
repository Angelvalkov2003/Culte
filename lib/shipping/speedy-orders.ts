import "server-only";
import { db } from "@/lib/supabase/admin";
import { getOrder, changeOrderStatus } from "@/lib/shop/orders";
import { createShipment, normalizePhone, speedyConfigured, statusFromTrack, track, SpeedyError, type SpeedyMethod } from "@/lib/shipping/speedy";
import type { Order } from "@/lib/types";

/** Причините, поради които не може да се създаде товарителница (празно = може). */
export function speedyEligibility(o: Order): string[] {
  const reasons: string[] = [];
  if (o.shipping_provider !== "speedy") return ["Поръчката не е със Speedy."];
  if (!speedyConfigured()) reasons.push("Speedy не е конфигуриран (SPEEDY_USERNAME / SPEEDY_PASSWORD).");
  if (o.speedy_shipment_id || o.speedy_parcel_id) reasons.push("Товарителницата вече е създадена.");
  if (o.status !== "processing") reasons.push("Статусът трябва да е „Обработва се“.");
  if (o.payment_method === "stripe" && !o.paid_at) reasons.push("Поръчката с карта още не е платена.");
  if (normalizePhone(o.customer_phone).length < 10) reasons.push("Липсва валиден телефон.");
  if (o.shipping_method === "speedy_address") {
    if (!o.shipping_site_id) reasons.push("Липсва населено място.");
    if (!String(o.shipping_details?.addressLine ?? "").trim()) reasons.push("Липсва адрес.");
  } else if (!o.shipping_office_id) {
    reasons.push("Липсва офис/автомат.");
  }
  return reasons;
}

export async function createSpeedyShipmentForOrder(orderId: string): Promise<{ shipmentId: string; parcelId: string }> {
  const o = await getOrder(orderId);
  if (!o) throw new Error("Поръчката не е намерена.");
  const reasons = speedyEligibility(o);
  if (reasons.length) throw new Error(reasons.join(" "));

  const r = await createShipment({
    orderId: o.id,
    orderNumber: o.number,
    method: o.shipping_method as SpeedyMethod,
    siteId: o.shipping_site_id,
    officeId: o.shipping_office_id,
    addressLine: String(o.shipping_details?.addressLine ?? ""),
    name: o.customer_name,
    email: o.customer_email,
    phone: o.customer_phone,
    // Наложен платеж само ако НЕ е платено с карта
    codAmount: o.payment_method === "stripe" ? null : Number(o.total),
  });

  // Записваме IDs; статусът на поръчката НЕ се сменя автоматично
  const { error } = await db()
    .from("orders")
    .update({
      speedy_shipment_id: r.shipmentId,
      speedy_parcel_id: r.parcelId,
      speedy_created_at: new Date().toISOString(),
      tracking_number: r.parcelId,
      ...(r.deadline ? { shipping_deadline: r.deadline } : {}),
    })
    .eq("id", o.id)
    .is("speedy_shipment_id", null);
  if (error) throw new Error(`Товарителница ${r.shipmentId} е създадена, но не е записана: ${error.message}`);
  return { shipmentId: r.shipmentId, parcelId: r.parcelId };
}

export interface SyncResult {
  checked: number;
  updated: { number: number; status: string }[];
  skipped: number;
  errors: string[];
}

/** До 50 поръчки (processing/shipped с parcel), най-отдавна синхронизираните първи. */
export async function syncSpeedyStatuses(limit = 50): Promise<SyncResult> {
  const result: SyncResult = { checked: 0, updated: [], skipped: 0, errors: [] };
  if (!speedyConfigured()) {
    result.errors.push("Speedy не е конфигуриран.");
    return result;
  }
  const { data, error } = await db()
    .from("orders")
    .select("id, number, status, speedy_parcel_id")
    .not("speedy_parcel_id", "is", null)
    .in("status", ["processing", "shipped"])
    .order("speedy_last_synced_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) {
    result.errors.push(error.message);
    return result;
  }
  const orders = data ?? [];
  result.checked = orders.length;

  for (const o of orders) {
    try {
      const [t] = await track([o.speedy_parcel_id as string]);
      if (t?.error) {
        result.errors.push(`№ ${o.number}: ${t.error}`);
      } else {
        const next = t ? statusFromTrack(o.status, t.codes) : null;
        if (next) {
          // changeOrderStatus праща имейл „изпратена“ при shipped
          await changeOrderStatus(o.id, next);
          result.updated.push({ number: o.number, status: next });
        } else {
          result.skipped++;
        }
      }
    } catch (e) {
      result.errors.push(`№ ${o.number}: ${e instanceof SpeedyError || e instanceof Error ? e.message : "грешка"}`);
    }
    await db().from("orders").update({ speedy_last_synced_at: new Date().toISOString() }).eq("id", o.id);
  }
  return result;
}

/** BoxNow: до 50 поръчки (processing/shipped с пратка), най-старите първо. */
export async function syncBoxnowStatuses(limit = 50): Promise<SyncResult> {
  const { boxnowConfigured, boxnowParcelState, statusFromBoxnow } = await import("@/lib/shipping/boxnow");
  const result: SyncResult = { checked: 0, updated: [], skipped: 0, errors: [] };
  if (!boxnowConfigured()) {
    result.errors.push("BoxNow не е конфигуриран.");
    return result;
  }
  const { data, error } = await db()
    .from("orders")
    .select("id, number, status, boxnow_parcel_id")
    .not("boxnow_parcel_id", "is", null)
    .in("status", ["processing", "shipped"])
    .order("updated_at", { ascending: true })
    .limit(limit);
  if (error) {
    result.errors.push(error.message);
    return result;
  }
  result.checked = data?.length ?? 0;
  for (const o of data ?? []) {
    try {
      const next = statusFromBoxnow(o.status, await boxnowParcelState(o.boxnow_parcel_id as string));
      if (next) {
        await changeOrderStatus(o.id, next);
        result.updated.push({ number: o.number, status: next });
      } else result.skipped++;
    } catch (e) {
      result.errors.push(`№ ${o.number}: ${e instanceof Error ? e.message : "грешка"}`);
    }
  }
  return result;
}
