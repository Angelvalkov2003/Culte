"use client";

import { useState, useTransition } from "react";
import { removeFromCart, setCartQuantity } from "@/app/(site)/cart/actions";

export function CartLineControls({ productId, quantity, stock }: { productId: string; quantity: number; stock: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = (q: number) =>
    start(async () => {
      const r = await setCartQuantity(productId, q);
      setError(r.ok ? null : r.error);
    });

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex items-center gap-3">
        <div className="flex h-9 items-center rounded-md border border-line" role="group" aria-label="Количество" aria-busy={pending}>
          <button type="button" className="h-full w-9 disabled:opacity-30" disabled={pending || quantity <= 1}
            onClick={() => set(quantity - 1)} aria-label="Намали">
            −
          </button>
          <span className="w-7 text-center text-sm tabular-nums">{quantity}</span>
          <button type="button" className="h-full w-9 disabled:opacity-30" disabled={pending || quantity >= stock}
            onClick={() => set(quantity + 1)} aria-label="Увеличи">
            +
          </button>
        </div>
        <button type="button" className="text-sm text-espresso-soft underline-offset-4 hover:text-danger hover:underline"
          disabled={pending} onClick={() => start(() => removeFromCart(productId))}>
          Премахни
        </button>
      </div>
      {quantity >= stock && <p className="text-xs text-espresso-soft">Максимум в наличност</p>}
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}
