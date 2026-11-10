"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";

const WEEK = ["пн", "вт", "ср", "чт", "пт", "сб", "нд"];

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());
}

export function BookingCalendar({
  available,
  last,
  selected,
  onSelect,
  loading,
}: {
  available: Record<string, string[]>;
  last?: string;
  selected: string | null;
  onSelect: (date: string) => void;
  loading?: boolean;
}) {
  const today = todayISO();
  const [ty, tm] = today.split("-").map(Number);
  const [view, setView] = useState({ y: ty, m: tm - 1 });

  const first = new Date(Date.UTC(view.y, view.m, 1));
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const title = new Intl.DateTimeFormat("bg-BG", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  const canPrev = view.y > ty || (view.y === ty && view.m > tm - 1);
  const lastMonth = last ? { y: Number(last.slice(0, 4)), m: Number(last.slice(5, 7)) - 1 } : null;
  const canNext = !lastMonth || view.y < lastMonth.y || (view.y === lastMonth.y && view.m < lastMonth.m);

  const move = (delta: number) =>
    setView(({ y, m }) => {
      const n = m + delta;
      return { y: y + Math.floor(n / 12), m: ((n % 12) + 12) % 12 };
    });

  return (
    <div className={cn(loading && "opacity-50")} aria-busy={loading}>
      <div className="flex items-center justify-between">
        <p className="font-serif text-2xl capitalize" aria-live="polite">
          {title}
        </p>
        <div className="flex gap-1">
          <button type="button" onClick={() => move(-1)} disabled={!canPrev} aria-label="Предишен месец"
            className="rounded-md p-2 hover:bg-sand disabled:opacity-30">
            <ChevronLeft size={18} strokeWidth={1.5} />
          </button>
          <button type="button" onClick={() => move(1)} disabled={!canNext} aria-label="Следващ месец"
            className="rounded-md p-2 hover:bg-sand disabled:opacity-30">
            <ChevronRight size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-espresso-soft" aria-hidden="true">
        {WEEK.map((d) => (
          <span key={d} className="py-1">{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1" role="grid" aria-label={title}>
        {Array.from({ length: offset }).map((_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = iso(view.y, view.m, i + 1);
          const free = (available[d]?.length ?? 0) > 0;
          const isSel = selected === d;
          return (
            <button
              key={d}
              type="button"
              role="gridcell"
              disabled={!free}
              aria-selected={isSel}
              aria-label={`${i + 1} ${title}${free ? `, ${available[d].length} свободни часа` : ", няма свободни часове"}`}
              onClick={() => onSelect(d)}
              className={cn(
                "aspect-square rounded-md text-[15px] tabular-nums transition-colors",
                isSel
                  ? "bg-terracotta text-cream"
                  : free
                    ? "bg-sand text-espresso hover:bg-sand-deep"
                    : "text-espresso/25",
                d === today && !isSel && "ring-1 ring-clay",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
