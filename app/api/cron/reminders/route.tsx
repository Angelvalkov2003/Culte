import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/admin/token";
import { sendEmail } from "@/lib/email";
import { expireStaleBookings } from "@/lib/booking/availability";
import { addDaysISO, formatTime, sofiaToDate, todaySofia } from "@/lib/time";
import type { Booking } from "@/lib/types";
import { BookingReminderEmail } from "@/emails/booking-emails";

export const dynamic = "force-dynamic";

// Vercel Cron (веднъж дневно): напомняне за утрешните часове. Защитено с CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = env.cronSecret();
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await expireStaleBookings();

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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const b of (data ?? []) as Booking[]) {
    // Маркираме първо — така повторно изпълнение не праща дубликат
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
  return NextResponse.json({ sent });
}
