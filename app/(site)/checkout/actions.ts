"use server";

import { z } from "zod";
import { db } from "@/lib/supabase/admin";
import { getCart, writeCart } from "@/lib/shop/cart";
import { getShippingMethods } from "@/lib/shop/catalog";
import { getOrder, sendOrderPlacedEmails } from "@/lib/shop/orders";
import { stripe, checkoutExpiry } from "@/lib/stripe";
import { siteUrl } from "@/lib/env";
import { toCents } from "@/lib/format";
import type { Order } from "@/lib/types";

const schema = z
  .object({
    name: z.string().trim().min(3, "Въведете име и фамилия").max(100),
    email: z.email("Въведете валиден имейл").max(200),
    phone: z.string().trim().regex(/^[+\d][\d\s()-]{6,20}$/, "Въведете валиден телефон"),
    city: z.string().trim().max(80).optional().default(""),
    address: z.string().trim().max(300).optional().default(""),
    note: z.string().trim().max(1000).optional().default(""),
    shippingMethodId: z.uuid("Изберете начин на доставка"),
    paymentMethod: z.enum(["stripe", "cod"], { error: "Изберете начин на плащане" }),
    terms: z.literal(true, { error: "Необходимо е съгласие с условията" }),
  });

export type CheckoutInput = z.input<typeof schema>;
export type CheckoutResult =
  | { ok: true; redirect: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const STOCK_MSG = "Някои продукти вече не са налични в избраното количество. Прегледайте количката.";

export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Проверете попълнените полета.", fieldErrors };
  }
  const v = parsed.data;

  const methods = await getShippingMethods();
  const method = methods.find((m) => m.id === v.shippingMethodId);
  if (!method) return { ok: false, error: "Изберете начин на доставка.", fieldErrors: { shippingMethodId: "Изберете начин на доставка" } };
  if (method.delivery !== "pickup") {
    const fe: Record<string, string> = {};
    if (v.city.length < 2) fe.city = "Въведете град";
    if (v.address.length < 3) fe.address = method.delivery === "office" ? "Въведете офис на куриера" : "Въведете адрес";
    if (Object.keys(fe).length) return { ok: false, error: "Проверете адреса за доставка.", fieldErrors: fe };
  }

  const cart = await getCart();
  if (!cart.items.length) return { ok: false, error: "Количката е празна." };
  if (cart.items.some((i) => i.adjusted)) return { ok: false, error: STOCK_MSG };

  const items = cart.items.map((i) => ({ product_id: i.product.id, quantity: i.quantity }));
  const customer = {
    name: v.name,
    email: v.email,
    phone: v.phone,
    city: method.delivery === "pickup" ? "Пловдив" : v.city,
    address: method.delivery === "pickup" ? "Вземане от салона" : v.address,
    note: v.note,
  };

  // create_order проверява наличности и цени в базата; при наложен платеж намалява бройките атомарно
  const { data, error } = await db().rpc("create_order", {
    p_customer: customer,
    p_items: items,
    p_shipping_method_id: method.id,
    p_payment_method: v.paymentMethod,
    p_deduct: v.paymentMethod === "cod",
  });
  if (error) {
    if (error.message.includes("insufficient_stock")) return { ok: false, error: STOCK_MSG };
    console.error("create_order", error);
    return { ok: false, error: "Не успяхме да създадем поръчката. Опитайте отново." };
  }
  const created = data as Order;

  if (v.paymentMethod === "cod") {
    await writeCart([]);
    const order = await getOrder(created.id);
    if (order) await sendOrderPlacedEmails(order);
    return { ok: true, redirect: `/checkout/success?order=${created.id}` };
  }

  try {
    const order = await getOrder(created.id);
    if (!order?.order_items?.length) throw new Error("Празна поръчка");
    const site = siteUrl();
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      locale: "bg",
      currency: "eur",
      customer_email: v.email,
      expires_at: checkoutExpiry(30),
      line_items: [
        ...order.order_items.map((i) => ({
          quantity: i.quantity,
          price_data: { currency: "eur", unit_amount: toCents(i.price), product_data: { name: i.name } },
        })),
        ...(Number(order.shipping_price) > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "eur",
                  unit_amount: toCents(order.shipping_price),
                  product_data: { name: `Доставка: ${order.shipping_name}` },
                },
              },
            ]
          : []),
      ],
      metadata: { kind: "order", order_id: order.id },
      payment_intent_data: { metadata: { kind: "order", order_id: order.id } },
      success_url: `${site}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/checkout/cancel?order=${order.id}`,
    });
    await db().from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);
    if (!session.url) throw new Error("Stripe не върна адрес за плащане");
    return { ok: true, redirect: session.url };
  } catch (e) {
    console.error("stripe order", e);
    await db().from("orders").update({ status: "expired" }).eq("id", created.id);
    return { ok: false, error: "Не успяхме да започнем плащането с карта. Опитайте отново или изберете наложен платеж." };
  }
}
