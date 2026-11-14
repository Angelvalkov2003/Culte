"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/format";

const GROUPS = [
  { title: "Салон", items: [["/admin", "Табло"], ["/admin/calendar", "Календар"], ["/admin/bookings", "Резервации"], ["/admin/services", "Услуги"], ["/admin/hours", "Работно време"], ["/admin/blocked", "Блокирани периоди"]] },
  { title: "Магазин", items: [["/admin/orders", "Поръчки"], ["/admin/products", "Продукти"], ["/admin/categories", "Категории"], ["/admin/shipping", "Доставка"], ["/admin/withdrawals", "Откази"]] },
  { title: "Общи", items: [["/admin/settings", "Настройки"]] },
] satisfies { title: string; items: [href: string, label: string][] }[];

const isActive = (path: string, href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

function Logo() {
  return (
    <Link href="/admin" aria-label="Табло" className="inline-block">
      <Image src="/logo-nobg.png" alt="Culte" width={612} height={179} className="h-10 w-auto" />
    </Link>
  );
}

function NavLinks({ path }: { path: string }) {
  return (
    <nav aria-label="Админ навигация" className="space-y-6 px-3">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="px-3 pb-1.5 text-xs tracking-wide text-espresso-soft uppercase">{g.title}</p>
          <ul className="space-y-0.5">
            {g.items.map(([href, label]) => {
              const active = isActive(path, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative block rounded-md px-3 py-2 text-[15px] transition-colors lg:py-1.5 lg:text-sm",
                      active
                        ? "bg-cream font-medium text-espresso before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-terracotta"
                        : "text-espresso/80 hover:bg-cream/60",
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
    </nav>
  );
}

/** Странична навигация: фиксирана на десктоп, изваждащо се чекмедже на телефон/таблет. */
export function AdminShell({ footer, children }: { footer: ReactNode; children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(path);

  if (path !== lastPath) {
    setLastPath(path);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = GROUPS.flatMap((g) => g.items).find(([href]) => isActive(path, href))?.[1];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      {/* Горна лента на телефон */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-sand px-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex size-10 items-center justify-center rounded-md hover:bg-cream"
          aria-label="Отвори менюто"
          aria-expanded={open}
          aria-controls="admin-drawer"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <span className="truncate text-[15px] font-medium">{current ?? "Админ"}</span>
      </header>

      {/* Чекмедже на телефон */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Меню" id="admin-drawer">
          <button type="button" className="absolute inset-0 bg-espresso/40" aria-label="Затвори менюто" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-[280px] max-w-[85vw] animate-drawer-in flex-col overflow-y-auto bg-sand shadow-xl">
            <div className="flex items-center justify-between px-5 py-4">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex size-10 items-center justify-center rounded-md hover:bg-cream"
                aria-label="Затвори менюто"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <NavLinks path={path} />
            <div className="mt-auto border-t border-line px-6 py-5">{footer}</div>
          </aside>
        </div>
      )}

      {/* Странична лента на десктоп */}
      <aside className="hidden border-r border-line bg-sand lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto">
        <div className="px-6 py-6">
          <Logo />
        </div>
        <NavLinks path={path} />
        <div className="mt-auto px-6 py-6">{footer}</div>
      </aside>

      <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-10">{children}</main>
    </div>
  );
}
