import Image from "next/image";
import Link from "next/link";
import { companyInfo, getBusinessHours, getSettings, groupHours } from "@/lib/settings";

const LEGAL = [
  { href: "/terms", label: "Общи условия" },
  { href: "/privacy", label: "Поверителност" },
  { href: "/cookies", label: "Бисквитки" },
  { href: "/shipping-returns", label: "Доставка и връщане" },
  { href: "/withdrawal", label: "Отказ от договор" },
];

export async function Footer() {
  const [s, hours] = await Promise.all([getSettings(), getBusinessHours()]);
  const tel = s.phone.replace(/\s+/g, "");
  return (
    <footer className="pattern pattern-bones pattern-gold mt-28 bg-espresso text-cream/70">
      <div className="h-1.5 bg-sand-deep" aria-hidden />
      <div className="container-page grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <Image src="/logo-nobg.png" alt="Culte" width={612} height={179} className="h-16 w-auto brightness-0 invert" />
          <p className="mt-6 max-w-xs font-serif text-2xl leading-snug text-cream">{s.slogan}</p>
        </div>

        <div className="md:col-span-3">
          <h2 className="font-sans text-sm font-semibold text-cream">Салонът</h2>
          <address className="mt-4 space-y-2 text-[15px] not-italic">
            <p>{s.address}</p>
            <p>
              <a href={`tel:${tel}`} className="text-cream transition-colors hover:text-sand-deep">
                {s.phone}
              </a>
            </p>
            <p>
              <a href={s.map_url} target="_blank" rel="noopener noreferrer" className="underline decoration-cream/30 underline-offset-4 hover:decoration-sand-deep">
                Виж на картата
              </a>
            </p>
          </address>
        </div>

        <div className="md:col-span-3">
          <h2 className="font-sans text-sm font-semibold text-cream">Работно време</h2>
          <dl className="mt-4 space-y-2 text-[15px]">
            {groupHours(hours).map((h) => (
              <div key={h.label} className="flex justify-between gap-4">
                <dt>{h.label}</dt>
                <dd className="tabular-nums text-cream/90">{h.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="md:col-span-2">
          <h2 className="font-sans text-sm font-semibold text-cream">Последвайте ни</h2>
          <ul className="mt-4 space-y-2 text-[15px]">
            <li>
              <a href={s.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-sand-deep">
                Instagram
              </a>
            </li>
            <li>
              <a href={s.facebook_url} target="_blank" rel="noopener noreferrer" className="hover:text-sand-deep">
                Facebook
              </a>
            </li>
            <li>
              <a href={s.tiktok_url} target="_blank" rel="noopener noreferrer" className="hover:text-sand-deep">
                TikTok
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/10">
        <div className="container-page flex flex-col gap-4 py-6 text-[13px] text-cream/50 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {companyInfo(s).name}, ЕИК {companyInfo(s).eik}. Culte е търговска марка.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-sand-deep">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
