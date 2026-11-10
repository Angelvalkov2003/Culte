import type { Metadata } from "next";
import { z } from "zod";
import { getOrder, expireOrder } from "@/lib/shop/orders";
import { stripe } from "@/lib/stripe";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Плащането е прекъснато", robots: { index: false } };

export default async function CheckoutCancel({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: id } = await searchParams;
  if (id && z.uuid().safeParse(id).success) {
    try {
      const order = await getOrder(id);
      if (order?.status === "pending_payment") {
        if (order.stripe_session_id) await stripe().checkout.sessions.expire(order.stripe_session_id).catch(() => undefined);
        await expireOrder(id);
      }
    } catch (e) {
      console.error("checkout cancel", e);
    }
  }
  return (
    <div className="container-page max-w-3xl pt-16">
      <h1 className="text-5xl">Плащането е прекъснато</h1>
      <p className="mt-6 text-[15px] leading-7 text-espresso-soft">
        Не сме взели пари от картата ви. Продуктите са все още в количката — можете да опитате отново или да изберете
        наложен платеж.
      </p>
      <div className="mt-10 flex gap-3">
        <ButtonLink href="/checkout">Опитай отново</ButtonLink>
        <ButtonLink href="/cart" variant="secondary">
          Към количката
        </ButtonLink>
      </div>
    </div>
  );
}
