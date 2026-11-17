"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/format";

/** Иконка на количката с брояч; при увеличение броячът „подскача“ и излита +N. */
export function CartLink({ count }: { count: number }) {
  const [prev, setPrev] = useState(count);
  const [bump, setBump] = useState<{ n: number; key: number } | null>(null);

  if (count !== prev) {
    setPrev(count);
    if (count > prev) setBump({ n: count - prev, key: (bump?.key ?? 0) + 1 });
  }

  return (
    <Link
      href="/cart"
      className="group relative inline-flex size-11 items-center justify-center rounded-md text-espresso/85 transition-colors hover:bg-sand hover:text-espresso"
      aria-label={`Количка, ${count} ${count === 1 ? "продукт" : "продукта"}`}
    >
      <ShoppingCart key={`icon-${bump?.key ?? 0}`} className={cn("size-[22px]", bump && "animate-cart-shake")} strokeWidth={1.6} aria-hidden />
      {count > 0 && (
        <span
          key={`badge-${bump?.key ?? 0}`}
          className={cn(
            "absolute top-0.5 right-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-espresso px-1 text-[11px] leading-none font-semibold text-cream tabular-nums",
            bump && "animate-cart-pop",
          )}
          aria-hidden
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
      {bump && (
        <span
          key={`plus-${bump.key}`}
          className="pointer-events-none absolute -top-1 right-0 animate-cart-float text-xs font-semibold text-terracotta"
          aria-hidden
        >
          +{bump.n}
        </span>
      )}
    </Link>
  );
}
