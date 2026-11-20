"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

const PATTERNS = ["pattern-bones", "pattern-scatter", "pattern-grid"] as const;

/** Детерминиран „рандъм“ (mulberry32) — еднакъв на сървъра и в браузъра, различен за всяка страница. */
function rng(seed: string) {
  let a = 0;
  for (let i = 0; i < seed.length; i++) a = (Math.imul(a ^ seed.charCodeAt(i), 2654435761) + i) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Бледи петна с лапички на случайни места по страницата (зад съдържанието).
 * Стоят под фона на цветните секции, така че се виждат само по бялото.
 * Родителят (main) е relative + isolate + overflow-x-clip.
 */
export function PawScatter() {
  const pathname = usePathname();
  const r = rng(pathname || "/");
  const count = 5 + Math.floor(r() * 3);

  const spots = Array.from({ length: count }, (_, i) => {
    const band = 100 / count;
    const top = band * i + band * (0.15 + r() * 0.7);
    const side = (i + Math.floor(r() * 2)) % 2 === 0 ? "left" : "right";
    return {
      top,
      side,
      offset: -8 + r() * 26, // % от ширината; отрицателно = леко извън ръба
      size: 240 + Math.round(r() * 220),
      rotate: Math.round(r() * 50 - 25),
      pattern: PATTERNS[Math.floor(r() * PATTERNS.length)],
      opacity: 0.045 + r() * 0.03,
    };
  });

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {spots.map((s, i) => (
        <span
          key={i}
          className={cn("paw-patch", s.pattern)}
          style={{
            top: `${s.top}%`,
            [s.side]: `${s.offset}%`,
            width: s.size,
            height: s.size,
            rotate: `${s.rotate}deg`,
            opacity: s.opacity,
          }}
        />
      ))}
    </div>
  );
}
