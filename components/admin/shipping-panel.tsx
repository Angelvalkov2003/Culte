import { formatEUR } from "@/lib/format";
import { formatDateTime, formatLongDate } from "@/lib/time";
import type { Order } from "@/lib/types";
import { speedyEligibility } from "@/lib/shipping/speedy-orders";
import { boxnowConfigured } from "@/lib/shipping/boxnow";
import { createBoxnowShipment, createSpeedyShipment, refreshBoxnowStatus } from "@/app/admin/_actions/shipping";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Panel } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";

const METHOD_LABEL: Record<string, string> = {
  speedy_office: "Speedy — до офис",
  speedy_apt: "Speedy — до автомат",
  speedy_address: "Speedy — до адрес",
  boxnow: "BoxNow — автомат",
  pickup: "Вземане от салона",
};

/** Сървърен компонент: доставка, товарителница, етикет. Speedy и BoxNow са отделни. */
export function ShippingPanel({ o }: { o: Order }) {
  return (
    <Panel title="Доставка">
      <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-espresso-soft">Метод</dt>
        <dd>{METHOD_LABEL[o.shipping_method] ?? o.shipping_name}</dd>
        <dt className="text-espresso-soft">Цена</dt>
        <dd className="tabular-nums">{formatEUR(o.shipping_price)}</dd>
        {o.shipping_site_name && (<><dt className="text-espresso-soft">Населено място</dt><dd>{o.shipping_site_name}</dd></>)}
        {o.shipping_office_name && (<><dt className="text-espresso-soft">Офис / автомат</dt><dd>{o.shipping_office_name} <span className="text-espresso-soft">(ID {o.shipping_office_id})</span></dd></>)}
        {o.shipping_method === "speedy_address" && (<><dt className="text-espresso-soft">Адрес</dt><dd>{String(o.shipping_details?.addressLine ?? "")}</dd></>)}
        {o.boxnow_locker_id && (<><dt className="text-espresso-soft">BoxNow автомат</dt><dd>{o.boxnow_locker_name} <span className="text-espresso-soft">(ID {o.boxnow_locker_id})</span>{o.shipping_details?.lockerAddress ? <span className="block text-espresso-soft">{String(o.shipping_details.lockerAddress)}</span> : null}</dd></>)}
        {o.shipping_deadline && (<><dt className="text-espresso-soft">Срок</dt><dd>до {formatLongDate(o.shipping_deadline)}</dd></>)}
      </dl>

      {o.shipping_provider === "speedy" && <SpeedyBlock o={o} />}
      {o.shipping_provider === "boxnow" && <BoxnowBlock o={o} />}
    </Panel>
  );
}

function SpeedyBlock({ o }: { o: Order }) {
  if (o.speedy_parcel_id) {
    return (
      <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
        <p>
          Товарителница <strong>{o.speedy_shipment_id}</strong>, пратка <strong>{o.speedy_parcel_id}</strong>
          {o.speedy_created_at && <span className="text-espresso-soft"> · {formatDateTime(o.speedy_created_at)}</span>}
        </p>
        {o.speedy_last_synced_at && <p className="text-espresso-soft">Последна проверка на статуса: {formatDateTime(o.speedy_last_synced_at)}</p>}
        <a href={`/api/admin/orders/${o.id}/speedy/label`} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}>
          Принтирай етикет (A6)
        </a>
      </div>
    );
  }
  const reasons = speedyEligibility(o);
  return (
    <div className="mt-4 border-t border-line pt-4">
      {reasons.length ? (
        <>
          <p className="text-sm font-medium">Товарителница още не може да се създаде:</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-espresso-soft">
            {reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </>
      ) : (
        <ActionForm action={createSpeedyShipment} confirm="Създаване на товарителница в Speedy?">
          <input type="hidden" name="id" value={o.id} />
          <p className="mb-2 text-sm text-espresso-soft">
            {o.payment_method === "stripe" ? "Платена с карта — без наложен платеж." : `С наложен платеж ${formatEUR(o.total)}.`}
          </p>
          <SubmitButton>Създай Speedy товарителница</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}

function BoxnowBlock({ o }: { o: Order }) {
  if (o.boxnow_parcel_id) {
    return (
      <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
        <p>
          BoxNow пратка <strong>{o.boxnow_parcel_id}</strong>
          {o.boxnow_created_at && <span className="text-espresso-soft"> · {formatDateTime(o.boxnow_created_at)}</span>}
        </p>
        <div className="flex flex-wrap items-start gap-2">
          <a href={`/api/admin/orders/${o.id}/boxnow/label`} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}>
            Принтирай BoxNow етикет
          </a>
          <ActionForm action={refreshBoxnowStatus}>
            <input type="hidden" name="id" value={o.id} />
            <SubmitButton variant="ghost">Обнови BoxNow статус</SubmitButton>
          </ActionForm>
        </div>
      </div>
    );
  }
  const reasons = [
    !boxnowConfigured() && "BoxNow не е конфигуриран.",
    o.status !== "processing" && "Статусът трябва да е „Обработва се“.",
    o.payment_method === "stripe" && !o.paid_at && "Поръчката с карта още не е платена.",
  ].filter(Boolean) as string[];
  return (
    <div className="mt-4 border-t border-line pt-4">
      {reasons.length ? (
        <ul className="list-disc pl-5 text-sm text-espresso-soft">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
      ) : (
        <ActionForm action={createBoxnowShipment} confirm="Създаване на пратка в BoxNow?">
          <input type="hidden" name="id" value={o.id} />
          <SubmitButton>Създай BoxNow пратка</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
