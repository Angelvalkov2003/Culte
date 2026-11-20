import type { Metadata } from "next";
import { getActiveServices } from "@/lib/booking/services";
import { getBusinessHours, getSettings, groupHours, listBG } from "@/lib/settings";
import { formatDuration, formatEUR, formatRange } from "@/lib/format";
import { DOG_SIZES, EXTRA_FEES, SERVICE_GROUPS, SERVICE_GROUP_LABEL, SIZE_HINT, SIZE_LABEL, type Service } from "@/lib/types";
import { serviceDeposit } from "@/lib/booking/deposit";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/format";
import { BEFORE_AFTER, GALLERY } from "@/lib/gallery";
import Image from "next/image";
import Link from "next/link";

const GALLERY_TEASER = [BEFORE_AFTER.before, BEFORE_AFTER.after, GALLERY[1]];

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Груминг салон в Пловдив — услуги и цени",
  description:
    "Породен груминг за пудели, йоркширски териери, ши тцу, померани и др., цялостен груминг по килограми и допълнителни услуги. Цени и продължителност.",
  alternates: { canonical: "/grooming" },
};

export default async function GroomingPage() {
  const [services, s, hours] = await Promise.all([getActiveServices(), getSettings(), getBusinessHours()]);
  // Допълнителните услуги се повтарят за всеки размер — показваме ги веднъж, с диапазон на цената, ако се различава.
  const extras = [...services.filter((x) => x.group_name === "extra").reduce((m, x) => {
    const prev = m.get(x.name);
    m.set(x.name, prev ? {
      ...prev,
      price_from: Math.min(Number(prev.price_from), Number(x.price_from)),
      price_to: Math.max(Number(prev.price_to), Number(x.price_to)),
    } : x);
    return m;
  }, new Map<string, Service>()).values()];
  
  return (
    <div className="container-page pt-12 pb-8">
      <header className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-7">
          <h1 className="animate-rise text-[clamp(2.4rem,4.6vw,4rem)] leading-[1.05] text-balance">
            Красотата е в детайла.
            <span className="mt-1 block font-normal text-espresso-soft">Грижата – в отношението.</span>
          </h1>

          <p className="mt-8 max-w-[52ch] text-[17px] leading-8 text-espresso">
            Всяко куче е различно. Затова вярваме, че истински добрият груминг започва не с ножицата, а с внимание,
            разбиране и индивидуален подход.
          </p>

          <div className="mt-8 grid max-w-[60ch] gap-5 border-l-2 border-sand-deep pl-5 text-[15px] leading-7 text-espresso-soft sm:pl-6">
            <p>
              Аз съм <span className="font-serif text-[1.35em] leading-none text-espresso italic">Стефани</span> и ще се
              погрижа за Вашия любимец с професионализъм, прецизност и висок клас козметика от{" "}
              <span className="text-espresso">{listBG(s.cosmetics)}</span>.
            </p>
            <p>
              От първото разресване до последния детайл – всяка стъпка е съобразена с нуждите на козината, кожата и
              характера на Вашето куче.
            </p>
          </div>

          <p className="mt-8 max-w-[34ch] font-serif text-[1.6rem] leading-snug text-espresso italic">
            Защото грижата не е просто услуга. Тя е отношение.
          </p>

          <ButtonLink href="/booking" size="lg" className="mt-9">
            Запази час
          </ButtonLink>
        </div>
        <div className="group self-end md:col-span-4 md:col-start-9">
          <Image
            src="/salon-logo.png"
            alt="Animal House — груминг салон"
            width={537}
            height={465}
            priority
            sizes="(min-width: 768px) 400px, 280px"
            className="mx-auto h-auto w-full max-w-[280px] md:mx-0 md:max-w-none"
          />
          <dl className="mt-6 space-y-2 text-[15px]">
            {groupHours(hours).map((h) => (
              <div key={h.label} className="flex justify-between gap-4 border-b border-line py-2">
                <dt className="text-espresso-soft">{h.label}</dt>
                <dd className="tabular-nums">{h.value}</dd>
              </div>
            ))}
            <p className="pt-3 text-espresso-soft">{s.address}</p>
          </dl>
        </div>
      </header>

      {/* Към галерията */}
      <Link
        href="/gallery"
        data-reveal
        className="group mt-20 grid items-center gap-8 overflow-hidden rounded-lg bg-sand p-6 sm:p-10 md:grid-cols-12"
      >
        <div className="md:col-span-5">
          <p className="text-[11px] font-medium tracking-[0.32em] text-terracotta uppercase">Галерия</p>
          <h2 className="mt-3 text-[clamp(2rem,4vw,3rem)]">Преди и след</h2>
          <p className="mt-4 max-w-[36ch] text-[15px] leading-7 text-espresso-soft">
            Вижте кучетата, които минаха през салона — плъзнете и сравнете преди и след.
          </p>
          <span className={buttonClass("primary", "lg", "mt-7")}>
            Към галерията
            <svg aria-hidden viewBox="0 0 20 20" className="size-4 transition-transform duration-500 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 10h12M11 5l5 5-5 5" />
            </svg>
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 md:col-span-7">
          {GALLERY_TEASER.map((p, i) => (
            <div key={p.src} className={cn("relative aspect-[3/4] overflow-hidden rounded-md", i === 1 && "translate-y-4")}>
              <Image
                src={p.src}
                alt={p.alt}
                fill
                sizes="(min-width: 768px) 220px, 30vw"
                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-105"
              />
            </div>
          ))}
        </div>
      </Link>

      <div className="mt-20 space-y-20">
        {DOG_SIZES.map((size) => {
          const list = services.filter((x) => x.size === size && x.group_name !== "extra");
          if (!list.length) return null;
          return (
            <section key={size} data-reveal aria-labelledby={`size-${size}`} className="grid gap-6 md:grid-cols-12">
              <h2 id={`size-${size}`} className="text-4xl md:col-span-3">
                {SIZE_LABEL[size]}
                <span className="mt-2 block font-sans text-[15px] font-medium text-espresso-soft">{SIZE_HINT[size]}</span>
              </h2>
              <div className="md:col-span-9">
                <table className="w-full text-left text-[15px]">
                  <caption className="sr-only">Услуги за {SIZE_LABEL[size].toLowerCase()}</caption>
                  <thead className="text-sm text-espresso-soft">
                    <tr className="border-b border-espresso/20">
                      <th scope="col" className="py-2 pr-4 font-normal">Услуга</th>
                      <th scope="col" className="hidden py-2 pr-4 font-normal sm:table-cell">Време</th>
                      <th scope="col" className="py-2 text-right font-normal">Цена</th>
                    </tr>
                  </thead>
                  {SERVICE_GROUPS.filter((g) => g !== "extra").map((g) => {
                    const rows = list.filter((x) => x.group_name === g);
                    if (!rows.length) return null;
                    return (
                  <tbody key={g}>
                    <tr><th colSpan={3} scope="rowgroup" className="pt-6 pb-1 text-left text-sm font-semibold">{SERVICE_GROUP_LABEL[g]}</th></tr>
                    {rows.map((x) => <ServiceRow key={x.id} x={x} depositPercent={s.deposit_percent} />)}
                  </tbody>
                    );
                  })}
                </table>
              </div>
            </section>
          );
        })}
      </div>

      <section data-reveal aria-labelledby="extras-title" className="mt-20 grid gap-6 md:grid-cols-12">
          <h2 id="extras-title" className="text-4xl md:col-span-3">
            {SERVICE_GROUP_LABEL.extra}
            <span className="mt-2 block font-sans text-[15px] font-medium text-espresso-soft">За всеки размер</span>
          </h2>
          <div className="md:col-span-9">
            <table className="w-full text-left text-[15px]">
              <caption className="sr-only">{SERVICE_GROUP_LABEL.extra}</caption>
              <tbody>
                {extras.map((x) => <ServiceRow key={x.id} x={x} depositPercent={s.deposit_percent} />)}
                {EXTRA_FEES.map((fee) => (
                  <tr key={fee.name} className="border-b border-line align-top">
                    <td className="py-3.5 pr-4">
                      <span className="font-medium">{fee.name}</span>
                      {fee.note && <span className="mt-0.5 block text-sm text-espresso-soft">{fee.note[0].toUpperCase() + fee.note.slice(1)}</span>}
                    </td>
                    <td className="hidden sm:table-cell" />
                    <td className="py-3.5 text-right whitespace-nowrap tabular-nums">{fee.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

    </div>
  );
}

function ServiceRow({ x, depositPercent }: { x: Service; depositPercent: number }) {
  return (
    <tr className="border-b border-line align-top">
      <td className="py-3.5 pr-4">
        <span className="font-medium">{x.name}</span>
        {x.description && <span className="mt-0.5 block text-sm text-espresso-soft">{x.description}</span>}
        {x.includes && <span className="mt-1 block text-sm"><span className="text-espresso-soft">Включва: </span>{x.includes}</span>}
        <span className="mt-0.5 block text-sm text-espresso-soft sm:hidden">{formatDuration(x.duration_min, x.duration_max)}</span>
      </td>
      <td className="hidden py-3.5 pr-4 whitespace-nowrap text-espresso-soft sm:table-cell">
        {formatDuration(x.duration_min, x.duration_max)}
      </td>
      <td className="py-3.5 text-right whitespace-nowrap tabular-nums">
        {formatRange(x.price_from, x.price_to)}
        <span className="block text-xs text-espresso-soft">капаро {formatEUR(serviceDeposit(x, depositPercent))}</span>
      </td>
    </tr>
  );
}
