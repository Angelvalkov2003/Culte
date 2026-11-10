import "server-only";
import { cookies } from "next/headers";
import { getProductsByIds } from "@/lib/shop/catalog";
import { round2 } from "@/lib/format";
import type { Product } from "@/lib/types";

export const CART_COOKIE = "culte_cart";
const MAX_LINES = 50;

export interface CartLine {
  id: string;
  q: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  lineTotal: number;
  /** Количеството е намалено/премахнато заради наличност */
  adjusted: boolean;
}

export async function readCart(): Promise<CartLine[]> {
  const raw = (await cookies()).get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (l): l is CartLine =>
          typeof l?.id === "string" && /^[0-9a-f-]{36}$/i.test(l.id) && Number.isInteger(l?.q) && l.q > 0,
      )
      .slice(0, MAX_LINES);
  } catch {
    return [];
  }
}

export async function writeCart(lines: CartLine[]) {
  const store = await cookies();
  const clean = lines.filter((l) => l.q > 0).slice(0, MAX_LINES);
  if (!clean.length) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(CART_COOKIE, JSON.stringify(clean), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function cartCount(): Promise<number> {
  return (await readCart()).reduce((s, l) => s + l.q, 0);
}

/** Количката с актуални цени и наличности от базата. */
export async function getCart(): Promise<{ items: CartItem[]; subtotal: number; count: number }> {
  const lines = await readCart();
  const products = await getProductsByIds(lines.map((l) => l.id));
  const items: CartItem[] = [];
  for (const line of lines) {
    const product = products.find((p) => p.id === line.id);
    if (!product) continue;
    const quantity = Math.min(line.q, product.stock);
    items.push({
      product,
      quantity,
      lineTotal: round2(product.price * quantity),
      adjusted: quantity !== line.q,
    });
  }
  return {
    items,
    subtotal: round2(items.reduce((s, i) => s + i.lineTotal, 0)),
    count: items.reduce((s, i) => s + i.quantity, 0),
  };
}
