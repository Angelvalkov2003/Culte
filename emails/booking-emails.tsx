import { formatEUR, formatRange, formatMinutes, round2 } from "@/lib/format";
import { formatLongDate, formatTime } from "@/lib/time";
import { SIZE_LABEL, type Booking } from "@/lib/types";
import { EmailLayout, Items, P, Rows } from "./components";

type B = Booking & { booking_services?: { name: string; price_from: number; price_to: number; duration_max: number }[] };

function details(b: B): [string, string][] {
  const minutes = Math.round((Date.parse(b.end_at) - Date.parse(b.start_at)) / 60000);
  return [
    ["Дата", formatLongDate(b.start_at)],
    ["Час", `${formatTime(b.start_at)} – ${formatTime(b.end_at)} (${formatMinutes(minutes)})`],
    ["Куче", [b.dog_name, b.dog_breed].filter(Boolean).join(", ") || "—"],
    ["Размер", SIZE_LABEL[b.size]],
  ];
}

function money(b: B): [string, string][] {
  const remainingFrom = round2(Number(b.total_from) - (b.deposit_paid ? Number(b.deposit_amount) : 0));
  const remainingTo = round2(Number(b.total_to) - (b.deposit_paid ? Number(b.deposit_amount) : 0));
  return [
    ["Обща цена", formatRange(b.total_from, b.total_to)],
    ["Платено капаро", b.deposit_paid ? formatEUR(b.deposit_amount) : "—"],
    ["Остатък в салона", formatRange(remainingFrom, remainingTo)],
  ];
}

function services(b: B) {
  return (b.booking_services ?? []).map((s) => ({ name: s.name, price: formatRange(s.price_from, s.price_to) }));
}

export function BookingConfirmedEmail({ booking }: { booking: B }) {
  return (
    <EmailLayout preview={`Часът ви е потвърден за ${formatLongDate(booking.start_at)}`} title="Часът ви е потвърден">
      <P>
        Здравейте, {booking.customer_name}! Очакваме {booking.dog_name || "вашето куче"} в салона. Капарото е получено и
        часът е запазен само за вас.
      </P>
      <Rows rows={details(booking)} />
      <Items items={services(booking)} />
      <Rows rows={money(booking)} />
      <P>
        Окончателната цена зависи от състоянието на козината и се уточнява на място. Ако се налага промяна, обадете ни се
        на 0878 817 088 поне 24 часа предварително.
      </P>
    </EmailLayout>
  );
}

export function BookingAdminEmail({ booking, heading = "Нова потвърдена резервация" }: { booking: B; heading?: string }) {
  return (
    <EmailLayout preview={`${heading}: ${booking.customer_name}`} title={heading}>
      <Rows
        rows={[
          ...details(booking),
          ["Клиент", booking.customer_name],
          ["Телефон", booking.customer_phone],
          ["Имейл", booking.customer_email || "—"],
          ["Съобщение", booking.message || "—"],
        ]}
      />
      <Items items={services(booking)} />
      <Rows rows={money(booking)} />
    </EmailLayout>
  );
}

export function BookingCancelledEmail({ booking, refunded }: { booking: B; refunded: boolean }) {
  return (
    <EmailLayout preview="Резервацията ви е отказана" title="Резервацията е отказана">
      <P>Здравейте, {booking.customer_name}. Резервацията ви за {formatLongDate(booking.start_at)} в {formatTime(booking.start_at)} е отказана.</P>
      {refunded && (
        <P>
          Капарото от {formatEUR(booking.deposit_amount)} е върнато по картата ви. Обикновено сумата се появява в рамките на
          5–10 работни дни.
        </P>
      )}
      <P>Ако искате да изберете друг час, ще се радваме да ви видим отново.</P>
    </EmailLayout>
  );
}

export function BookingReminderEmail({ booking }: { booking: B }) {
  return (
    <EmailLayout preview="Напомняне за утрешния час" title="До утре в салона">
      <P>
        Здравейте, {booking.customer_name}! Напомняме, че {booking.dog_name || "вашето куче"} има час утре в{" "}
        {formatTime(booking.start_at)}.
      </P>
      <Rows rows={details(booking)} />
      <P>Ако не можете да дойдете, моля, обадете ни се на 0878 817 088.</P>
    </EmailLayout>
  );
}
