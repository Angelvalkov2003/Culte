import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { RowLink } from "@/components/admin/row-link";
import { db } from "@/lib/supabase/admin";
import { formatEUR } from "@/lib/format";
import { formatDateTime } from "@/lib/time";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL, type Order, type OrderStatus } from "@/lib/types";
import { Empty, PageHeader, StatusBadge, Table, Td, Th } from "@/components/admin/ui";
import { cn } from "@/lib/format";
import { syncBoxnow, syncSpeedy } from "@/app/admin/_actions/shipping";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { speedyConfigured } from "@/lib/shipping/speedy";
import { boxnowConfigured } from "@/lib/shipping/boxnow";

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
      <PageHeader title="Поръчки">
        Поток: Нова → Обработва се → (товарителница) → Изпратена → Доставена.
      </PageHeader>
      {(speedyConfigured() || boxnowConfigured()) && (
        <div className="mb-5 flex flex-wrap items-start gap-3">
          {speedyConfigured() && (
            <ActionForm action={syncSpeedy}>
              <SubmitButton variant="secondary">Обнови Speedy статуси</SubmitButton>
            </ActionForm>
          )}
          {boxnowConfigured() && (
            <ActionForm action={syncBoxnow}>
              <SubmitButton variant="secondary">Обнови BoxNow статуси</SubmitButton>
            </ActionForm>
          )}
        </div>
      )}
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
        <>
          <ul className="space-y-2 sm:hidden">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center gap-3 rounded-lg border border-line bg-white/60 p-4 transition-colors active:bg-sand hover:border-clay"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium">№ {o.number}</span>
                      <span className="font-medium tabular-nums">{formatEUR(o.total)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm">{o.customer_name}{o.city ? `, ${o.city}` : ""}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-espresso-soft">
                      <StatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} />
                      {formatDateTime(o.created_at)} · {PAYMENT_LABEL[o.payment_method]}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-espresso-soft" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden sm:block">
            <Table>
              <thead>
                <tr><Th>№</Th><Th>Дата</Th><Th>Клиент</Th><Th>Плащане</Th><Th className="text-right">Общо</Th><Th>Статус</Th><Th><span className="sr-only">Отвори</span></Th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <RowLink key={o.id} href={`/admin/orders/${o.id}`}>
                    <Td><Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-terracotta">№ {o.number}</Link></Td>
                    <Td className="whitespace-nowrap">{formatDateTime(o.created_at)}</Td>
                    <Td>{o.customer_name}<span className="block text-xs text-espresso-soft">{o.city}</span></Td>
                    <Td>{PAYMENT_LABEL[o.payment_method]}</Td>
                    <Td className="text-right tabular-nums">{formatEUR(o.total)}</Td>
                    <Td><StatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} /></Td>
                    <Td className="w-8 pl-0 text-espresso-soft"><ChevronRight className="size-4" aria-hidden /></Td>
                  </RowLink>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </>
  );
}
