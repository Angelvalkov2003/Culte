"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { adminAction, f } from "@/lib/admin/action";
import { db } from "@/lib/supabase/admin";
import { cancelBooking, getBooking } from "@/lib/booking/lifecycle";
import { quote, resolveServices } from "@/lib/booking/services";
import { getSettings } from "@/lib/settings";
import { sofiaToDate } from "@/lib/time";

const OVERLAP = "Този период се застъпва с друга активна резервация.";

const manualSchema = z.object({
  size: z.enum(["small", "medium", "large"]),
  main_id: f.uuid(),
  addon_ids: z.array(z.uuid()).optional().default([]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Изберете дата."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Изберете час."),
  duration: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(5).max(720).optional()),
  customer_name: f.req("Име на клиента", 100),
  customer_phone: f.req("Телефон", 30),
  customer_email: z.union([z.literal(""), z.email("Невалиден имейл.")]).default(""),
  dog_name: f.text(60),
  dog_breed: f.text(80),
  message: f.text(1000),
  admin_note: f.text(1000),
});

/** Ръчно добавяне (напр. по телефона) — без плащане, директно потвърдена. */
export const createManualBooking = adminAction(manualSchema, async (d) => {
  const resolved = await resolveServices(d.size, d.main_id, d.addon_ids.filter((x) => x !== d.main_id));
  if (!resolved) throw new Error("Невалидни услуги за избрания размер.");
  const settings = await getSettings();
  const q = quote(resolved.main, resolved.addons, Number(settings.deposit_percent) || 50);
  const minutes = d.duration ?? q.durationMin;
  const start = sofiaToDate(d.date, d.time);
  const end = new Date(start.getTime() + minutes * 60_000);

  const { data, error } = await db()
    .from("bookings")
    .insert({
      status: "confirmed",
      source: "manual",
      size: d.size,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      customer_name: d.customer_name,
      customer_phone: d.customer_phone,
      customer_email: d.customer_email,
      dog_name: d.dog_name,
      dog_breed: d.dog_breed,
      message: d.message,
      admin_note: d.admin_note,
      total_from: q.totalFrom,
      total_to: q.totalTo,
      deposit_amount: 0,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.code === "23P01" ? OVERLAP : error.message);

  await db()
    .from("booking_services")
    .insert(
      [resolved.main, ...resolved.addons].map((s, i) => ({
        booking_id: data.id,
        service_id: s.id,
        name: s.name,
        is_main: i === 0,
        duration_max: s.duration_max,
        price_from: s.price_from,
        price_to: s.price_to,
      })),
    );
  redirect(`/admin/bookings/${data.id}`);
});

const updateSchema = z.object({
  id: f.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Изберете дата."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Изберете час."),
  duration: f.int("Продължителност", 5, 720),
  status: z.enum(["pending_payment", "confirmed", "completed", "expired"]),
  customer_name: f.req("Име на клиента", 100),
  customer_phone: f.req("Телефон", 30),
  customer_email: z.union([z.literal(""), z.email("Невалиден имейл.")]).default(""),
  dog_name: f.text(60),
  dog_breed: f.text(80),
  message: f.text(1000),
  admin_note: f.text(1000),
});

export const updateBooking = adminAction(updateSchema, async (d) => {
  const start = sofiaToDate(d.date, d.time);
  const end = new Date(start.getTime() + d.duration * 60_000);
  const { id, date: _date, time: _time, duration: _duration, ...rest } = d;
  void _date; void _time; void _duration;
  const { error } = await db()
    .from("bookings")
    .update({ ...rest, start_at: start.toISOString(), end_at: end.toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.code === "23P01" ? OVERLAP : error.message);
  return "Резервацията е запазена.";
});

export const cancelBookingAction = adminAction(
  z.object({ id: f.uuid(), refund: f.bool(), notify: f.bool() }),
  async ({ id, refund, notify }) => {
    const before = await getBooking(id);
    if (!before) throw new Error("Резервацията не е намерена.");
    if (before.status === "cancelled" && (!refund || before.refund_id)) return "Резервацията вече е отказана.";
    const { refunded } = await cancelBooking(id, refund, notify);
    return refunded ? "Резервацията е отказана и капарото е върнато." : "Резервацията е отказана.";
  },
);

export const deleteBooking = adminAction(z.object({ id: f.uuid() }), async ({ id }) => {
  const b = await getBooking(id);
  if (b && ["pending_payment", "confirmed"].includes(b.status) && b.deposit_paid && !b.refund_id) {
    throw new Error("Има платено капаро — първо откажете резервацията (с или без връщане).");
  }
  await db().from("bookings").delete().eq("id", id);
  redirect("/admin/bookings");
});
