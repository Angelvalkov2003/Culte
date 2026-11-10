import Link from "next/link";
import { db } from "@/lib/supabase/admin";
import { getBusinessHours } from "@/lib/settings";
import { cn } from "@/lib/format";
import { addDaysISO, fmt, formatTime, isValidISODate, mondayOf, sofiaToDate, timeToMinutes, todaySofia, weekdayOf } from "@/lib/time";
import { BOOKING_STATUS_LABEL, type BlockedPeriod, type Booking } from "@/lib/types";
import { PageHeader } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Календар" };

const COLORS: Record<string, string> = {
  confirmed: "border-olive bg-olive/15 text-espresso",
  pending_payment: "border-clay bg-clay/20 text-espresso",
  completed: "border-espresso/40 bg-espresso/10 text-espresso",
};

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ date?: string; view?: string }> }) {
  const sp = await searchParams;
  const view = sp.view === "day" ? "day" : "week";
  const date = sp.date && isValidISODate(sp.date) ? sp.date : todaySofia();
  const first = view === "week" ? mondayOf(date) : date;
  const days = Array.from({ length: view === "week" ? 7 : 1 }, (_, i) => addDaysISO(first, i));
  const from = sofiaToDate(days[0], "00:00");
  const to = sofiaToDate(addDaysISO(days[days.length - 1], 1), "00:00");

  const [bookingsRes, blockedRes, hours] = await Promise.all([
    db().from("bookings").select("*, booking_services(name, is_main)").in("status", ["confirmed", "pending_payment", "completed"])
      .lt("start_at", to.toISOString()).gt("end_at", from.toISOString()).order("start_at"),
    db().from("blocked_periods").select("*").lt("start_at", to.toISOString()).gt("end_at", from.toISOString()),
    getBusinessHours(),
  ]);
  const bookings = (bookingsRes.data ?? []) as Booking[];
  const blocked = (blockedRes.data ?? []) as BlockedPeriod[];

  // Видим диапазон: от най-ранното отваряне до най-късното затваряне (±30 мин)
  const open = hours.filter((h) => !h.is_closed);
  const startMin = Math.max(0, Math.min(...open.map((h) => timeToMinutes(h.open_time)), 9 * 60) - 30);
  const endMin = Math.min(24 * 60, Math.max(...open.map((h) => timeToMinutes(h.close_time)), 18 * 60) + 30);
  const span = endMin - startMin;
  const PX = 1.1; // px на минута
  const hoursMarks = Array.from({ length: Math.floor(span / 60) + 1 }, (_, i) => Math.ceil(startMin / 60) + i).filter((h) => h * 60 <= endMin);

  const pos = (iso: string, day: string) => {
    const dayStart = sofiaToDate(day, "00:00").getTime();
    return (Date.parse(iso) - dayStart) / 60000;
  };

  const shift = view === "week" ? 7 : 1;
  const nav = (d: string, v = view) => `/admin/calendar?date=${d}&view=${v}`;
  const title =
    view === "week"
      ? `${fmt(sofiaToDate(days[0], "12:00"), "d MMM")} – ${fmt(sofiaToDate(days[6], "12:00"), "d MMM yyyy")}`
      : fmt(sofiaToDate(date, "12:00"), "EEEE, d MMMM yyyy");

  return (
    <>
      <PageHeader title="Календар" actions={<ButtonLink href={`/admin/bookings/new?date=${date}`} size="sm">Ръчна резервация</ButtonLink>}>
        <span className="capitalize">{title}</span>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Link href={nav(addDaysISO(date, -shift))} className="rounded-md border border-line px-3 py-1.5 hover:bg-sand">Назад</Link>
        <Link href={nav(todaySofia())} className="rounded-md border border-line px-3 py-1.5 hover:bg-sand">Днес</Link>
        <Link href={nav(addDaysISO(date, shift))} className="rounded-md border border-line px-3 py-1.5 hover:bg-sand">Напред</Link>
        <span className="mx-2 h-5 w-px bg-line" aria-hidden="true" />
        <Link href={nav(date, "week")} className={cn("rounded-md border px-3 py-1.5", view === "week" ? "border-espresso bg-espresso text-cream" : "border-line hover:bg-sand")}>Седмица</Link>
        <Link href={nav(date, "day")} className={cn("rounded-md border px-3 py-1.5", view === "day" ? "border-espresso bg-espresso text-cream" : "border-line hover:bg-sand")}>Ден</Link>
        <span className="ml-auto flex flex-wrap gap-3 text-xs text-espresso-soft">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-olive bg-olive/15" />Потвърдена</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-clay bg-clay/20" />Чака плащане</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-espresso/40 bg-espresso/10" />Изпълнена</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-[repeating-linear-gradient(45deg,#e6d8c3_0_4px,transparent_4px_8px)]" />Блокирано</span>
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-white/60">
        <div className={cn("grid", view === "week" ? "min-w-[900px] grid-cols-[56px_repeat(7,1fr)]" : "grid-cols-[56px_1fr]")}>
          <div className="border-b border-line" />
          {days.map((d) => (
            <Link key={d} href={nav(d, "day")}
              className={cn("border-b border-l border-line px-2 py-2 text-sm hover:bg-sand", d === todaySofia() && "bg-sand font-semibold")}>
              <span className="capitalize">{fmt(sofiaToDate(d, "12:00"), view === "week" ? "EEE d.MM" : "EEEE d MMMM")}</span>
            </Link>
          ))}

          <div className="relative" style={{ height: span * PX }}>
            {hoursMarks.map((h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-xs text-espresso-soft tabular-nums" style={{ top: (h * 60 - startMin) * PX }}>
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
          </div>

          {days.map((d) => {
            const h = hours.find((x) => x.weekday === weekdayOf(d));
            const dayBookings = bookings.filter((b) => pos(b.end_at, d) > 0 && pos(b.start_at, d) < 24 * 60);
            const dayBlocked = blocked.filter((b) => pos(b.end_at, d) > 0 && pos(b.start_at, d) < 24 * 60);
            return (
              <div key={d} className="relative border-l border-line" style={{ height: span * PX }}>
                {hoursMarks.map((hh) => (
                  <div key={hh} className="absolute inset-x-0 border-t border-line/60" style={{ top: (hh * 60 - startMin) * PX }} />
                ))}
                {/* затворено */}
                {(!h || h.is_closed) ? (
                  <div className="absolute inset-0 bg-espresso/5" aria-label="Почивен ден" />
                ) : (
                  <>
                    <div className="absolute inset-x-0 top-0 bg-espresso/5" style={{ height: Math.max(0, timeToMinutes(h.open_time) - startMin) * PX }} />
                    <div className="absolute inset-x-0 bottom-0 bg-espresso/5" style={{ height: Math.max(0, endMin - timeToMinutes(h.close_time)) * PX }} />
                  </>
                )}
                {dayBlocked.map((b) => {
                  const s = Math.max(startMin, pos(b.start_at, d));
                  const e = Math.min(endMin, pos(b.end_at, d));
                  if (e <= s) return null;
                  return (
                    <Link key={b.id} href="/admin/blocked" title={b.reason || "Блокирано"}
                      className="absolute inset-x-1 rounded-sm bg-[repeating-linear-gradient(45deg,#e6d8c3_0_6px,transparent_6px_12px)] p-1 text-xs text-espresso-soft"
                      style={{ top: (s - startMin) * PX, height: (e - s) * PX }}>
                      {b.reason || "Блокирано"}
                    </Link>
                  );
                })}
                {dayBookings.map((b) => {
                  const s = Math.max(startMin, pos(b.start_at, d));
                  const e = Math.min(endMin, pos(b.end_at, d));
                  if (e <= s) return null;
                  return (
                    <Link
                      key={b.id}
                      href={`/admin/bookings/${b.id}`}
                      className={cn("absolute inset-x-1 overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-xs leading-snug hover:brightness-95", COLORS[b.status])}
                      style={{ top: (s - startMin) * PX, height: Math.max(22, (e - s) * PX - 2) }}
                      title={`${BOOKING_STATUS_LABEL[b.status]}: ${b.customer_name}`}
                    >
                      <span className="font-semibold tabular-nums">{formatTime(b.start_at)}–{formatTime(b.end_at)}</span>{" "}
                      <span>{b.dog_name || b.customer_name}</span>
                      {view === "day" && (
                        <span className="block text-espresso-soft">
                          {b.booking_services?.map((x) => x.name).join(", ")} · {b.customer_name}, {b.customer_phone}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
