"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addToCart } from "@/app/(site)/cart/actions";
import { Button } from "@/components/ui/button";

export function AddToCart({ productId, stock }: { productId: string; stock: number }) {
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  if (stock <= 0) {
    return (
      <Button type="button" disabled size="lg" className="w-full">
        Изчерпан
      </Button>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <div className="flex h-13 items-center rounded-md border border-line" role="group" aria-label="Количество">
          <button type="button" className="h-full w-11 text-lg disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1} aria-label="Намали">
            −
          </button>
          <span className="w-8 text-center tabular-nums" aria-live="polite">{qty}</span>
          <button type="button" className="h-full w-11 text-lg disabled:opacity-30" onClick={() => setQty((q) => Math.min(stock, q + 1))}
            disabled={qty >= stock} aria-label="Увеличи">
            +
          </button>
        </div>
        <Button
          type="button"
          size="lg"
          className="min-w-48 flex-1"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await addToCart(productId, qty);
              setMsg(r.ok ? { ok: true, text: "Добавено в количката." } : { ok: false, text: r.error });
            })
          }
        >
          {pending ? "Добавяме…" : "Добави в количката"}
        </Button>
      </div>
      <p role="status" className={`mt-3 min-h-6 text-sm ${msg?.ok ? "text-olive" : "text-danger"}`}>
        {msg?.text}
        {msg?.ok && (
          <>
            {" "}
            <Link href="/cart" className="link-underline text-espresso">
              Към количката
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
