"use server";

import { z } from "zod";
import { db } from "@/lib/supabase/admin";
import { stripe, checkoutExpiry } from "@/lib/stripe";
import { requestOrigin } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { expireStaleBookings, isSlotAvailable } from "@/lib/booking/availability";
import { quote, resolveServices } from "@/lib/booking/services";
import { formatLongDate } from "@/lib/time";
import { sofiaToDate } from "@/lib/time";
import { toCents } from "@/lib/format";

const schema = z.object({
  size: z.enum(["small", "medium", "large"]),
  mainId: z.uuid(),
  addonIds: z.array(z.uuid()).max(12),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2, "Въведете име").max(100),
  email: z.email("Въведете валиден имейл").max(200),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s()-]{6,20}$/, "Въведете валиден телефон"),
  dogName: z.string().trim().min(1, "Въведете името на кучето").max(60),
  dogBreed: z.string().trim().min(2, "Въведете породата").max(80),
  message: z.string().trim().max(1000).optional().default(""),
  // Едно общо съгласие: условия + изрично искане услугата да се изпълни в 14-дневния срок
  terms: z.literal(true, { error: "Необходимо е съгласие с условията" }),
});

export type BookingInput = z.input<typeof schema>;
export type BookingResult = { ok: true; url: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createBooking(input: BookingInput): Promise<BookingResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "Проверете попълнените полета.", fieldErrors };
  }
  const v = parsed.data;

  try {
    const settings = await getSettings();
    const resolved = await resolveServices(v.size, v.mainId, [...new Set(v.addonIds)]);
    if (!resolved) return { ok: false, error: "Избраните услуги вече не са налични. Изберете отново." };
    const q = quote(resolved.main, resolved.addons, Number(settings.deposit_percent) || 50);

    await expireStaleBookings();
    if (!(await isSlotAvailable(v.date, v.time, q.durationMin))) {
      return { ok: false, error: "Този час вече не е свободен. Изберете друг." };
    }

    const start = sofiaToDate(v.date, v.time);
    const end = new Date(start.getTime() + q.durationMin * 60_000);

    const { data: booking, error } = await db()
      .from("bookings")
      .insert({
        status: "pending_payment",
        source: "online",
        size: v.size,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        customer_name: v.name,
        customer_email: v.email,
        customer_phone: v.phone,
        dog_name: v.dogName,
        dog_breed: v.dogBreed,
        message: v.message,
        total_from: q.totalFrom,
        total_to: q.totalTo,
        deposit_amount: q.deposit,
        terms_accepted_at: new Date().toISOString(),
        service_consent_at: new Date().toISOString(),
      })
      .select("id, number")
      .single();

    if (error) {
      if (error.code === "23P01") return { ok: false, error: "Този час току-що беше запазен. Изберете друг." };
      throw new Error(error.message);
    }

    const all = [resolved.main, ...resolved.addons];
    const { error: sErr } = await db()
      .from("booking_services")
      .insert(
        all.map((s, i) => ({
          booking_id: booking.id,
          service_id: s.id,
          name: s.name,
          is_main: i === 0,
          duration_max: s.duration_max,
          price_from: s.price_from,
          price_to: s.price_to,
        })),
      );
    if (sErr) throw new Error(sErr.message);

    const site = await requestOrigin();
    try {
      const session = await stripe().checkout.sessions.create({
        mode: "payment",
        locale: "bg",
        currency: "eur",
        customer_email: v.email,
        expires_at: checkoutExpiry(Number(settings.hold_minutes) || 30),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: toCents(q.deposit),
              product_data: {
                name: "Капаро за груминг",
                description: `${formatLongDate(start)}, ${v.time} — ${all.map((s) => s.name).join(", ")}`,
              },
            },
          },
        ],
        metadata: { kind: "booking", booking_id: booking.id, booking_number: String(booking.number) },
        payment_intent_data: { metadata: { kind: "booking", booking_id: booking.id } },
        success_url: `${site}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${site}/booking/cancel?booking=${booking.id}`,
      });
      await db().from("bookings").update({ stripe_session_id: session.id }).eq("id", booking.id);
      if (!session.url) throw new Error("Stripe не върна адрес за плащане");
      return { ok: true, url: session.url };
    } catch (e) {
      // Освобождаваме слота, ако плащането не може да започне
      await db().from("bookings").update({ status: "expired" }).eq("id", booking.id);
      throw e;
    }
  } catch (e) {
    console.error("createBooking", e);
    return { ok: false, error: "Не успяхме да започнем плащането. Опитайте отново след малко." };
  }
}
