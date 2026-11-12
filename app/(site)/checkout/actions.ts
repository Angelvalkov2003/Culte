"use server";

import { z } from "zod";
import { db } from "@/lib/supabase/admin";
import { getCart, writeCart } from "@/lib/shop/cart";
import { resolveShipping, shippingSelectionSchema, ShippingError, totalMatches } from "@/lib/shipping/resolve";
import { getOrder, sendOrderPlacedEmails } from "@/lib/shop/orders";
import { stripe, checkoutExpiry } from "@/lib/stripe";
import { requestOrigin } from "@/lib/env";
import { toCents } from "@/lib/format";
import type { Order } from "@/lib/types";

const schema = z
  .object({
    name: z.string().trim().min(3, "Въведете име и фамилия").max(100),
    email: z.email("Въведете валиден имейл").max(200),
    phone: z.string().trim().regex(/^[+\d][\d\s()-]{6,20}$/, "Въведете валиден телефон"),
    note: z.string().trim().max(1000).optional().default(""),
    shipping: shippingSelectionSchema,
    /** Цената, която клиентът вижда (само за сравнение — не се записва) */
    clientShippingPrice: z.number().min(0).max(1000),
    clientTotal: z.number().min(0).max(100000),
    paymentMethod: z.enum(["stripe", "cod"], { error: "Изберете начин на плащане" }),
    terms: z.literal(true, { error: "Необходимо е съгласие с условията" }),
    invoice: z.boolean().default(false),
    invoiceCompany: z.string().trim().max(200).default(""),
    invoiceEik: z.string().trim().max(20).default(""),
    invoiceVat: z.string().trim().max(20).default(""),
    invoiceAddress: z.string().trim().max(300).default(""),
    invoiceMol: z.string().trim().max(100).default(""),
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
    for (const i of parsed.error.issues) {
      const key = i.path[0] === "shipping" ? String(i.path[1] ?? "shipping") : String(i.path[0]);
      fieldErrors[key] ??= i.message;
    }
    const shippingErr = parsed.error.issues.find((i) => i.path[0] === "shipping");
    return { ok: false, error: shippingErr ? "Изберете и попълнете начина на доставка." : "Проверете попълнените полета.", fieldErrors };
  }
  const v = parsed.data;

  if (v.invoice) {
    const fe: Record<string, string> = {};
    if (v.invoiceCompany.length < 2) fe.invoiceCompany = "Въведете фирма";
    if (!/^(\d{9}|\d{10}|\d{13})$/.test(v.invoiceEik)) fe.invoiceEik = "ЕИК/ЕГН: 9, 10 или 13 цифри";
    if (v.invoiceAddress.length < 5) fe.invoiceAddress = "Въведете адрес по регистрация";
    if (Object.keys(fe).length) return { ok: false, error: "Проверете данните за фактура.", fieldErrors: fe };
  }

  const cart = await getCart();
  if (!cart.items.length) return { ok: false, error: "Количката е празна." };
  if (cart.items.some((i) => i.adjusted)) return { ok: false, error: STOCK_MSG };

  // Доставката се преизчислява на сървъра (Speedy/BoxNow/ръчна) — не вярваме на цената от клиента
  let shipping;
  try {
    shipping = await resolveShipping(v.shipping, cart.subtotal);
  } catch (e) {
    if (e instanceof ShippingError) return { ok: false, error: e.message };
    console.error("resolveShipping", e);
    return { ok: false, error: "Не успяхме да изчислим доставката. Опитайте отново." };
  }
  if (!totalMatches(v.clientTotal, cart.subtotal, shipping.price)) {
    return {
      ok: false,
      error: `Цената на доставката се промени на ${shipping.price.toFixed(2).replace(".", ",")} €. Прегледайте сумата и потвърдете отново.`,
    };
  }

  const items = cart.items.map((i) => ({ product_id: i.product.id, quantity: i.quantity }));
  const customer = {
    name: v.name,
    email: v.email,
    phone: v.phone,
    city: shipping.city,
    address: shipping.address,
    note: v.note,
    invoice_requested: v.invoice,
    invoice_details: v.invoice
      ? { company: v.invoiceCompany, eik: v.invoiceEik, vat: v.invoiceVat, address: v.invoiceAddress, mol: v.invoiceMol }
      : {},
  };

  // create_order проверява наличности и цени в базата; при наложен платеж намалява бройките атомарно
  const { data, error } = await db().rpc("create_order", {
    p_customer: customer,
    p_items: items,
    p_shipping: shipping,
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
    const site = await requestOrigin();
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
