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

export function DesktopNav({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Основна навигация" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex items-center px-3.5 py-2 text-[15px] font-medium transition-colors",
                  active ? "text-espresso" : "text-espresso-soft hover:text-espresso",
                )}
              >
                {item.label}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-3.5 -bottom-px h-[2px] origin-left bg-gold transition-transform duration-300 ease-out",
                    active ? "scale-x-100" : "scale-x-0",
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

export function BookingCta() {
  const active = usePathname().startsWith("/booking");
  return (
    <Link
      href="/booking"
      aria-current={active ? "page" : undefined}
      className={cn(
        "group inline-flex h-11 items-center gap-2 rounded-md px-5 text-[14px] font-semibold transition-colors",
        active ? "bg-espresso text-cream" : "bg-espresso text-cream hover:bg-espresso/90",
      )}
    >
      Запази час
      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.8} aria-hidden />
    </Link>
  );
}
