"use server";

import { z } from "zod";
import { adminAction, f } from "@/lib/admin/action";
import { db } from "@/lib/supabase/admin";

const list = z.string().transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean));
const url = z.union([z.literal(""), z.url("Невалиден линк.")]);

const schema = z.object({
  business_name: f.req("Име", 80),
  slogan: f.text(200),
  address: f.req("Адрес", 200),
  phone: f.req("Телефон", 40),
  instagram_url: url,
  facebook_url: url,
  tiktok_url: url,
  map_url: url,
  team: list,
  cosmetics: list,
  deposit_percent: f.int("Капаро %", 0, 100),
  slot_step_min: f.int("Стъпка", 5, 120),
  min_lead_hours: f.int("Минимум часове напред", 0, 240),
  max_days_ahead: f.int("Максимум дни напред", 1, 365),
  hold_minutes: f.int("Задържане", 30, 1440),
});

export const saveSettings = adminAction(schema, async (d) => {
  const rows = Object.entries(d).map(([key, value]) => ({ key, value }));
  const { error } = await db().from("settings").upsert(rows, { onConflict: "key", ignoreDuplicates: false });
  if (error) throw new Error(error.message);
  return "Настройките са запазени.";
}, ["/"]);
