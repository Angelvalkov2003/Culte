import "server-only";
import { cache } from "react";
import { hasSupabase } from "@/lib/env";
import { publicDb } from "@/lib/supabase/public";
import type { BusinessHours } from "@/lib/types";

export interface SiteSettings {
  business_name: string;
  slogan: string;
  address: string;
  phone: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  map_url: string;
  team: string[];
  cosmetics: string[];
  deposit_percent: number;
  slot_step_min: number;
  min_lead_hours: number;
  max_days_ahead: number;
  hold_minutes: number;
  company_name: string;
  company_eik: string;
  company_vat: string;
  company_address: string;
  company_email: string;
  vat_registered: boolean;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  business_name: "Culte",
  slogan: "Професионализмът се крие в детайлите",
  address: "гр. Пловдив, ж.к. Оазис 3 / ул. Димитър Талев 144",
  phone: "0878 817 088",
  instagram_url: "https://www.instagram.com/groom.animalhouse/",
  facebook_url: "https://www.facebook.com/profile.php?id=61557470280771",
  tiktok_url: "https://www.tiktok.com/@animal.house.groom",
  map_url: "https://www.google.com/maps/search/?api=1&query=Груминг+салон+Animal+House+Пловдив",
  team: ["Стефани"],
  cosmetics: ["CULTE", "Artero", "Hydra"],
  deposit_percent: 50,
  slot_step_min: 30,
  min_lead_hours: 2,
  max_days_ahead: 60,
  hold_minutes: 30,
  company_name: "",
  company_eik: "",
  company_vat: "",
  company_address: "",
  company_email: "",
  vat_registered: true,
};

/** Данни за търговеца с видим маркер, ако още не са попълнени в админ панела. */
export function companyInfo(s: SiteSettings) {
  const v = (x: string, label: string) => x?.trim() || `[${label}]`;
  return {
    name: v(s.company_name, "Наименование на търговеца"),
    eik: v(s.company_eik, "ЕИК"),
    vat: s.company_vat?.trim() || "",
    address: v(s.company_address, "Седалище и адрес на управление"),
    email: v(s.company_email, "имейл за контакт"),
    phone: s.phone,
    salon: s.address,
    vatRegistered: s.vat_registered !== false,
    complete: Boolean(s.company_name?.trim() && s.company_eik?.trim() && s.company_address?.trim() && s.company_email?.trim()),
  };
}

export const DEFAULT_HOURS: BusinessHours[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  is_closed: false,
  open_time: weekday === 0 || weekday === 6 ? "10:00" : "09:00",
  close_time: weekday === 0 || weekday === 6 ? "16:00" : "18:00",
}));

export const getSettings = cache(async (): Promise<SiteSettings> => {
  if (!hasSupabase()) return DEFAULT_SETTINGS;
  const { data, error } = await publicDb().from("settings").select("key, value");
  if (error || !data) {
    console.error("settings", error?.message);
    return DEFAULT_SETTINGS;
  }
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of data) merged[row.key] = row.value;
  return merged as unknown as SiteSettings;
});

export const getBusinessHours = cache(async (): Promise<BusinessHours[]> => {
  if (!hasSupabase()) return DEFAULT_HOURS;
  const { data, error } = await publicDb().from("business_hours").select("*").order("weekday");
  if (error || !data?.length) return DEFAULT_HOURS;
  return data.map((h) => ({ ...h, open_time: h.open_time.slice(0, 5), close_time: h.close_time.slice(0, 5) }));
});

export const WEEKDAY_LABEL = ["Неделя", "Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота"];

/** Групира работното време: "Пон – Пет 09:00 – 18:00" */
export function groupHours(hours: BusinessHours[]): { label: string; value: string }[] {
  const short = ["нед", "пон", "вт", "ср", "чет", "пет", "съб"];
  const order = [1, 2, 3, 4, 5, 6, 0];
  const rows = order.map((d) => hours.find((h) => h.weekday === d)!).filter(Boolean);
  const groups: { from: number; to: number; value: string }[] = [];
  for (const h of rows) {
    const value = h.is_closed ? "почивен ден" : `${h.open_time} – ${h.close_time}`;
    const last = groups[groups.length - 1];
    if (last && last.value === value) last.to = h.weekday;
    else groups.push({ from: h.weekday, to: h.weekday, value });
  }
  return groups.map((g) => ({
    label: g.from === g.to ? cap(short[g.from]) : `${cap(short[g.from])} – ${short[g.to]}`,
    value: g.value,
  }));
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "А, Б и В" — изброяване на български. */
export function listBG(items: string[]): string {
  return new Intl.ListFormat("bg", { type: "conjunction" }).format(items);
}
