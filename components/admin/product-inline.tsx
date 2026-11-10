"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setProductActive, setProductStock } from "@/app/admin/_actions/products";
import { cn } from "@/lib/format";

export function InlineActive({ id, active, name }: { id: string; active: boolean; name: string }) {
  const [optimistic, setOptimistic] = useOptimistic(active);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={optimistic}
        aria-label={`Активен: ${name}`}
        onClick={() =>
          start(async () => {
            setOptimistic(!optimistic);
            const r = await setProductActive(id, !optimistic);
            setError(r.ok ? null : (r.message ?? "Грешка"));
          })
        }
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          optimistic ? "bg-olive" : "bg-espresso/20",
        )}
      >
        <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-cream transition-transform", optimistic && "translate-x-5")} />
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

export function InlineStock({ id, stock }: { id: string; stock: number }) {
  const [value, setValue] = useState(String(stock));
  const [saved, setSaved] = useState(stock);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const save = () => {
    const n = Number(value);
    if (n === saved) return;
    start(async () => {
      const r = await setProductStock(id, n);
      if (r.ok) {
        setSaved(n);
        setMsg({ ok: true, text: "Запазено" });
        setTimeout(() => setMsg(null), 1500);
      } else {
        setMsg({ ok: false, text: r.message ?? "Грешка" });
        setValue(String(saved));
      }
    });
  };

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <input
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        aria-label="Бройки"
        disabled={pending}
        className={cn(
          "h-8 w-20 rounded-md border bg-white/70 px-2 text-sm tabular-nums focus:border-terracotta focus:outline-none",
          saved === 0 ? "border-danger/50" : saved <= 3 ? "border-clay" : "border-line",
        )}
      />
      <span className={cn("min-w-4 text-xs", msg?.ok ? "text-success" : "text-danger")} role="status">
        {msg?.text}
      </span>
    </form>
  );
}
