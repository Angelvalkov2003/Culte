"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { DOG_SIZES, SERVICE_GROUPS } from "@/lib/types";
import { adminAction, f } from "@/lib/admin/action";
import { db } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { suggestDeposit } from "@/lib/booking/deposit";

const schema = z
  .object({
    id: z.string().optional().default(""),
    size: z.enum(DOG_SIZES),
    name: f.req("Име", 120),
    description: f.text(500),
    duration_min: f.int("Мин. продължителност", 5, 600),
    duration_max: f.int("Макс. продължителност", 5, 600),
    price_from: f.money("Цена от"),
    price_to: f.money("Цена до"),
    sort_order: f.int("Ред", -100000),
    is_addon: f.bool(),
    addon_allowed: f.bool(),
    is_active: f.bool(),
    group_name: z.enum(SERVICE_GROUPS),
    includes: f.text(1000),
    breeds: f.text(300),
    deposit: f.optMoney(),
  })
  .refine((d) => d.duration_max >= d.duration_min, { message: "Максималната продължителност трябва да е ≥ минималната." })
  .refine((d) => d.price_to >= d.price_from, { message: "„Цена до“ трябва да е ≥ „Цена от“." });

export const saveService = adminAction(schema, async (d) => {
  const { id, ...rest } = d;
  const settings = await getSettings();
  // Празно капаро → по правилото (кръгла сума при диапазон)
  const row = { ...rest, deposit: rest.deposit ?? suggestDeposit(rest.price_from, rest.price_to, Number(settings.deposit_percent) || 50) };
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
