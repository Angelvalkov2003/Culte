import type { Metadata } from "next";
import { z } from "zod";
import { getBooking, expireBooking } from "@/lib/booking/lifecycle";
import { stripe } from "@/lib/stripe";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Плащането е прекъснато", robots: { index: false } };

export default async function BookingCancel({ searchParams }: { searchParams: Promise<{ booking?: string }> }) {
  const { booking: id } = await searchParams;
  if (id && z.uuid().safeParse(id).success) {
    try {
      const booking = await getBooking(id);
      if (booking?.status === "pending_payment") {
        // Освобождаваме часа веднага, вместо да чакаме 30 минути
        if (booking.stripe_session_id) await stripe().checkout.sessions.expire(booking.stripe_session_id).catch(() => undefined);
        await expireBooking(id);
      }
    } catch (e) {
      console.error("booking cancel", e);
    }
  }
  return (
    <div className="container-page max-w-3xl pt-16">
      <h1 className="text-5xl">Плащането е прекъснато</h1>
      <p className="mt-6 text-[15px] leading-7 text-espresso-soft">
        Не сме взели пари от картата ви и часът не е запазен. Можете да опитате отново или да изберете друг час.
      </p>
      <div className="mt-10">
        <ButtonLink href="/booking">Опитай отново</ButtonLink>
      </div>
    </div>
  );
}
