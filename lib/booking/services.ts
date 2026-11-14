import "server-only";
import { hasSupabase } from "@/lib/env";
import { publicDb } from "@/lib/supabase/public";
import { round2 } from "@/lib/format";
import { serviceDeposit } from "@/lib/booking/deposit";
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
  // Стойности по подразбиране, ако базата е със стара схема
  return (data ?? []).map((s) => ({ group_name: "weight", includes: "", breeds: "", addon_allowed: false, deposit: null, ...s }));
}

export interface Quote {
  main: Service;
  addons: Service[];
  durationMin: number;
  totalFrom: number;
  totalTo: number;
  deposit: number;
}

/** Продължителност = сума от максималните; капаро = сума от капарата на услугите. */
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
    deposit: round2(all.reduce((s, x) => s + serviceDeposit(x, depositPercent), 0)),
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
  if (addons.some((a) => !a || a.size !== size || a.id === mainId || !(a.is_addon || a.addon_allowed))) return null;
  return { main, addons: addons as Service[] };
}
