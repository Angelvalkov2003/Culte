"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/format";

/** На мобилен филтрите са скрити зад бутон и се спускат с анимация; на десктоп винаги видими. */
export function FiltersToggle({ children, active }: { children: ReactNode; active: boolean }) {
  const [open, setOpen] = useState(false);
  // След като панелът се отвори докрай, махаме overflow-hidden, за да не се реже падащото меню.
  const [settled, setSettled] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setSettled(false);
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-controls="shop-filters"
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-md border px-4 text-[15px] transition-colors duration-300 lg:hidden",
          open ? "border-espresso bg-espresso text-cream" : "border-line bg-cream text-espresso",
        )}
      >
        <span className="flex items-center gap-3">
          <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3 5h14M6 10h8M8.5 15h3" />
          </svg>
          Филтри и търсене
          {active && <span className={cn("size-1.5 rounded-full", open ? "bg-gold" : "bg-terracotta")} aria-label="(активни)" />}
        </span>
        <span aria-hidden="true" className="relative size-3.5">
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
          <span
            className={cn(
              "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
              open && "rotate-90 scale-y-0",
            )}
          />
        </span>
      </button>
      <div
        id="shop-filters"
        onTransitionEnd={(e) => e.target === e.currentTarget && setSettled(open)}
        className={cn(
          "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] lg:grid-rows-[1fr]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className={cn("min-h-0 lg:overflow-visible", open && settled ? "overflow-visible" : "overflow-hidden")}>
          <div
            className={cn(
              "pt-6 transition-[opacity,translate,visibility] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] lg:visible lg:translate-y-0 lg:pt-0 lg:opacity-100",
              open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-4 opacity-0",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
