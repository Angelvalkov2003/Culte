import "server-only";
import { db } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { expireStaleBookings } from "@/lib/booking/availability";
import { addDaysISO, formatTime, sofiaToDate, todaySofia } from "@/lib/time";
import type { Booking } from "@/lib/types";
import { BookingReminderEmail } from "@/emails/booking-emails";

/**
 * Ежедневна поддръжка — пуска се САМО от бутон в админа (без cron; безплатният Vercel план).
 * Изтекли неплатени резервации, GDPR почистване и напомняне за утрешните часове.
 * Безопасно е да се натиска многократно: напомнянето се маркира преди изпращане.
 */
export async function runDailyMaintenance(): Promise<{ sent: number; cleaned: unknown }> {
  await expireStaleBookings();
  const { data: cleaned, error: cleanErr } = await db().rpc("cleanup_stale_data", { p_days: 30 });
  if (cleanErr) console.error("cleanup_stale_data", cleanErr.message);

  const tomorrow = addDaysISO(todaySofia(), 1);
  const from = sofiaToDate(tomorrow, "00:00").toISOString();
  const to = sofiaToDate(addDaysISO(tomorrow, 1), "00:00").toISOString();
  const { data, error } = await db()
    .from("bookings")
    .select("*")
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .neq("customer_email", "")
    .gte("start_at", from)
    .lt("start_at", to);
  if (error) throw new Error(error.message);

  let sent = 0;
  for (const b of (data ?? []) as Booking[]) {
    // Маркираме първо — така повторно натискане не праща дубликат
    const { data: claimed } = await db()
      .from("bookings")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", b.id)
      .is("reminder_sent_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;
    await sendEmail({
      to: b.customer_email,
      subject: `Напомняне: утре в ${formatTime(b.start_at)} в Culte`,
      react: <BookingReminderEmail booking={b} />,
    });
    sent++;
  }
  return { sent, cleaned };
}
