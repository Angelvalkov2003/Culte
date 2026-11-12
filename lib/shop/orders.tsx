import "server-only";
import type Stripe from "stripe";
import { db } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { adminEmail, sendEmail } from "@/lib/email";
import type { Order, OrderStatus } from "@/lib/types";
import { OrderAdminEmail, OrderConfirmationEmail, OrderShippedEmail, StockIssueEmail } from "@/emails/order-emails";

export async function getOrder(id: string): Promise<Order | null> {
  const { data } = await db().from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  return (data as Order) ?? null;
}

export async function sendOrderPlacedEmails(order: Order) {
  await Promise.all([
    sendEmail({
      to: order.customer_email,
      subject: `Поръчка № ${order.number} в Culte е приета`,
      react: <OrderConfirmationEmail order={order} />,
    }),
    sendEmail({
      to: adminEmail(),
      subject: `Нова поръчка № ${order.number} — ${order.customer_name}`,
      react: <OrderAdminEmail order={order} />,
      replyTo: order.customer_email,
    }),
  ]);
}

/**
 * Stripe плащане е завършено → намаляваме наличностите атомарно.
 * Ако междувременно няма наличност → stock_issue + имейл до админа. Идемпотентно.
 */
export async function completeOrderFromSession(session: Stripe.Checkout.Session): Promise<Order | null> {
  const orderId = session.metadata?.order_id;
  if (!orderId || session.payment_status !== "paid") return null;

  const current = await getOrder(orderId);
  if (!current) return null;
  if (!["pending_payment", "expired"].includes(current.status)) return current;

  const { data: ok, error } = await db().rpc("order_deduct_stock", { p_order_id: orderId });
  if (error) throw new Error(error.message);

  const pi = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
  const nextStatus: OrderStatus = ok ? "new" : "stock_issue";
  const { data: changed } = await db()
    .from("orders")
    .update({ status: nextStatus, paid_at: new Date().toISOString(), stripe_payment_intent_id: pi })
    .eq("id", orderId)
    .in("status", ["pending_payment", "expired"])
    .select("id")
    .maybeSingle();

  const order = await getOrder(orderId);
  if (changed && order) {
    if (ok) await sendOrderPlacedEmails(order);
    else
      await sendEmail({
        to: adminEmail(),
        subject: `Внимание: платена поръчка № ${order.number} без наличност`,
        react: <StockIssueEmail order={order} />,
      });
  }
  return order;
}

/** Връщане на платената с карта сума през Stripe Refunds API. Идемпотентно. */
export async function refundOrder(orderId: string): Promise<boolean> {
  const order = await getOrder(orderId);
  if (!order) throw new Error("Поръчката не е намерена");
  if (order.refund_id) return false;
  if (order.payment_method !== "stripe" || !order.paid_at || !order.stripe_payment_intent_id) {
    throw new Error("Няма плащане с карта за връщане (при наложен платеж върнете сумата по банков път).");
  }
  const r = await stripe().refunds.create(
    { payment_intent: order.stripe_payment_intent_id },
    { idempotencyKey: `order-refund-${order.id}` },
  );
  const { error } = await db().from("orders").update({ refund_id: r.id, refunded_at: new Date().toISOString() }).eq("id", orderId);
  if (error) throw new Error(error.message);
  return true;
}

export async function expireOrder(orderId: string) {
  await db().from("orders").update({ status: "expired" }).eq("id", orderId).eq("status", "pending_payment");
}

const ACTIVE: OrderStatus[] = ["new", "processing", "shipped", "delivered"];

/** Смяна на статус от админа: отказ връща бройките, „изпратена“ праща имейл. */
export async function changeOrderStatus(orderId: string, status: OrderStatus, trackingNumber?: string) {
  const order = await getOrder(orderId);
  if (!order) throw new Error("Поръчката не е намерена");

  if (status === "cancelled" || status === "expired") {
    const { error } = await db().rpc("order_restore_stock", { p_order_id: orderId });
    if (error) throw new Error(error.message);
  } else if (ACTIVE.includes(status) && !order.stock_deducted && order.status !== "pending_payment") {
    // Връщане на отказана поръчка обратно в активна → намаляваме отново
    const { data: ok, error } = await db().rpc("order_deduct_stock", { p_order_id: orderId });
    if (error) throw new Error(error.message);
    if (!ok) throw new Error("Няма достатъчна наличност, за да се активира поръчката отново");
  }

  const patch: Record<string, unknown> = { status };
  if (trackingNumber !== undefined) patch.tracking_number = trackingNumber;
  if (status === "shipped" && !order.shipped_at) patch.shipped_at = new Date().toISOString();
  const { error } = await db().from("orders").update(patch).eq("id", orderId);
  if (error) throw new Error(error.message);

  if (status === "shipped" && order.status !== "shipped") {
    const updated = await getOrder(orderId);
    if (updated)
      await sendEmail({
        to: updated.customer_email,
        subject: `Поръчка № ${updated.number} е изпратена`,
        react: <OrderShippedEmail order={updated} />,
      });
  }
}
