"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

const GROUPS = [
  { title: "Салон", items: [["/admin", "Табло"], ["/admin/calendar", "Календар"], ["/admin/bookings", "Резервации"], ["/admin/services", "Услуги"], ["/admin/hours", "Работно време"], ["/admin/blocked", "Блокирани периоди"]] },
  { title: "Магазин", items: [["/admin/orders", "Поръчки"], ["/admin/products", "Продукти"], ["/admin/categories", "Категории"], ["/admin/shipping", "Доставка"]] },
  { title: "Общи", items: [["/admin/settings", "Настройки"]] },
] as const;

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Админ навигация" className="overflow-x-auto px-3 pb-3 lg:overflow-visible lg:px-3 lg:pb-0">
      <div className="flex gap-6 lg:block lg:space-y-6">
        {GROUPS.map((g) => (
          <div key={g.title} className="shrink-0">
            <p className="hidden px-2 pb-1 text-xs text-espresso-soft lg:block">{g.title}</p>
            <ul className="flex gap-1 lg:block lg:space-y-0.5">
              {g.items.map(([href, label]) => {
                const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block rounded-md px-2 py-1.5 text-sm whitespace-nowrap",
                        active ? "bg-cream font-medium text-espresso" : "text-espresso/80 hover:bg-cream/60",
                      )}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
