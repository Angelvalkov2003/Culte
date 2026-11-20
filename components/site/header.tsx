import Image from "next/image";
import Link from "next/link";
import { cartCount } from "@/lib/shop/cart";
import { getSettings } from "@/lib/settings";
import { DesktopNav, BookingCta } from "@/components/site/desktop-nav";
import { MobileMenu } from "@/components/site/mobile-menu";
import { CartLink } from "@/components/site/cart-link";

export const NAV = [
  { href: "/grooming", label: "Груминг" },
  { href: "/gallery", label: "Галерия" },
  { href: "/shop", label: "Магазин" },
  { href: "/about", label: "За нас" },
  { href: "/contact", label: "Контакти" },
];

export async function Header() {
  const [count, s] = await Promise.all([cartCount(), getSettings()]);
  return (
    <header className="sticky top-0 z-[55] border-b border-line bg-cream/95 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-md focus:bg-espresso focus:px-3 focus:py-2 focus:text-cream"
      >
        Към съдържанието
      </a>
      <div className="container-page flex h-[72px] items-center justify-between gap-6 lg:h-[96px]">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Culte — начало">
          <Image src="/logo-nobg.png" alt="Culte" width={612} height={179} priority className="h-10 w-auto lg:h-[72px]" />
        </Link>

        <DesktopNav items={NAV} />

        <div className="flex items-center gap-2 sm:gap-3">
          <CartLink count={count} />
          <span className="hidden lg:block">
            <BookingCta />
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
