"use server";

import { z } from "zod";
import { adminAction, f } from "@/lib/admin/action";
import { db } from "@/lib/supabase/admin";
import { getOrder, changeOrderStatus } from "@/lib/shop/orders";
import { createSpeedyShipmentForOrder, syncBoxnowStatuses, syncSpeedyStatuses, type SyncResult } from "@/lib/shipping/speedy-orders";
import { boxnowConfigured, boxnowParcelState, createBoxnowDelivery, statusFromBoxnow } from "@/lib/shipping/boxnow";

/* ---------------- Speedy ---------------- */
export const createSpeedyShipment = adminAction(z.object({ id: f.uuid() }), async ({ id }) => {
  const r = await createSpeedyShipmentForOrder(id);
  return `Товарителница ${r.shipmentId} е създадена (пратка ${r.parcelId}).`;
}, ["/admin"]);

function summary(label: string, r: SyncResult): string {
  const parts = [
    `Проверени: ${r.checked}`,
    `обновени: ${r.updated.length}${r.updated.length ? ` (${r.updated.map((u) => `№ ${u.number} → ${u.status === "delivered" ? "доставена" : "изпратена"}`).join(", ")})` : ""}`,
    `без промяна: ${r.skipped}`,
    `грешки: ${r.errors.length}${r.errors.length ? ` — ${r.errors.slice(0, 3).join("; ")}` : ""}`,
  ];
  if (r.errors.length && !r.checked) throw new Error(`${label}: ${r.errors.join("; ")}`);
  return `${label} — ${parts.join(", ")}.`;
}

export const syncSpeedy = adminAction(z.object({}), async () => summary("Speedy", await syncSpeedyStatuses(50)), ["/admin"]);
export const syncBoxnow = adminAction(z.object({}), async () => summary("BoxNow", await syncBoxnowStatuses(50)), ["/admin"]);

/* ---------------- BoxNow (отделно от Speedy) ---------------- */
export const createBoxnowShipment = adminAction(z.object({ id: f.uuid() }), async ({ id }) => {
  const o = await getOrder(id);
  if (!o) throw new Error("Поръчката не е намерена.");
  if (o.shipping_provider !== "boxnow" || !o.boxnow_locker_id) throw new Error("Поръчката не е с BoxNow.");
  if (!boxnowConfigured()) throw new Error("BoxNow не е конфигуриран.");
  if (o.boxnow_parcel_id) throw new Error("Пратката вече е създадена.");
  if (o.status !== "processing") throw new Error("Статусът трябва да е „Обработва се“.");
  if (o.payment_method === "stripe" && !o.paid_at) throw new Error("Поръчката с карта още не е платена.");

  const r = await createBoxnowDelivery({
    orderNumber: o.number,
    lockerId: o.boxnow_locker_id,
    name: o.customer_name,
    email: o.customer_email,
    phone: o.customer_phone,
    total: Number(o.total),
    cod: o.payment_method !== "stripe",
  });
  const { error } = await db()
    .from("orders")
    .update({ boxnow_delivery_id: r.deliveryId, boxnow_parcel_id: r.parcelId, boxnow_created_at: new Date().toISOString(), tracking_number: r.parcelId })
    .eq("id", id);
  if (error) throw new Error(`Пратка ${r.parcelId} е създадена, но не е записана: ${error.message}`);
  return `BoxNow пратка ${r.parcelId} е създадена.`;
}, ["/admin"]);

export const refreshBoxnowStatus = adminAction(z.object({ id: f.uuid() }), async ({ id }) => {
  const o = await getOrder(id);
  if (!o?.boxnow_parcel_id) throw new Error("Няма BoxNow пратка.");
  const state = await boxnowParcelState(o.boxnow_parcel_id);
  const next = statusFromBoxnow(o.status, state);
  if (next) await changeOrderStatus(id, next);
  return `BoxNow статус: ${state ?? "неизвестен"}${next ? `; поръчката е „${next === "delivered" ? "доставена" : "изпратена"}“` : "; без промяна"}.`;
}, ["/admin"]);
