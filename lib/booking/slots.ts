import { addDaysISO, minutesToTime, sofiaToDate, timeToMinutes, todaySofia, weekdayOf } from "@/lib/time";
import type { BusinessHours } from "@/lib/types";

export interface BusyRange {
  start: number; // ms
  end: number; // ms
}

export interface SlotRules {
  stepMin: number;
  minLeadHours: number;
  maxDaysAhead: number;
}

/** Последната дата, за която може да се запише час. */
export function lastBookableDate(rules: SlotRules, now = new Date()): string {
  return addDaysISO(todaySofia(now), rules.maxDaysAhead);
}

/**
 * Свободните начални часове ("HH:mm") за дата в София.
 * Чиста функция — лесна за тест; заетите периоди идват отвън.
 */
export function computeSlots(opts: {
  date: string;
  durationMin: number;
  hours: BusinessHours[];
  busy: BusyRange[];
  rules: SlotRules;
  now?: Date;
}): string[] {
  const { date, durationMin, hours, busy, rules } = opts;
  const now = opts.now ?? new Date();
  if (durationMin <= 0) return [];
  if (date < todaySofia(now) || date > lastBookableDate(rules, now)) return [];

  const day = hours.find((h) => h.weekday === weekdayOf(date));
  if (!day || day.is_closed) return [];

  const open = timeToMinutes(day.open_time);
  const close = timeToMinutes(day.close_time);
  const earliest = now.getTime() + rules.minLeadHours * 3600_000;
  const slots: string[] = [];

  for (let m = open; m + durationMin <= close; m += rules.stepMin) {
    const start = sofiaToDate(date, minutesToTime(m)).getTime();
    const end = start + durationMin * 60_000;
    if (start < earliest) continue;
    if (busy.some((b) => start < b.end && end > b.start)) continue;
    slots.push(minutesToTime(m));
  }
  return slots;
}
