"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

export function MobileMenu({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Затвори менюто" : "Отвори менюто"}
        className="rounded-md p-2 text-espresso hover:bg-sand"
      >
        {open ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
      </button>
      {open && (
        <div id="mobile-nav" className="fixed inset-x-0 top-[72px] bottom-0 z-40 bg-cream">
          <nav aria-label="Мобилна навигация" className="container-page flex h-full flex-col pt-8 pb-10">
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="block py-3 font-serif text-4xl text-espresso">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/booking" className={buttonClass("primary", "lg", "mt-auto w-full")}>
              Запази час за груминг
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
