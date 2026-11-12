"use server";

import { z } from "zod";
import { db } from "@/lib/supabase/admin";
import { adminEmail, sendEmail } from "@/lib/email";
import type { WithdrawalRequest } from "@/lib/types";
import { WithdrawalAdminEmail, WithdrawalReceivedEmail } from "@/emails/withdrawal-emails";

const schema = z.object({
  kind: z.enum(["order", "booking"]),
  reference: z.string().trim().regex(/^\d{1,10}$/, "Въведете номера (само цифри)."),
  name: z.string().trim().min(2, "Въведете име.").max(100),
  email: z.email("Въведете имейла, с който сте поръчали.").max(200),
  items: z.string().trim().max(1000).default(""),
  reason: z.string().trim().max(1000).default(""),
});

export type WithdrawalResult =
  | { ok: true; number: number; at: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function submitWithdrawal(input: z.input<typeof schema>): Promise<WithdrawalResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Проверете попълнените полета.", fieldErrors };
  }
  const v = parsed.data;
  const email = v.email.toLowerCase();

  try {
    let orderId: string | null = null;
    let bookingId: string | null = null;
    if (v.kind === "order") {
      const { data } = await db().from("orders").select("id, customer_email, status").eq("number", Number(v.reference)).maybeSingle();
      if (!data || data.customer_email.toLowerCase() !== email || ["pending_payment", "expired"].includes(data.status)) {
        return { ok: false, error: "Не намерихме поръчка с този номер и имейл. Ако не го помните, обадете ни се." };
      }
      orderId = data.id;
    } else {
      const { data } = await db().from("bookings").select("id, customer_email, status").eq("number", Number(v.reference)).maybeSingle();
      if (!data || data.customer_email.toLowerCase() !== email || ["pending_payment", "expired"].includes(data.status)) {
        return { ok: false, error: "Не намерихме резервация с този номер и имейл. Ако не го помните, обадете ни се." };
      }
      bookingId = data.id;
    }

    const { data: w, error } = await db()
      .from("withdrawal_requests")
      .insert({
        kind: v.kind,
        order_id: orderId,
        booking_id: bookingId,
        reference: v.reference,
        customer_name: v.name,
        customer_email: v.email,
        items: v.items,
        reason: v.reason,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const req = w as WithdrawalRequest;
    await Promise.all([
      sendEmail({ to: req.customer_email, subject: `Потвърждение за отказ от договор О-${req.number}`, react: <WithdrawalReceivedEmail w={req} /> }),
      sendEmail({ to: adminEmail(), subject: `Отказ от договор О-${req.number} (${v.kind === "order" ? "поръчка" : "резервация"} ${v.reference})`, react: <WithdrawalAdminEmail w={req} />, replyTo: req.customer_email }),
    ]);
    return { ok: true, number: req.number, at: req.created_at };
  } catch (e) {
    console.error("withdrawal", e);
    return { ok: false, error: "Заявлението не беше изпратено. Опитайте отново или ни пишете по имейл." };
  }
}
