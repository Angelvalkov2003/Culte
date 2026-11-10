import "server-only";
import { hasSupabase } from "@/lib/env";
import { publicDb } from "@/lib/supabase/public";
import { round2 } from "@/lib/format";
import type { DogSize, Service } from "@/lib/types";

export async function getActiveServices(): Promise<Service[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await publicDb()
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("size")
    .order("sort_order");
  if (error) console.error("services", error.message);
  return data ?? [];
}

export interface Quote {
  main: Service;
  addons: Service[];
  durationMin: number;
  totalFrom: number;
  totalTo: number;
  deposit: number;
}

/** Продължителност = сума от максималните; капаро = % от сумата на началните цени. */
export function quote(main: Service, addons: Service[], depositPercent: number): Quote {
  const all = [main, ...addons];
  const totalFrom = round2(all.reduce((s, x) => s + Number(x.price_from), 0));
  const totalTo = round2(all.reduce((s, x) => s + Number(x.price_to), 0));
  return {
    main,
    addons,
    durationMin: all.reduce((s, x) => s + x.duration_max, 0),
    totalFrom,
    totalTo,
    deposit: round2((totalFrom * depositPercent) / 100),
  };
}

/** Зарежда и валидира избраните услуги от базата (никога не вярва на клиента). */
export async function resolveServices(
  size: DogSize,
  mainId: string,
  addonIds: string[],
): Promise<{ main: Service; addons: Service[] } | null> {
  const ids = [...new Set([mainId, ...addonIds])];
  const { data } = await publicDb().from("services").select("*").in("id", ids).eq("is_active", true);
  const rows = (data ?? []) as Service[];
  const main = rows.find((s) => s.id === mainId);
  if (!main || main.size !== size || main.is_addon) return null;
  const addons = addonIds.map((id) => rows.find((s) => s.id === id));
  if (addons.some((a) => !a || a.size !== size || a.id === mainId)) return null;
  return { main, addons: addons as Service[] };
}
