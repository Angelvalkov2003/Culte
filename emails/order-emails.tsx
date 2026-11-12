import { formatEUR } from "@/lib/format";
import { formatDateTime } from "@/lib/time";
import { DELIVERY_LABEL, PAYMENT_LABEL, type Order } from "@/lib/types";
import { EmailLayout, Items, P, Rows, emailSite } from "./components";
import { Link } from "@react-email/components";

function lines(o: Order) {
  return [
    ...(o.order_items ?? []).map((i) => ({ name: i.name, qty: i.quantity, price: formatEUR(Number(i.price) * i.quantity) })),
    { name: `Доставка: ${o.shipping_name}`, price: Number(o.shipping_price) ? formatEUR(o.shipping_price) : "безплатна" },
    { name: "Общо", price: formatEUR(o.total) },
  ];
}

function delivery(o: Order): [string, string][] {
  return [
    ["Получател", o.customer_name],
    ["Телефон", o.customer_phone],
    ["Доставка", `${DELIVERY_LABEL[o.delivery]} · ${o.shipping_name}`],
    ...(o.delivery === "pickup" ? [] : ([["Адрес", `${o.city}, ${o.address}`]] as [string, string][])),
    ["Плащане", PAYMENT_LABEL[o.payment_method]],
    ...(o.note ? ([["Бележка", o.note]] as [string, string][]) : []),
  ];
}

export function OrderConfirmationEmail({ order }: { order: Order }) {
  return (
    <EmailLayout preview={`Поръчка № ${order.number} е приета`} title={`Благодарим ви за поръчка № ${order.number}`}>
      <P>
        Здравейте, {order.customer_name}! Получихме поръчката ви и започваме да я подготвяме. Ще ви пишем отново, когато
        я изпратим.
      </P>
      <Items items={lines(order)} />
      <Rows rows={delivery(order)} />
      {order.payment_method === "cod" && <P>Ще платите {formatEUR(order.total)} при получаване.</P>}
      {order.payment_method === "stripe" && order.stripe_payment_intent_id && (
        <P>Платено с карта. Идентификатор на плащането: {order.stripe_payment_intent_id}</P>
      )}
      <P>
        Имате право да се откажете от покупката в 14 дни от получаването, без да посочвате причина:{" "}
        <Link href={`${emailSite}/withdrawal`}>Отказ от договора тук</Link>. Отворени запечатани козметични продукти не
        подлежат на връщане. Пълни условия: <Link href={`${emailSite}/terms`}>Общи условия</Link>,{" "}
        <Link href={`${emailSite}/shipping-returns`}>Доставка и връщане</Link>.
      </P>
    </EmailLayout>
  );
}

export function OrderAdminEmail({ order }: { order: Order }) {
  return (
    <EmailLayout preview={`Нова поръчка № ${order.number}`} title={`Нова поръчка № ${order.number}`}>
      <P>Създадена на {formatDateTime(order.created_at)}.</P>
      <Items items={lines(order)} />
      <Rows rows={[...delivery(order), ["Имейл", order.customer_email]]} />
      {order.invoice_requested && (
        <P>
          Поискана фактура: {[order.invoice_details.company, order.invoice_details.eik && `ЕИК ${order.invoice_details.eik}`, order.invoice_details.vat, order.invoice_details.address, order.invoice_details.mol && `МОЛ ${order.invoice_details.mol}`].filter(Boolean).join(", ")}
        </P>
      )}
    </EmailLayout>
  );
}

export function OrderShippedEmail({ order }: { order: Order }) {
  return (
    <EmailLayout preview={`Поръчка № ${order.number} е изпратена`} title="Поръчката ви пътува">
      <P>Здравейте, {order.customer_name}! Поръчка № {order.number} е предадена на куриер.</P>
      {order.tracking_number && <P>Номер на пратката: {order.tracking_number}</P>}
      <Items items={lines(order)} />
      {order.payment_method === "cod" && <P>При получаване ще платите {formatEUR(order.total)}.</P>}
    </EmailLayout>
  );
}

export function StockIssueEmail({ order }: { order: Order }) {
  return (
    <EmailLayout preview={`Проблем с наличност — поръчка № ${order.number}`} title="Платена поръчка без наличност">
      <P>
        Поръчка № {order.number} е платена със Stripe, но междувременно част от продуктите са изчерпани. Статусът е
        „Проблем с наличност“. Свържете се с клиента и решете дали да изчака доставка, или да върнете сумата.
      </P>
      <Items items={lines(order)} />
      <Rows rows={[...delivery(order), ["Имейл", order.customer_email]]} />
    </EmailLayout>
  );
}
