"use server";

import { z } from "zod";
import { readCart, writeCart } from "@/lib/shop/cart";
import { getProductsByIds } from "@/lib/shop/catalog";

export type CartActionResult = { ok: true; quantity: number } | { ok: false; error: string };

const idSchema = z.uuid();

async function productFor(id: string) {
  if (!idSchema.safeParse(id).success) return null;
  const [p] = await getProductsByIds([id]);
  return p ?? null;
}

export async function addToCart(productId: string, quantity = 1): Promise<CartActionResult> {
  const qty = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
  const product = await productFor(productId);
  if (!product) return { ok: false, error: "Продуктът не е наличен." };
  if (product.stock <= 0) return { ok: false, error: "Продуктът е изчерпан." };

  const lines = await readCart();
  const existing = lines.find((l) => l.id === productId);
  const current = existing?.q ?? 0;
  if (current >= product.stock) {
    return { ok: false, error: `В наличност има само ${product.stock} бр. и всички вече са в количката.` };
  }
  const next = Math.min(product.stock, current + qty);
  if (existing) existing.q = next;
  else lines.push({ id: productId, q: next });
  await writeCart(lines);
  return { ok: true, quantity: next };
}

export async function setCartQuantity(productId: string, quantity: number): Promise<CartActionResult> {
  const lines = await readCart();
  const qty = Math.floor(Number(quantity) || 0);
  if (qty <= 0) {
    await writeCart(lines.filter((l) => l.id !== productId));
    return { ok: true, quantity: 0 };
  }
  const product = await productFor(productId);
  if (!product) {
    await writeCart(lines.filter((l) => l.id !== productId));
    return { ok: false, error: "Продуктът вече не е наличен и беше премахнат." };
  }
  const next = Math.min(qty, product.stock);
  await writeCart(lines.map((l) => (l.id === productId ? { ...l, q: next } : l)).filter((l) => l.q > 0));
  if (next < qty) return { ok: false, error: `Максимум ${product.stock} бр. в наличност.` };
  return { ok: true, quantity: next };
}

export async function removeFromCart(productId: string) {
  await writeCart((await readCart()).filter((l) => l.id !== productId));
}

export async function clearCart() {
  await writeCart([]);
}
