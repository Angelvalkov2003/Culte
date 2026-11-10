import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { bg } from "date-fns/locale";

export const TZ = "Europe/Sofia";

/** "2026-11-12" + "09:30" (местно време в София) → Date (UTC момент) */
export function sofiaToDate(date: string, time: string): Date {
  return fromZonedTime(`${date}T${time.length === 5 ? `${time}:00` : time}`, TZ);
}

/** Днешната дата в София като "yyyy-MM-dd" */
export function todaySofia(now = new Date()): string {
  return formatInTimeZone(now, TZ, "yyyy-MM-dd");
}

/** Ден от седмицата (0 = неделя) за дата "yyyy-MM-dd" */
export function weekdayOf(date: string): number {
  return toZonedTime(sofiaToDate(date, "12:00"), TZ).getDay();
}

export function addDaysISO(date: string, days: number): string {
  const d = sofiaToDate(date, "12:00");
  d.setUTCDate(d.getUTCDate() + days);
  return formatInTimeZone(d, TZ, "yyyy-MM-dd");
}

export function fmt(d: Date | string, pattern: string): string {
  return formatInTimeZone(typeof d === "string" ? new Date(d) : d, TZ, pattern, { locale: bg });
}

/** "четвъртък, 12 ноември 2026" */
export function formatLongDate(d: Date | string): string {
  return fmt(d, "EEEE, d MMMM yyyy");
}

export function formatTime(d: Date | string): string {
  return fmt(d, "HH:mm");
}

export function formatDateTime(d: Date | string): string {
  return fmt(d, "d MMMM yyyy, HH:mm");
}

export function isValidISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T12:00:00Z`).getTime());
}

/** Понеделник на седмицата, в която е дадената дата */
export function mondayOf(date: string): string {
  const wd = weekdayOf(date);
  return addDaysISO(date, wd === 0 ? -6 : 1 - wd);
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** ISO момент преди N дни (за филтри в заявки) */
export function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}
