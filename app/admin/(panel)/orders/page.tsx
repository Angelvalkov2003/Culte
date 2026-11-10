import Link from "next/link";
import { db } from "@/lib/supabase/admin";
import { formatEUR } from "@/lib/format";
import { formatDateTime } from "@/lib/time";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL, type Order, type OrderStatus } from "@/lib/types";
import { Empty, PageHeader, StatusBadge, Table, Td, Th } from "@/components/admin/ui";
import { cn } from "@/lib/format";

export const metadata = { title: "Поръчки" };

const FILTERS: (OrderStatus | "all")[] = ["all", "new", "processing", "shipped", "delivered", "stock_issue", "cancelled", "pending_payment", "expired"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "all" } = await searchParams;
  let q = db().from("orders").select("*, order_items(quantity)").order("created_at", { ascending: false }).limit(200);
  if (status !== "all" && FILTERS.includes(status as OrderStatus)) q = q.eq("status", status);
  else q = q.not("status", "in", "(pending_payment,expired)");
  const { data } = await q;
  const orders = (data ?? []) as Order[];

  return (
    <>
      <PageHeader title="Поръчки" />
      <nav aria-label="Филтър по статус" className="mb-4 flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link key={f} href={f === "all" ? "/admin/orders" : `/admin/orders?status=${f}`}
            className={cn("rounded-md border px-3 py-1.5", status === f ? "border-espresso bg-espresso text-cream" : "border-line hover:bg-sand")}>
            {f === "all" ? "Активни" : ORDER_STATUS_LABEL[f]}
          </Link>
        ))}
      </nav>
      {!orders.length ? (
        <Empty>Няма поръчки.</Empty>
      ) : (
        <Table>
          <thead>
            <tr><Th>№</Th><Th>Дата</Th><Th>Клиент</Th><Th>Плащане</Th><Th className="text-right">Общо</Th><Th>Статус</Th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <Td><Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-terracotta">№ {o.number}</Link></Td>
                <Td className="whitespace-nowrap">{formatDateTime(o.created_at)}</Td>
                <Td>{o.customer_name}<span className="block text-xs text-espresso-soft">{o.city}</span></Td>
                <Td>{PAYMENT_LABEL[o.payment_method]}</Td>
                <Td className="text-right tabular-nums">{formatEUR(o.total)}</Td>
                <Td><StatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
