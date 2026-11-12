import type { Metadata } from "next";
import { stripe } from "@/lib/stripe";
import { confirmBookingFromSession, getBooking } from "@/lib/booking/lifecycle";
import { formatEUR, formatRange, round2 } from "@/lib/format";
import { formatLongDate, formatTime } from "@/lib/time";
import { ButtonLink } from "@/components/ui/button";
import { AutoRefresh } from "@/components/site/auto-refresh";
import { DogCutout } from "@/components/site/dog-figure";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Часът е запазен", robots: { index: false } };

export default async function BookingSuccess({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  let booking = null;
  if (session_id && /^cs_[A-Za-z0-9_]+$/.test(session_id)) {
    try {
      const session = await stripe().checkout.sessions.retrieve(session_id);
      if (session.metadata?.kind === "booking" && session.metadata.booking_id) {
        // Резервен път, ако webhook-ът още не е пристигнал (идемпотентно)
        booking =
          session.payment_status === "paid"
            ? await confirmBookingFromSession(session)
            : await getBooking(session.metadata.booking_id);
      }
    } catch (e) {
      console.error("booking success", e);
    }
  }

  if (!booking) {
    return (
      <Shell title="Не намерихме тази резервация">
        <p>Ако сте платили, обадете ни се и ще проверим резервацията ви.</p>
      </Shell>
    );
  }

  if (booking.status !== "confirmed") {
    return (
      <Shell title={booking.status === "cancelled" ? "Резервацията не е потвърдена" : "Потвърждаваме плащането"}>
        {booking.status === "cancelled" ? (
          <p>{booking.admin_note || "Резервацията е отказана. При въпроси ни се обадете."}</p>
        ) : (
          <>
            <p>Изчакваме потвърждение от Stripe. Страницата ще се обнови сама след няколко секунди.</p>
            <AutoRefresh seconds={4} />
          </>
        )}
      </Shell>
    );
  }

  return (
    <Shell title={`Часът ви е потвърден (№ ${booking.number})`}>
      <p>
        Очакваме {booking.dog_name} на {formatLongDate(booking.start_at)} в {formatTime(booking.start_at)}. Запазете
        номера на резервацията (№ {booking.number}) — тази страница е вашето потвърждение. При нужда ще се свържем с вас
        на {booking.customer_phone}.
      </p>
      <dl className="mt-8 grid max-w-md grid-cols-2 gap-y-2 text-[15px]">
        <dt className="text-espresso-soft">Платено капаро</dt>
        <dd className="text-right tabular-nums">{formatEUR(booking.deposit_amount)}</dd>
        <dt className="text-espresso-soft">Остатък в салона</dt>
        <dd className="text-right tabular-nums">
          {formatRange(
            round2(booking.total_from - booking.deposit_amount),
            round2(booking.total_to - booking.deposit_amount),
          )}
        </dd>
      </dl>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container-page max-w-3xl pt-16">
      <DogCutout dog="poodleGold" priority sizes="140px" className="mb-6 w-[140px]" />
      <h1 className="text-5xl">{title}</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-7 text-espresso-soft">{children}</div>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/">Към началото</ButtonLink>
        <ButtonLink href="/shop" variant="secondary">
          Разгледай козметиката
        </ButtonLink>
      </div>
    </div>
  );
}
