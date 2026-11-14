"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/format";

type Item = { href: string; label: string };

/** Кои пътища маркират даден линк като активен (напр. продукт/количка → „Магазин“). */
const SECTIONS: Record<string, string[]> = {
  "/shop": ["/shop", "/products", "/cart", "/checkout"],
};

function isActive(pathname: string, href: string) {
  return (SECTIONS[href] ?? [href]).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Основна навигация на компютър: серифен шрифт, златна линия при hover, маркер за текущата страница. */
export function DesktopNav({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Основна навигация" className="hidden lg:block">
      <ul className="flex items-center gap-2 xl:gap-4">
        {items.map((item, i) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex items-center gap-2 xl:gap-4">
              {i > 0 && <span aria-hidden className="size-1 rotate-45 bg-gold/50" />}
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative inline-flex flex-col items-center px-2 py-2 font-serif text-[21px] leading-none font-medium tracking-[0.01em] transition-colors xl:text-[23px]",
                  active ? "text-terracotta" : "text-espresso hover:text-gold",
                )}
              >
                {item.label}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-2 bottom-0 h-px origin-center bg-gold transition-transform duration-300 ease-out",
                    active ? "scale-x-100 bg-terracotta" : "scale-x-0 group-hover:scale-x-100",
                  )}
                />
                <span
                  aria-hidden
                  className={cn(
                    "absolute -bottom-[3px] left-1/2 size-[7px] -translate-x-1/2 rotate-45 bg-terracotta transition-opacity duration-300",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** „Запази час“ — CTA със стрелка, която се плъзга при hover; активна на /booking. */
export function BookingCta() {
  const active = usePathname().startsWith("/booking");
  return (
    <Link
      href="/booking"
      aria-current={active ? "page" : undefined}
      className={cn(
        "group inline-flex h-11 items-center gap-2.5 rounded-md border px-5 text-[13px] font-semibold tracking-[0.14em] uppercase transition-colors",
        active
          ? "border-espresso bg-espresso text-cream"
          : "border-terracotta bg-terracotta text-cream hover:border-espresso hover:bg-espresso",
      )}
    >
      Запази час
      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.8} aria-hidden />
    </Link>
  );
}
