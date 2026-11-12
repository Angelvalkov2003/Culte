import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getBooking } from "@/lib/booking/lifecycle";
import { formatEUR, formatRange } from "@/lib/format";
import { fmt, formatDateTime } from "@/lib/time";
import { BOOKING_STATUS_LABEL, SIZE_LABEL } from "@/lib/types";
import { cancelBookingAction, deleteBooking, updateBooking } from "@/app/admin/_actions/bookings";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

export const metadata = { title: "Резервация" };

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const b = await getBooking(id);
  if (!b) notFound();
  const minutes = Math.round((Date.parse(b.end_at) - Date.parse(b.start_at)) / 60000);
  const canRefund = b.deposit_paid && !b.refund_id && Boolean(b.stripe_payment_intent_id);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/bookings", label: "Всички резервации" }}
        title={`${b.dog_name || b.customer_name} · ${fmt(b.start_at, "d MMMM, HH:mm")}`}
        actions={<Link href={`/admin/calendar?date=${fmt(b.start_at, "yyyy-MM-dd")}&view=day`} className="text-sm link-underline">Виж в календара</Link>}
      >
        <StatusBadge status={b.status} label={BOOKING_STATUS_LABEL[b.status]} /> · {b.source === "manual" ? "Ръчно добавена" : "Онлайн"} · създадена{" "}
        {formatDateTime(b.created_at)}
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Детайли">
          <ActionForm action={updateBooking} className="space-y-4">
            <input type="hidden" name="id" value={b.id} />
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Дата" htmlFor="date"><Input id="date" name="date" type="date" defaultValue={fmt(b.start_at, "yyyy-MM-dd")} /></Field>
              <Field label="Начало" htmlFor="time"><Input id="time" name="time" type="time" step={300} defaultValue={fmt(b.start_at, "HH:mm")} /></Field>
              <Field label="Минути" htmlFor="duration"><Input id="duration" name="duration" type="number" min={5} step={5} defaultValue={minutes} /></Field>
              <Field label="Статус" htmlFor="status">
                <Select id="status" name="status" defaultValue={b.status === "cancelled" ? "expired" : b.status} disabled={b.status === "cancelled"}>
                  <option value="confirmed">Потвърдена</option>
                  <option value="completed">Изпълнена</option>
                  <option value="pending_payment">Чака плащане</option>
                  <option value="expired">Изтекла</option>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Клиент" htmlFor="customer_name"><Input id="customer_name" name="customer_name" defaultValue={b.customer_name} /></Field>
              <Field label="Телефон" htmlFor="customer_phone"><Input id="customer_phone" name="customer_phone" defaultValue={b.customer_phone} /></Field>
              <Field label="Имейл" htmlFor="customer_email"><Input id="customer_email" name="customer_email" type="email" defaultValue={b.customer_email} /></Field>
              <Field label="Куче / порода" htmlFor="dog_name">
                <div className="flex gap-2">
                  <Input id="dog_name" name="dog_name" defaultValue={b.dog_name} placeholder="Име" />
                  <Input name="dog_breed" defaultValue={b.dog_breed} placeholder="Порода" aria-label="Порода" />
                </div>
              </Field>
            </div>
            <Field label="Съобщение от клиента" htmlFor="message"><Textarea id="message" name="message" rows={2} defaultValue={b.message} /></Field>
            <Field label="Вътрешна бележка" htmlFor="admin_note"><Textarea id="admin_note" name="admin_note" rows={2} defaultValue={b.admin_note} /></Field>
            {b.status !== "cancelled" && <SubmitButton size="md">Запази</SubmitButton>}
          </ActionForm>
        </Panel>

        <div className="space-y-6">
          <Panel title={`Услуги · ${SIZE_LABEL[b.size]}`}>
            <ul className="divide-y divide-line text-sm">
              {(b.booking_services ?? []).map((s) => (
                <li key={s.id} className="flex justify-between gap-3 py-2">
                  <span>{s.name}{s.is_main && <span className="text-espresso-soft"> (основна)</span>}</span>
                  <span className="tabular-nums">{formatRange(s.price_from, s.price_to)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-espresso-soft">Обща цена</dt><dd className="tabular-nums">{formatRange(b.total_from, b.total_to)}</dd></div>
              <div className="flex justify-between"><dt className="text-espresso-soft">Капаро</dt><dd className="tabular-nums">{b.deposit_paid ? `${formatEUR(b.deposit_amount)} платено` : "не е платено"}</dd></div>
              {b.refund_id && <div className="flex justify-between text-danger"><dt>Върнато</dt><dd>{b.refunded_at && formatDateTime(b.refunded_at)}</dd></div>}
            </dl>
          </Panel>

          {b.status !== "cancelled" ? (
            <Panel title="Отказ">
              <ActionForm action={cancelBookingAction} confirm="Сигурни ли сте, че искате да откажете резервацията?" className="space-y-3">
                <input type="hidden" name="id" value={b.id} />
                {canRefund && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="refund" defaultChecked className="size-4 accent-terracotta" />
                    Върни капарото {formatEUR(b.deposit_amount)} през Stripe
                  </label>
                )}
                {b.customer_email && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="notify" defaultChecked className="size-4 accent-terracotta" />
                    Уведоми клиента по имейл
                  </label>
                )}
                <SubmitButton variant="danger">Откажи резервацията</SubmitButton>
              </ActionForm>
            </Panel>
          ) : (
            canRefund && (
              <Panel title="Капаро">
                <ActionForm action={cancelBookingAction} confirm="Връщане на капарото?">
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="refund" value="on" />
                  <SubmitButton variant="danger">Върни капарото {formatEUR(b.deposit_amount)}</SubmitButton>
                </ActionForm>
              </Panel>
            )
          )}

          <ActionForm action={deleteBooking} confirm="Изтриване завинаги? Това не може да се отмени.">
            <input type="hidden" name="id" value={b.id} />
            <SubmitButton variant="ghost" className="text-danger">Изтрий записа</SubmitButton>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
