"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/format";

/** На мобилен филтрите са скрити зад бутон; на десктоп винаги видими. */
export function FiltersToggle({ children, active }: { children: ReactNode; active: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="shop-filters"
        className="flex h-11 w-full items-center justify-between rounded-md border border-line px-4 text-[15px] lg:hidden"
      >
        <span>Филтри и търсене{active ? " (активни)" : ""}</span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <div id="shop-filters" className={cn("mt-6 lg:mt-0 lg:block", open ? "block" : "hidden")}>
        {children}
      </div>
    </div>
  );
}
