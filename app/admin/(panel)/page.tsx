import Link from "next/link";
import { db } from "@/lib/supabase/admin";
import { formatEUR, round2 } from "@/lib/format";
import { addDaysISO, fmt, formatTime, sofiaToDate, todaySofia } from "@/lib/time";
import { BOOKING_STATUS_LABEL, ORDER_STATUS_LABEL, type Booking, type Order, type Product } from "@/lib/types";
import { Empty, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";

export default async function Dashboard() {
  const today = todaySofia();
  const dayStart = sofiaToDate(today, "00:00").toISOString();
  const tomorrow = sofiaToDate(addDaysISO(today, 1), "00:00").toISOString();
  const weekEnd = sofiaToDate(addDaysISO(today, 8), "00:00").toISOString();
  const monthStart = sofiaToDate(`${today.slice(0, 7)}-01`, "00:00").toISOString();

  const [todayB, upcoming, newOrders, lowStock, monthOrders, monthDeposits] = await Promise.all([
    db().from("bookings").select("*, booking_services(name, is_main)").in("status", ["confirmed", "pending_payment", "completed"])
      .gte("start_at", dayStart).lt("start_at", tomorrow).order("start_at"),
    db().from("bookings").select("*, booking_services(name, is_main)").eq("status", "confirmed")
      .gte("start_at", tomorrow).lt("start_at", weekEnd).order("start_at").limit(12),
    db().from("orders").select("*").in("status", ["new", "stock_issue"]).order("created_at", { ascending: false }).limit(10),
    db().from("products").select("id, name, stock").eq("is_active", true).lte("stock", 3).order("stock"),
    db().from("orders").select("total").in("status", ["new", "processing", "shipped", "delivered"]).gte("created_at", monthStart),
    db().from("bookings").select("deposit_amount").eq("deposit_paid", true).is("refund_id", null).gte("created_at", monthStart),
  ]);

  const ordersSum = round2((monthOrders.data ?? []).reduce((s, o) => s + Number(o.total), 0));
  const depositSum = round2((monthDeposits.data ?? []).reduce((s, b) => s + Number(b.deposit_amount), 0));

  return (
    <>
      <PageHeader title="Табло">{fmt(new Date(), "EEEE, d MMMM yyyy")}</PageHeader>

      <dl className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-sand p-5">
          <dt className="text-sm text-espresso-soft">Оборот за месеца</dt>
          <dd className="mt-1 font-serif text-3xl tabular-nums">{formatEUR(ordersSum + depositSum)}</dd>
        </div>
        <div className="rounded-lg border border-line p-5">
          <dt className="text-sm text-espresso-soft">Поръчки (магазин)</dt>
          <dd className="mt-1 text-xl tabular-nums">{formatEUR(ordersSum)} <span className="text-sm text-espresso-soft">· {monthOrders.data?.length ?? 0} бр.</span></dd>
        </div>
        <div className="rounded-lg border border-line p-5">
          <dt className="text-sm text-espresso-soft">Капара (салон)</dt>
          <dd className="mt-1 text-xl tabular-nums">{formatEUR(depositSum)} <span className="text-sm text-espresso-soft">· {monthDeposits.data?.length ?? 0} бр.</span></dd>
        </div>
      </dl>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Днес">
          {!(todayB.data ?? []).length ? <Empty>Няма часове за днес.</Empty> : <BookingList items={todayB.data as Booking[]} />}
        </Panel>
        <Panel title="Следващите 7 дни">
          {!(upcoming.data ?? []).length ? <Empty>Няма предстоящи часове.</Empty> : <BookingList items={upcoming.data as Booking[]} withDate />}
        </Panel>
        <Panel title="Нови поръчки">
          {!(newOrders.data ?? []).length ? (
            <Empty>Няма нови поръчки.</Empty>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {(newOrders.data as Order[]).map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-terracotta">
                    <span>№ {o.number} · {o.customer_name}</span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums">{formatEUR(o.total)}</span>
                      <StatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Малко наличност (≤ 3)">
          {!(lowStock.data ?? []).length ? (
            <Empty>Всички активни продукти са с достатъчна наличност.</Empty>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {(lowStock.data as Pick<Product, "id" | "name" | "stock">[]).map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/products/${p.id}`} className="flex justify-between gap-3 py-2.5 hover:text-terracotta">
                    <span>{p.name}</span>
                    <span className={p.stock === 0 ? "font-medium text-danger" : "tabular-nums"}>{p.stock === 0 ? "изчерпан" : `${p.stock} бр.`}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function BookingList({ items, withDate = false }: { items: Booking[]; withDate?: boolean }) {
  return (
    <ul className="divide-y divide-line text-sm">
      {items.map((b) => (
        <li key={b.id}>
          <Link href={`/admin/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-terracotta">
            <span>
              <span className="tabular-nums">{withDate && `${fmt(b.start_at, "EEE d.MM")} · `}{formatTime(b.start_at)}–{formatTime(b.end_at)}</span>{" "}
              <span className="font-medium">{b.dog_name || b.customer_name}</span>{" "}
              <span className="text-espresso-soft">{b.booking_services?.find((s) => s.is_main)?.name}</span>
            </span>
            <StatusBadge status={b.status} label={BOOKING_STATUS_LABEL[b.status]} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
