import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { db } from "@/lib/supabase/admin";
import { confirmBookingFromSession, expireBooking } from "@/lib/booking/lifecycle";
import { completeOrderFromSession, expireOrder } from "@/lib/shop/orders";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe().webhooks.constructEvent(body, signature, env.stripeWebhookSecret());
  } catch (e) {
    console.error("[webhook] invalid signature", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Вече обработено събитие → 200 без повторна работа
  const { data: seen } = await db().from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.kind === "booking") await confirmBookingFromSession(session);
      else if (session.metadata?.kind === "order") await completeOrderFromSession(session);
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.kind === "booking" && session.metadata.booking_id) await expireBooking(session.metadata.booking_id);
      else if (session.metadata?.kind === "order" && session.metadata.order_id) await expireOrder(session.metadata.order_id);
    }
  } catch (e) {
    // 500 → Stripe ще опита отново; обработката е идемпотентна по статуси
    console.error("[webhook] handler failed", event.type, e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  await db().from("stripe_events").insert({ id: event.id, type: event.type });
  return NextResponse.json({ received: true });
}
