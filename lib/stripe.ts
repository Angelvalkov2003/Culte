import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) client = new Stripe(env.stripeSecret(), { appInfo: { name: "Culte" } });
  return client;
}

/** Stripe изисква expires_at ≥ 30 мин; добавяме минута буфер. */
export function checkoutExpiry(holdMinutes = 30): number {
  return Math.floor(Date.now() / 1000) + Math.max(30, holdMinutes) * 60 + 60;
}
