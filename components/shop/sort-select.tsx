"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/format";

type Option = { value: string; label: string };

/** Падащо меню за подреждане — при избор веднага прилага формата. */
export function SortSelect({ name, options, defaultValue, label }: { name: string; options: Option[]; defaultValue: string; label: string }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(() => Math.max(0, options.findIndex((o) => o.value === defaultValue)));
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const choose = (i: number) => {
    const next = options[i].value;
    setOpen(false);
    button.current?.focus();
    if (next === value) return;
    setValue(next);
    if (input.current) input.current.value = next;
    input.current?.form?.requestSubmit();
  };

  const toggle = () => {
    setFocus(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen((v) => !v);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      button.current?.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return toggle();
      setFocus((f) => (f + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    } else if ((e.key === "Enter" || e.key === " ") && open) {
      e.preventDefault();
      choose(focus);
    } else if (e.key === "Tab" && open) {
      setOpen(false);
    }
  };

  return (
    <div ref={root} className="relative" onKeyDown={onKey}>
      <p id={`${id}-label`} className="text-sm font-medium">
        {label}
      </p>
      <input ref={input} type="hidden" name={name} defaultValue={defaultValue} />
      <button
        ref={button}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        className={cn(
          "mt-2 flex h-11 w-full items-center justify-between gap-3 rounded-md border bg-cream px-3.5 text-left text-[15px] transition-colors duration-300",
          open ? "border-espresso" : "border-line hover:border-espresso/40",
        )}
      >
        <span id={`${id}-value`}>{current.label}</span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className={cn("size-4 shrink-0 text-espresso-soft transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 8 5 5 5-5" />
        </svg>
      </button>

      <ul
        role="listbox"
        aria-labelledby={`${id}-label`}
        className={cn(
          "absolute inset-x-0 top-full z-20 mt-1.5 origin-top overflow-hidden rounded-md border border-line bg-cream p-1 shadow-[0_18px_40px_rgba(18,18,18,0.14)] transition-[opacity,scale,translate,visibility] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          open ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-1 scale-[0.97] opacity-0",
        )}
      >
        {options.map((o, i) => {
          const selected = o.value === value;
          return (
            <li
              key={o.value}
              id={`${id}-${i}`}
              role="option"
              aria-selected={selected}
              onPointerEnter={() => setFocus(i)}
              onClick={() => choose(i)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-[4px] px-3 py-2.5 text-[15px] transition-colors duration-200",
                focus === i ? "bg-sand" : "bg-transparent",
                selected ? "font-medium text-espresso" : "text-espresso-soft",
              )}
            >
              {o.label}
              <svg aria-hidden viewBox="0 0 20 20" className={cn("size-4 text-terracotta", !selected && "invisible")} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m4.5 10.5 3.5 3.5 7.5-8" />
              </svg>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
