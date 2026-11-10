import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getOrder } from "@/lib/shop/orders";
import { formatEUR } from "@/lib/format";
import { formatDateTime } from "@/lib/time";
import { DELIVERY_LABEL, ORDER_STATUS_LABEL, PAYMENT_LABEL, type OrderStatus } from "@/lib/types";
import { saveOrderDetails, updateOrderStatus } from "@/app/admin/_actions/orders";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

export const metadata = { title: "Поръчка" };

const STATUSES: OrderStatus[] = ["new", "processing", "shipped", "delivered", "cancelled", "stock_issue", "pending_payment", "expired"];

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const o = await getOrder(id);
  if (!o) notFound();

  return (
    <>
      <PageHeader title={`Поръчка № ${o.number}`} actions={<Link href="/admin/orders" className="text-sm link-underline">Всички поръчки</Link>}>
        {formatDateTime(o.created_at)} · {PAYMENT_LABEL[o.payment_method]}
        {o.paid_at ? ` · платена ${formatDateTime(o.paid_at)}` : ""} · <StatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} />
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Panel title="Продукти">
            <ul className="divide-y divide-line text-sm">
              {(o.order_items ?? []).map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-2">
                  <span>{i.product_id ? <Link href={`/admin/products/${i.product_id}`} className="hover:text-terracotta">{i.name}</Link> : i.name} × {i.quantity}</span>
                  <span className="tabular-nums">{formatEUR(Number(i.price) * i.quantity)}</span>
                </li>
              ))}
              <li className="flex justify-between py-2"><span>Доставка: {o.shipping_name}</span><span className="tabular-nums">{formatEUR(o.shipping_price)}</span></li>
              <li className="flex justify-between py-2 font-semibold"><span>Общо</span><span className="tabular-nums">{formatEUR(o.total)}</span></li>
            </ul>
            <p className="mt-3 text-xs text-espresso-soft">
              Наличностите {o.stock_deducted ? "са намалени" : "не са намалени"} за тази поръчка.
              {o.stripe_payment_intent_id && ` Stripe: ${o.stripe_payment_intent_id}`}
            </p>
          </Panel>

          <Panel title="Клиент и доставка">
            <ActionForm action={saveOrderDetails} className="space-y-4">
              <input type="hidden" name="id" value={o.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Име" htmlFor="customer_name"><Input id="customer_name" name="customer_name" defaultValue={o.customer_name} /></Field>
                <Field label="Телефон" htmlFor="customer_phone"><Input id="customer_phone" name="customer_phone" defaultValue={o.customer_phone} /></Field>
                <Field label="Имейл" htmlFor="customer_email"><Input id="customer_email" name="customer_email" type="email" defaultValue={o.customer_email} /></Field>
                <Field label="Град" htmlFor="city"><Input id="city" name="city" defaultValue={o.city} /></Field>
                <Field label={`Адрес (${DELIVERY_LABEL[o.delivery].toLowerCase()})`} htmlFor="address" className="sm:col-span-2">
                  <Input id="address" name="address" defaultValue={o.address} />
                </Field>
              </div>
              {o.note && <p className="text-sm"><span className="text-espresso-soft">Бележка от клиента:</span> {o.note}</p>}
              <Field label="Вътрешна бележка" htmlFor="admin_note"><Textarea id="admin_note" name="admin_note" rows={2} defaultValue={o.admin_note} /></Field>
              <SubmitButton variant="secondary">Запази данните</SubmitButton>
            </ActionForm>
          </Panel>
        </div>

        <Panel title="Статус">
          <ActionForm action={updateOrderStatus} className="space-y-4">
            <input type="hidden" name="id" value={o.id} />
            <Field label="Статус" htmlFor="status" hint="„Отказана“ връща бройките. „Изпратена“ праща имейл на клиента.">
              <Select id="status" name="status" defaultValue={o.status}>
                {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
              </Select>
            </Field>
            <Field label="Номер на товарителница" htmlFor="tracking_number">
              <Input id="tracking_number" name="tracking_number" defaultValue={o.tracking_number} />
            </Field>
            <SubmitButton size="md">Смени статуса</SubmitButton>
          </ActionForm>
          {o.payment_method === "stripe" && o.paid_at && (
            <p className="mt-4 text-xs text-espresso-soft">
              При отказ на платена поръчка върнете сумата от Stripe Dashboard → Payments.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
