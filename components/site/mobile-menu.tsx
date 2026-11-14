"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Mail, Menu, Phone, X } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/site/social-icons";
import { cn } from "@/lib/format";

export type MobileMenuContacts = {
  phone: string;
  email: string;
  instagram: string;
  facebook: string;
  tiktok: string;
};

/** Мобилно меню: чекмедже отдясно (2/3 от екрана), замъглен фон зад него. */
const NO_CONTACTS: MobileMenuContacts = { phone: "", email: "", instagram: "", facebook: "", tiktok: "" };

export function MobileMenu({
  items,
  contacts = NO_CONTACTS,
}: {
  items: { href: string; label: string }[];
  contacts?: MobileMenuContacts;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  if (pathname !== lastPath) {
    setLastPath(pathname);
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

  type ContactLink = { href: string; label: string; icon: ReactNode; external?: boolean };
  const icons = ([
    contacts.phone && { href: `tel:${contacts.phone.replace(/\s+/g, "")}`, label: `Обадете се: ${contacts.phone}`, icon: <Phone className="size-[18px]" strokeWidth={1.6} /> },
    contacts.email && { href: `mailto:${contacts.email}`, label: `Имейл: ${contacts.email}`, icon: <Mail className="size-[18px]" strokeWidth={1.6} /> },
    contacts.instagram && { href: contacts.instagram, label: "Instagram", icon: <InstagramIcon className="size-[18px]" />, external: true },
    contacts.facebook && { href: contacts.facebook, label: "Facebook", icon: <FacebookIcon className="size-[18px]" />, external: true },
    contacts.tiktok && { href: contacts.tiktok, label: "TikTok", icon: <TikTokIcon className="size-[18px]" />, external: true },
  ] as (ContactLink | "" | false)[]).filter((x): x is ContactLink => Boolean(x));

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label="Отвори менюто"
        className="rounded-md p-2 text-espresso hover:bg-sand"
      >
        <Menu size={22} strokeWidth={1.5} />
      </button>

      {/* Замъглен фон */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-[60] bg-espresso/30 backdrop-blur-md transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Чекмедже */}
      <div
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Меню"
        inert={!open}
        className={cn(
          "pattern pattern-bones pattern-light fixed inset-y-0 right-0 z-[60] flex w-2/3 min-w-[240px] max-w-sm flex-col overflow-y-auto bg-espresso text-cream shadow-[-24px_0_60px_rgba(46,35,28,0.35)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Тънка терракотена линия по левия ръб */}
        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-terracotta" />

        <div className="flex items-center justify-between px-6 pt-5">
          <Image src="/logo-nobg.png" alt="Culte" width={612} height={179} className="h-11 w-auto" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Затвори менюто"
            className="inline-flex size-10 items-center justify-center rounded-full border border-cream/20 text-cream transition-colors hover:border-cream/60 hover:bg-cream/10"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <nav aria-label="Мобилна навигация" className="mt-10 px-6">
          <ul className="space-y-1">
            {items.map((item, i) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li
                  key={item.href}
                  className={cn("transition-[opacity,translate] duration-500 ease-out", open ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0")}
                  style={{ transitionDelay: open ? `${120 + i * 60}ms` : "0ms" }}
                >
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="group flex items-baseline gap-3 py-2.5"
                  >
                    <span className="w-6 font-sans text-xs text-clay tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <span
                      className={cn(
                        "font-serif text-[2.1rem] leading-none transition-colors",
                        active ? "text-clay" : "text-cream group-hover:text-clay",
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div
          className={cn("mt-auto px-6 pt-10 pb-8 transition-opacity duration-500", open ? "opacity-100" : "opacity-0")}
          style={{ transitionDelay: open ? `${160 + items.length * 60}ms` : "0ms" }}
        >
          <Link href="/booking" className={buttonClass("primary", "lg", "w-full")}>
            Запази час
          </Link>
          {icons.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Връзка с нас">
              {icons.map((x) => (
                <li key={x.label}>
                  <a
                    href={x.href}
                    aria-label={x.label}
                    title={x.label}
                    {...(x.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="inline-flex size-10 items-center justify-center rounded-full border border-cream/20 text-cream/90 transition-colors hover:border-clay hover:bg-clay hover:text-espresso"
                  >
                    {x.icon}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {contacts.phone && (
            <a href={`tel:${contacts.phone.replace(/\s+/g, "")}`} className="mt-5 block font-serif text-2xl text-cream/90">
              {contacts.phone}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
