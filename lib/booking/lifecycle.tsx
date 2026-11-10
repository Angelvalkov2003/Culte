import "server-only";
import type Stripe from "stripe";
import { db } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { adminEmail, sendEmail } from "@/lib/email";
import { formatLongDate, formatTime } from "@/lib/time";
import type { Booking } from "@/lib/types";
import { BookingAdminEmail, BookingCancelledEmail, BookingConfirmedEmail } from "@/emails/booking-emails";

export async function getBooking(id: string): Promise<Booking | null> {
  const { data } = await db().from("bookings").select("*, booking_services(*)").eq("id", id).maybeSingle();
  return (data as Booking) ?? null;
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  return typeof pi === "string" ? pi : (pi?.id ?? null);
}

/**
 * Потвърждава резервация след успешно плащане. Идемпотентно:
 * само преходът pending_payment/expired → confirmed праща имейли.
 */
export async function confirmBookingFromSession(session: Stripe.Checkout.Session): Promise<Booking | null> {
  const bookingId = session.metadata?.booking_id;
  if (!bookingId || session.payment_status !== "paid") return null;

  const { data, error } = await db()
    .from("bookings")
    .update({
      status: "confirmed",
      deposit_paid: true,
      stripe_payment_intent_id: paymentIntentId(session),
    })
    .eq("id", bookingId)
    .in("status", ["pending_payment", "expired"])
    .select("id")
    .maybeSingle();

  if (error) {
    // 23P01: докато плащането е висяло, слотът е зает от друг → връщаме парите
    if (error.code === "23P01") {
      await refundOrphanBooking(bookingId, session);
      return getBooking(bookingId);
    }
    throw new Error(error.message);
  }

  const booking = await getBooking(bookingId);
  if (data && booking) {
    await Promise.all([
      booking.customer_email &&
        sendEmail({
          to: booking.customer_email,
          subject: `Часът ви в Culte е потвърден — ${formatLongDate(booking.start_at)}, ${formatTime(booking.start_at)}`,
          react: <BookingConfirmedEmail booking={booking} />,
        }),
      sendEmail({
        to: adminEmail(),
        subject: `Нова резервация: ${booking.customer_name}, ${formatLongDate(booking.start_at)} ${formatTime(booking.start_at)}`,
        react: <BookingAdminEmail booking={booking} />,
        replyTo: booking.customer_email || undefined,
      }),
    ]);
  }
  return booking;
}

async function refundOrphanBooking(bookingId: string, session: Stripe.Checkout.Session) {
  const pi = paymentIntentId(session);
  let refundId: string | null = null;
  if (pi) {
    const refund = await stripe().refunds.create({ payment_intent: pi }, { idempotencyKey: `orphan-${bookingId}` });
    refundId = refund.id;
  }
  await db()
    .from("bookings")
    .update({
      status: "cancelled",
      stripe_payment_intent_id: pi,
      refund_id: refundId,
      refunded_at: refundId ? new Date().toISOString() : null,
      admin_note: "Плащането пристигна след изтичане на задържането, а часът вече беше зает. Капарото е върнато автоматично.",
    })
    .eq("id", bookingId);
  const booking = await getBooking(bookingId);
  if (!booking) return;
  await Promise.all([
    booking.customer_email &&
      sendEmail({
        to: booking.customer_email,
        subject: "Резервацията ви не можа да бъде потвърдена",
        react: <BookingCancelledEmail booking={{ ...booking, deposit_paid: true }} refunded={Boolean(refundId)} />,
      }),
    sendEmail({
      to: adminEmail(),
      subject: `Автоматично върнато капаро: ${booking.customer_name}`,
      react: <BookingAdminEmail booking={booking} heading="Капарото е върнато — часът беше зает" />,
    }),
  ]);
}

/** Освобождава слота, когато Checkout изтече или клиентът се откаже. */
export async function expireBooking(bookingId: string) {
  await db().from("bookings").update({ status: "expired" }).eq("id", bookingId).eq("status", "pending_payment");
}

/** Отказ от админа; по желание връща капарото през Stripe Refunds API. */
export async function cancelBooking(bookingId: string, refund: boolean, notify = true): Promise<{ refunded: boolean }> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Резервацията не е намерена");

  let refundId = booking.refund_id;
  if (refund && booking.deposit_paid && !booking.refund_id) {
    if (!booking.stripe_payment_intent_id) throw new Error("Няма Stripe плащане за връщане");
    const r = await stripe().refunds.create(
      { payment_intent: booking.stripe_payment_intent_id },
      { idempotencyKey: `refund-${booking.id}` },
    );
    refundId = r.id;
  }

  const { error } = await db()
    .from("bookings")
    .update({
      status: "cancelled",
      refund_id: refundId,
      refunded_at: refundId && !booking.refunded_at ? new Date().toISOString() : booking.refunded_at,
    })
    .eq("id", bookingId);
  if (error) throw new Error(error.message);

  if (booking.stripe_session_id && booking.status === "pending_payment") {
    await stripe().checkout.sessions.expire(booking.stripe_session_id).catch(() => undefined);
  }

  const refunded = Boolean(refundId) && refundId !== booking.refund_id;
  if (notify && booking.customer_email && booking.status !== "cancelled") {
    await sendEmail({
      to: booking.customer_email,
      subject: "Резервацията ви в Culte е отказана",
      react: <BookingCancelledEmail booking={booking} refunded={refunded} />,
    });
  }
  return { refunded };
}
