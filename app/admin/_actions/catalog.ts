"use server";

import { z } from "zod";
import { adminAction, f } from "@/lib/admin/action";
import { db } from "@/lib/supabase/admin";
import { slugify } from "@/lib/format";

/* ---------- Категории ---------- */
const categorySchema = z.object({
  id: z.string().optional().default(""),
  name: f.req("Име", 100),
  slug: f.text(80),
  description: f.text(500),
  sort_order: f.int("Ред", -100000),
  is_active: f.bool(),
});

export const saveCategory = adminAction(categorySchema, async (d) => {
  const row = { name: d.name, slug: slugify(d.slug || d.name), description: d.description, sort_order: d.sort_order, is_active: d.is_active };
  const q = d.id ? db().from("categories").update(row).eq("id", d.id) : db().from("categories").insert(row);
  const { error } = await q;
  if (error) throw new Error(error.code === "23505" ? "Този slug вече се ползва." : error.message);
  return d.id ? "Категорията е запазена." : "Категорията е добавена.";
}, ["/"]);

export const deleteCategory = adminAction(z.object({ id: f.uuid() }), async ({ id }) => {
  const { error } = await db().from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return "Категорията е изтрита. Продуктите ѝ остават без категория.";
}, ["/"]);

/* ---------- Методи на доставка ---------- */
const shippingSchema = z.object({
  id: z.string().optional().default(""),
  name: f.req("Име", 100),
  description: f.text(300),
  provider: z.string().trim().default("manual"),
  delivery: z.enum(["address", "office", "pickup"]),
  price: f.money("Цена"),
  free_over: f.optMoney(),
  sort_order: f.int("Ред", -100000),
  is_active: f.bool(),
});

export const saveShipping = adminAction(shippingSchema, async (d) => {
  const { id, ...row } = d;
  const q = id ? db().from("shipping_methods").update(row).eq("id", id) : db().from("shipping_methods").insert(row);
  const { error } = await q;
  if (error) throw new Error(error.message);
  return id ? "Методът е запазен." : "Методът е добавен.";
}, ["/"]);

export const deleteShipping = adminAction(z.object({ id: f.uuid() }), async ({ id }) => {
  const { error } = await db().from("shipping_methods").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return "Методът е изтрит.";
}, ["/"]);
