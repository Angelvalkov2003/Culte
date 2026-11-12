import Image from "next/image";
import Link from "next/link";
import { cartCount } from "@/lib/shop/cart";
import { getSettings } from "@/lib/settings";
import { buttonClass } from "@/components/ui/button";
import { MobileMenu } from "@/components/site/mobile-menu";
import { CartLink } from "@/components/site/cart-link";

export const NAV = [
  { href: "/grooming", label: "Груминг" },
  { href: "/shop", label: "Магазин" },
  { href: "/about", label: "За нас" },
  { href: "/contact", label: "Контакти" },
];

export async function Header() {
  const [count, s] = await Promise.all([cartCount(), getSettings()]);
  return (
    <header className="sticky top-0 z-[55] border-b border-line/70 bg-cream">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-md focus:bg-espresso focus:px-3 focus:py-2 focus:text-cream"
      >
        Към съдържанието
      </a>
      <div className="container-page flex h-[72px] items-center justify-between gap-6 md:h-[92px]">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Culte — начало">
          <Image src="/logo-nobg.png" alt="Culte" width={610} height={410} priority className="h-12 w-auto md:h-[68px]" />
        </Link>

        <nav aria-label="Основна навигация" className="hidden md:block">
          <ul className="flex items-center gap-8 text-[15px]">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-espresso/85 transition-colors hover:text-terracotta">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <CartLink count={count} />
          <span className="hidden md:block">
            <Link href="/booking" className={buttonClass("primary", "sm")}>
              Запази час
            </Link>
          </span>
          <MobileMenu
            items={NAV}
            contacts={{ phone: s.phone, email: s.company_email, instagram: s.instagram_url, facebook: s.facebook_url, tiktok: s.tiktok_url }}
          />
        </div>
      </div>
    </header>
  );
}
