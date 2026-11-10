import type { Metadata } from "next";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { completeOrderFromSession, getOrder } from "@/lib/shop/orders";
import { formatEUR } from "@/lib/format";
import { PAYMENT_LABEL, type Order } from "@/lib/types";
import { ButtonLink } from "@/components/ui/button";
import { ClearCart } from "@/components/shop/clear-cart";
import { AutoRefresh } from "@/components/site/auto-refresh";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Поръчката е приета", robots: { index: false } };

export default async function CheckoutSuccess({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; order?: string }>;
}) {
  const sp = await searchParams;
  let order: Order | null = null;
  let paid = false;

  try {
    if (sp.session_id && /^cs_[A-Za-z0-9_]+$/.test(sp.session_id)) {
      const session = await stripe().checkout.sessions.retrieve(sp.session_id);
      if (session.metadata?.kind === "order") {
        paid = session.payment_status === "paid";
        order = paid ? await completeOrderFromSession(session) : await getOrder(session.metadata.order_id ?? "");
      }
    } else if (sp.order && z.uuid().safeParse(sp.order).success) {
      const o = await getOrder(sp.order);
      if (o?.payment_method === "cod") order = o;
    }
  } catch (e) {
    console.error("checkout success", e);
  }

  if (!order) {
    return (
      <Shell title="Не намерихме тази поръчка">
        <p>Ако сте платили, ще получите имейл с потвърждение.</p>
      </Shell>
    );
  }

  if (order.status === "pending_payment") {
    return (
      <Shell title="Потвърждаваме плащането">
        <p>Изчакваме потвърждение от Stripe. Страницата ще се обнови сама.</p>
        <AutoRefresh seconds={4} />
      </Shell>
    );
  }

  return (
    <Shell title={`Благодарим! Поръчка № ${order.number} е приета`}>
      {(paid || order.payment_method === "cod") && <ClearCart />}
      {order.status === "stock_issue" ? (
        <p>
          Плащането е получено, но един от продуктите току-що се изчерпа. Ще се свържем с вас до един работен ден, за да
          решим заедно — изчакване или връщане на сумата.
        </p>
      ) : (
        <p>
          Изпратихме потвърждение на {order.customer_email}. Ще ви пишем отново, когато поръчката тръгне към вас.
        </p>
      )}
      <dl className="mt-8 grid max-w-md grid-cols-2 gap-y-2 text-[15px]">
        <dt className="text-espresso-soft">Плащане</dt>
        <dd className="text-right">{PAYMENT_LABEL[order.payment_method]}</dd>
        <dt className="text-espresso-soft">Доставка</dt>
        <dd className="text-right">{order.shipping_name}</dd>
        <dt className="text-espresso-soft">Общо</dt>
        <dd className="text-right tabular-nums">{formatEUR(order.total)}</dd>
      </dl>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container-page max-w-3xl pt-16">
      <h1 className="text-5xl">{title}</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-7 text-espresso-soft">{children}</div>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/shop">Продължи пазаруването</ButtonLink>
        <ButtonLink href="/booking" variant="secondary">
          Запази час за груминг
        </ButtonLink>
      </div>
    </div>
  );
}
