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
    <footer className="mt-24 border-t border-line bg-sand-deep text-espresso-soft pattern pattern-bones">
      <div className="container-page grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <Image src="/logo-nobg.png" alt="Culte" width={612} height={179} className="h-20 w-auto" />
          <p className="mt-6 max-w-xs font-serif text-2xl leading-snug text-espresso">{s.slogan}</p>
        </div>

        <div className="md:col-span-3">
          <h2 className="font-sans text-sm font-semibold text-espresso">Салонът</h2>
          <address className="mt-4 space-y-2 text-[15px] not-italic">
            <p>{s.address}</p>
            <p>
              <a href={`tel:${tel}`} className="hover:text-terracotta">
                {s.phone}
              </a>
            </p>
            <p>
              <a href={s.map_url} target="_blank" rel="noopener noreferrer" className="link-underline">
                Виж на картата
              </a>
            </p>
          </address>
        </div>

        <div className="md:col-span-3">
          <h2 className="font-sans text-sm font-semibold text-espresso">Работно време</h2>
          <dl className="mt-4 space-y-2 text-[15px]">
            {groupHours(hours).map((h) => (
              <div key={h.label} className="flex justify-between gap-4">
                <dt>{h.label}</dt>
                <dd className="tabular-nums">{h.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="md:col-span-2">
          <h2 className="font-sans text-sm font-semibold text-espresso">Последвайте ни</h2>
          <ul className="mt-4 space-y-2 text-[15px]">
            <li>
              <a href={s.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-terracotta">
                Instagram
              </a>
            </li>
            <li>
              <a href={s.facebook_url} target="_blank" rel="noopener noreferrer" className="hover:text-terracotta">
                Facebook
              </a>
            </li>
            <li>
              <a href={s.tiktok_url} target="_blank" rel="noopener noreferrer" className="hover:text-terracotta">
                TikTok
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-espresso/10">
        <div className="container-page flex flex-col gap-4 py-6 text-[13px] text-espresso-soft/80 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {companyInfo(s).name}, ЕИК {companyInfo(s).eik}. Culte е търговска марка.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-terracotta">
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
