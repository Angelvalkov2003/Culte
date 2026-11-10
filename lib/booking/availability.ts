import "server-only";
import { db } from "@/lib/supabase/admin";
import { getBusinessHours, getSettings } from "@/lib/settings";
import { addDaysISO, sofiaToDate, todaySofia } from "@/lib/time";
import { computeSlots, lastBookableDate, type BusyRange, type SlotRules } from "@/lib/booking/slots";

export const STALE_PENDING_MIN = 35;

export async function expireStaleBookings() {
  const { error } = await db().rpc("expire_stale_bookings", { p_minutes: STALE_PENDING_MIN });
  if (error) console.error("expire_stale_bookings", error.message);
}

export async function getRules(): Promise<SlotRules> {
  const s = await getSettings();
  return {
    stepMin: Number(s.slot_step_min) || 30,
    minLeadHours: Number(s.min_lead_hours) || 0,
    maxDaysAhead: Number(s.max_days_ahead) || 60,
  };
}

/** Заети периоди (активни резервации + блокирани) в интервала [from, to). */
export async function getBusy(from: Date, to: Date, excludeBookingId?: string): Promise<BusyRange[]> {
  const staleBefore = new Date(Date.now() - STALE_PENDING_MIN * 60_000).toISOString();
  let bq = db()
    .from("bookings")
    .select("id, start_at, end_at, status, source, created_at")
    .in("status", ["pending_payment", "confirmed"])
    .lt("start_at", to.toISOString())
    .gt("end_at", from.toISOString());
  if (excludeBookingId) bq = bq.neq("id", excludeBookingId);

  const [bookings, blocked] = await Promise.all([
    bq,
    db()
      .from("blocked_periods")
      .select("start_at, end_at")
      .lt("start_at", to.toISOString())
      .gt("end_at", from.toISOString()),
  ]);
  if (bookings.error) throw new Error(bookings.error.message);
  if (blocked.error) throw new Error(blocked.error.message);

  const ranges: BusyRange[] = [];
  for (const b of bookings.data) {
    // Изоставени pending плащания не държат слота
    if (b.status === "pending_payment" && b.source === "online" && b.created_at < staleBefore) continue;
    ranges.push({ start: Date.parse(b.start_at), end: Date.parse(b.end_at) });
  }
  for (const p of blocked.data) ranges.push({ start: Date.parse(p.start_at), end: Date.parse(p.end_at) });
  return ranges;
}

/** Свободни часове за всеки ден от днес до края на прозореца. */
export async function getAvailability(durationMin: number): Promise<{ days: Record<string, string[]>; last: string }> {
  const [hours, rules] = await Promise.all([getBusinessHours(), getRules()]);
  const first = todaySofia();
  const last = lastBookableDate(rules);
  const busy = await getBusy(sofiaToDate(first, "00:00"), sofiaToDate(addDaysISO(last, 1), "00:00"));
  const days: Record<string, string[]> = {};
  for (let d = first; d <= last; d = addDaysISO(d, 1)) {
    const slots = computeSlots({ date: d, durationMin, hours, busy, rules });
    if (slots.length) days[d] = slots;
  }
  return { days, last };
}

export async function isSlotAvailable(date: string, time: string, durationMin: number): Promise<boolean> {
  const [hours, rules] = await Promise.all([getBusinessHours(), getRules()]);
  const busy = await getBusy(sofiaToDate(date, "00:00"), sofiaToDate(addDaysISO(date, 1), "00:00"));
  return computeSlots({ date, durationMin, hours, busy, rules }).includes(time);
}
