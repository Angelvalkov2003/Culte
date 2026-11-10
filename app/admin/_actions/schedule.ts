"use server";

import { z } from "zod";
import { adminAction, f } from "@/lib/admin/action";
import { db } from "@/lib/supabase/admin";
import { sofiaToDate } from "@/lib/time";

const time = z.string().regex(/^\d{2}:\d{2}$/, "Невалиден час.");

const hoursSchema = z.object(
  Object.fromEntries(
    [0, 1, 2, 3, 4, 5, 6].flatMap((d) => [
      [`open_${d}`, time],
      [`close_${d}`, time],
      [`closed_${d}`, f.bool()],
    ]),
  ) as Record<string, z.ZodType>,
);

export const saveHours = adminAction(hoursSchema, async (d) => {
  const data = d as Record<string, string | boolean>;
  const rows = [0, 1, 2, 3, 4, 5, 6].map((w) => ({
    weekday: w,
    open_time: data[`open_${w}`] as string,
    close_time: data[`close_${w}`] as string,
    is_closed: data[`closed_${w}`] as boolean,
  }));
  for (const r of rows) {
    if (!r.is_closed && r.close_time <= r.open_time) throw new Error("Краят на работния ден трябва да е след началото.");
  }
  const { error } = await db().from("business_hours").upsert(rows, { onConflict: "weekday" });
  if (error) throw new Error(error.message);
  return "Работното време е запазено.";
}, ["/"]);

const blockedSchema = z.object({
  id: z.string().optional().default(""),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Изберете начална дата."),
  start_time: time.default("00:00"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Изберете крайна дата."),
  end_time: time.default("23:59"),
  reason: f.text(200),
});

export const saveBlocked = adminAction(blockedSchema, async (d) => {
  const start = sofiaToDate(d.start_date, d.start_time);
  const end = sofiaToDate(d.end_date, d.end_time);
  if (end <= start) throw new Error("Краят трябва да е след началото.");
  const row = { start_at: start.toISOString(), end_at: end.toISOString(), reason: d.reason };
  const q = d.id ? db().from("blocked_periods").update(row).eq("id", d.id) : db().from("blocked_periods").insert(row);
  const { error } = await q;
  if (error) throw new Error(error.message);
  return d.id ? "Периодът е запазен." : "Периодът е блокиран.";
}, ["/admin"]);

export const deleteBlocked = adminAction(z.object({ id: f.uuid() }), async ({ id }) => {
  const { error } = await db().from("blocked_periods").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return "Периодът е премахнат.";
}, ["/admin"]);
