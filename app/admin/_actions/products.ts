"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { adminAction, f } from "@/lib/admin/action";
import { db } from "@/lib/supabase/admin";
import { slugify } from "@/lib/format";

function refresh() {
  revalidatePath("/", "layout");
}

/** Бърза inline смяна от списъка */
export async function setProductActive(id: string, isActive: boolean): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Невалиден продукт" };
  const { error } = await db().from("products").update({ is_active: Boolean(isActive) }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  refresh();
  return { ok: true };
}

export async function setProductStock(id: string, stock: number): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const n = Math.floor(Number(stock));
  if (!z.uuid().safeParse(id).success || !Number.isFinite(n) || n < 0 || n > 100000) {
    return { ok: false, message: "Бройките трябва да са цяло число ≥ 0" };
  }
  const { error } = await db().from("products").update({ stock: n }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  refresh();
  return { ok: true };
}

const productSchema = z.object({
  id: z.string().optional().default(""),
  name: f.req("Име", 200),
  slug: f.text(80),
  category_id: z.string().optional().default(""),
  description: f.text(4000),
  price: f.money("Цена"),
  stock: f.int("Бройки"),
  sort_order: f.int("Ред", -100000),
  is_active: f.bool(),
  image_public_id: f.text(300),
  manufacturer: f.text(500),
  safety_info: f.text(2000),
});

export const saveProduct = adminAction(productSchema, async (d) => {
  const row = {
    name: d.name,
    slug: slugify(d.slug || d.name) || `produkt-${Date.now()}`,
    category_id: z.uuid().safeParse(d.category_id).success ? d.category_id : null,
    description: d.description,
    price: d.price,
    stock: d.stock,
    sort_order: d.sort_order,
    is_active: d.is_active,
    image_public_id: d.image_public_id || null,
    manufacturer: d.manufacturer,
    safety_info: d.safety_info,
  };
  if (d.id) {
    const { error } = await db().from("products").update(row).eq("id", d.id);
    if (error) throw new Error(error.code === "23505" ? "Този адрес (slug) вече се ползва." : error.message);
    return "Продуктът е запазен.";
  }
  const { error } = await db().from("products").insert(row);
  if (error) throw new Error(error.code === "23505" ? "Този адрес (slug) вече се ползва." : error.message);
  refresh();
  redirect("/admin/products?created=1");
}, ["/"]);

export async function deleteProduct(id: string) {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return;
  await db().from("products").delete().eq("id", id);
  refresh();
  redirect("/admin/products");
}
