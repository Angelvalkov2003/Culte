"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";

type Img = { src: string; alt: string };

/**
 * Плъзгач „преди / след“: снимката „след“ е отдолу, „преди“ е отгоре и се изрязва до позицията на дръжката.
 * Влачи се с мишка/пръст навсякъде по снимката; достъпен е и с клавиатура (скрит range input).
 * При първо появяване на екрана дръжката прави едно кратко „махване“, за да подскаже, че се мърда.
 */
export function BeforeAfter({ before, after, className }: { before: Img; after: Img; className?: string }) {
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [hinting, setHinting] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const fromClientX = (x: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)));
  };

  useEffect(() => {
    const el = box.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timers: number[] = [];
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        setHinting(true);
        const steps: [number, number][] = [
          [250, 28],
          [1050, 72],
          [1850, 50],
          [2650, -1],
        ];
        timers = steps.map(([t, p]) => window.setTimeout(() => (p < 0 ? setHinting(false) : setPos(p)), t));
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div
      ref={box}
      className={cn("relative aspect-[3/4] touch-pan-y select-none overflow-hidden rounded-lg bg-sand", dragging ? "cursor-grabbing" : "cursor-ew-resize", className)}
      onPointerDown={(e) => {
        setHinting(false);
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        fromClientX(e.clientX);
      }}
      onPointerMove={(e) => dragging && fromClientX(e.clientX)}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
    >
      <Image src={after.src} alt={after.alt} fill sizes="(min-width: 768px) 520px, 100vw" className="object-cover" draggable={false} />
      <div
        className={cn("absolute inset-0", !dragging && hinting && "transition-[clip-path] duration-700 ease-[cubic-bezier(0.65,0,0.2,1)]")}
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <Image src={before.src} alt={before.alt} fill sizes="(min-width: 768px) 520px, 100vw" className="object-cover" draggable={false} priority />
      </div>

      <span className="pointer-events-none absolute top-4 left-4 rounded-md bg-espresso/75 px-2.5 py-1 text-[11px] font-medium tracking-[0.2em] text-cream uppercase">
        Преди
      </span>
      <span className="pointer-events-none absolute top-4 right-4 rounded-md bg-cream/90 px-2.5 py-1 text-[11px] font-medium tracking-[0.2em] text-espresso uppercase">
        След
      </span>

      {/* Дръжката */}
      <div
        aria-hidden
        className={cn("pointer-events-none absolute inset-y-0 w-0", !dragging && hinting && "transition-[left] duration-700 ease-[cubic-bezier(0.65,0,0.2,1)]")}
        style={{ left: `${pos}%` }}
      >
        <span className="absolute inset-y-0 -left-px w-0.5 bg-cream shadow-[0_0_10px_rgba(0,0,0,0.25)]" />
        <span
          className={cn(
            "absolute top-1/2 left-0 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-gold bg-cream text-espresso shadow-[0_6px_18px_rgba(0,0,0,0.18)] transition-transform duration-300",
            dragging && "scale-110",
          )}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />
          </svg>
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(pos)}
        onChange={(e) => {
          setHinting(false);
          setPos(Number(e.target.value));
        }}
        aria-label="Плъзнете, за да сравните преди и след"
        className="peer sr-only"
      />
      <span className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-espresso ring-offset-2 opacity-0 peer-focus-visible:opacity-100" />
    </div>
  );
}
