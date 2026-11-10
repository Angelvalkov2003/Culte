"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { adminAction, f } from "@/lib/admin/action";
import { db } from "@/lib/supabase/admin";

const schema = z
  .object({
    id: z.string().optional().default(""),
    size: z.enum(["small", "medium", "large"]),
    name: f.req("Име", 120),
    description: f.text(500),
    duration_min: f.int("Мин. продължителност", 5, 600),
    duration_max: f.int("Макс. продължителност", 5, 600),
    price_from: f.money("Цена от"),
    price_to: f.money("Цена до"),
    sort_order: f.int("Ред", -100000),
    is_addon: f.bool(),
    is_active: f.bool(),
  })
  .refine((d) => d.duration_max >= d.duration_min, { message: "Максималната продължителност трябва да е ≥ минималната." })
  .refine((d) => d.price_to >= d.price_from, { message: "„Цена до“ трябва да е ≥ „Цена от“." });

export const saveService = adminAction(schema, async (d) => {
  const { id, ...row } = d;
  if (id) {
    const { error } = await db().from("services").update(row).eq("id", id);
    if (error) throw new Error(error.message);
    return "Услугата е запазена.";
  }
  const { error } = await db().from("services").insert(row);
  if (error) throw new Error(error.message);
  redirect("/admin/services");
}, ["/"]);

export const deleteService = adminAction(z.object({ id: f.uuid() }), async ({ id }) => {
  const { error } = await db().from("services").delete().eq("id", id);
  if (error) throw new Error(error.message);
  redirect("/admin/services");
}, ["/"]);
