import Link from "next/link";
import { db } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/time";
import { WITHDRAWAL_STATUS_LABEL, type WithdrawalRequest } from "@/lib/types";
import { updateWithdrawal } from "@/app/admin/_actions/withdrawals";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Empty, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { Input, Select } from "@/components/ui/field";

export const metadata = { title: "Откази от договор" };

const TONE: Record<WithdrawalRequest["status"], string> = { received: "new", processed: "confirmed", rejected: "cancelled" };

export default async function WithdrawalsPage() {
  const { data } = await db().from("withdrawal_requests").select("*").order("created_at", { ascending: false }).limit(200);
  const items = (data ?? []) as WithdrawalRequest[];
  return (
    <>
      <PageHeader title="Откази от договор">
        Подадени през онлайн формуляра. Сумата трябва да се върне до 14 дни. Резервации: откажете ги с връщане на капарото.
      </PageHeader>
      {!items.length ? (
        <Empty>Няма подадени откази.</Empty>
      ) : (
        <div className="space-y-3">
          {items.map((w) => (
            <Panel key={w.id}>
              <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">
                    О-{w.number} · {w.kind === "order" ? "Поръчка" : "Резервация"} №{" "}
                    {w.order_id ? <Link className="link-underline" href={`/admin/orders/${w.order_id}`}>{w.reference}</Link>
                      : w.booking_id ? <Link className="link-underline" href={`/admin/bookings/${w.booking_id}`}>{w.reference}</Link> : w.reference}
                  </p>
                  <p className="text-espresso-soft">{formatDateTime(w.created_at)} · {w.customer_name} · {w.customer_email}</p>
                  {w.items && <p className="mt-1">Продукти: {w.items}</p>}
                  {w.reason && <p className="mt-1 text-espresso-soft">Причина: {w.reason}</p>}
                </div>
                <StatusBadge status={TONE[w.status]} label={WITHDRAWAL_STATUS_LABEL[w.status]} />
              </div>
              <ActionForm action={updateWithdrawal} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={w.id} />
                <Select key={w.status} name="status" defaultValue={w.status} className="max-w-44" aria-label="Статус">
                  <option value="received">Получен</option>
                  <option value="processed">Обработен</option>
                  <option value="rejected">Отхвърлен</option>
                </Select>
                <Input name="admin_note" defaultValue={w.admin_note} placeholder="Бележка" className="max-w-md" aria-label="Бележка" />
                <SubmitButton variant="secondary">Запази</SubmitButton>
              </ActionForm>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
