import Link from "next/link";
import { db } from "@/lib/supabase/admin";
import { formatEUR, cn } from "@/lib/format";
import { fmt, formatTime } from "@/lib/time";
import { BOOKING_STATUS_LABEL, SIZE_LABEL, type Booking } from "@/lib/types";
import { ButtonLink } from "@/components/ui/button";
import { Empty, PageHeader, StatusBadge, Table, Td, Th } from "@/components/admin/ui";

export const metadata = { title: "Резервации" };

const VIEWS = [
  ["upcoming", "Предстоящи"],
  ["past", "Минали"],
  ["cancelled", "Отказани"],
  ["all", "Всички"],
] as const;

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const { view = "upcoming", q } = await searchParams;
  const now = new Date().toISOString();
  let query = db().from("bookings").select("*, booking_services(name, is_main)").limit(300);
  if (view === "upcoming") query = query.gte("end_at", now).in("status", ["confirmed", "pending_payment"]).order("start_at");
  else if (view === "past") query = query.lt("end_at", now).in("status", ["confirmed", "completed"]).order("start_at", { ascending: false });
  else if (view === "cancelled") query = query.in("status", ["cancelled", "expired"]).order("start_at", { ascending: false });
  else query = query.order("start_at", { ascending: false });
  if (q) {
    const t = q.replace(/[%_,()]/g, " ").trim();
    if (t) query = query.or(`customer_name.ilike.%${t}%,customer_phone.ilike.%${t}%,dog_name.ilike.%${t}%,customer_email.ilike.%${t}%`);
  }
  const { data } = await query;
  const items = (data ?? []) as Booking[];

  return (
    <>
      <PageHeader title="Резервации" actions={<><ButtonLink href="/admin/calendar" size="sm" variant="secondary">Календар</ButtonLink><ButtonLink href="/admin/bookings/new" size="sm">Ръчна резервация</ButtonLink></>} />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        {VIEWS.map(([v, label]) => (
          <Link key={v} href={`/admin/bookings?view=${v}`}
            className={cn("rounded-md border px-3 py-1.5", view === v ? "border-espresso bg-espresso text-cream" : "border-line hover:bg-sand")}>
            {label}
          </Link>
        ))}
        <form className="ml-auto" method="get">
          <input type="hidden" name="view" value={view} />
          <input name="q" defaultValue={q} placeholder="Име, телефон, куче" aria-label="Търсене"
            className="h-9 rounded-md border border-line bg-white/70 px-3 text-sm focus:border-terracotta focus:outline-none" />
        </form>
      </div>
      {!items.length ? (
        <Empty>Няма резервации.</Empty>
      ) : (
        <Table>
          <thead>
            <tr><Th>Кога</Th><Th>Куче</Th><Th>Услуга</Th><Th>Клиент</Th><Th className="text-right">Капаро</Th><Th>Статус</Th></tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id}>
                <Td className="whitespace-nowrap">
                  <Link href={`/admin/bookings/${b.id}`} className="font-medium hover:text-terracotta">
                    {fmt(b.start_at, "EEE, d MMM")} {formatTime(b.start_at)}–{formatTime(b.end_at)}
                  </Link>
                </Td>
                <Td>{b.dog_name || "—"}<span className="block text-xs text-espresso-soft">{SIZE_LABEL[b.size]}</span></Td>
                <Td>{b.booking_services?.find((s) => s.is_main)?.name}{(b.booking_services?.length ?? 0) > 1 && <span className="text-espresso-soft"> +{(b.booking_services?.length ?? 1) - 1}</span>}</Td>
                <Td>{b.customer_name}<span className="block text-xs text-espresso-soft">{b.customer_phone}</span></Td>
                <Td className="text-right tabular-nums">{b.deposit_paid ? formatEUR(b.deposit_amount) : b.source === "manual" ? "ръчна" : "—"}{b.refund_id && <span className="block text-xs text-danger">върнато</span>}</Td>
                <Td><StatusBadge status={b.status} label={BOOKING_STATUS_LABEL[b.status]} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
