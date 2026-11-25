import type { Metadata } from "next";
import { getActiveServices } from "@/lib/booking/services";
import { getBusinessHours, getSettings, groupHours, listBG } from "@/lib/settings";
import { formatDuration, formatEUR, formatRange } from "@/lib/format";
import { PET_SIZES, SERVICE_GROUPS, SERVICE_GROUP_LABEL, SHARED_SIZE, SIZE_HINT, SIZE_LABEL, type Service } from "@/lib/types";
import { serviceDeposit } from "@/lib/booking/deposit";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/format";
import { BEFORE_AFTER, CAT_PHOTO, HALLOWEEN_PHOTO } from "@/lib/gallery";
import Image from "next/image";
import Link from "next/link";

const GALLERY_TEASER = [BEFORE_AFTER.before, HALLOWEEN_PHOTO, CAT_PHOTO];

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Груминг салон в Пловдив — услуги и цени",
  description:
    "Породен груминг за пудели, йоркширски териери, ши тцу, померани и др., цялостен груминг по килограми и допълнителни услуги. Цени и продължителност.",
  alternates: { canonical: "/grooming" },
};

export default async function GroomingPage() {
  const [services, s, hours] = await Promise.all([getActiveServices(), getSettings(), getBusinessHours()]);
  // Общата категория + допълнителните услуги по размер (показват се веднъж, с диапазон на цената, ако се различава).
  const extras = [...services.filter((x) => x.size === SHARED_SIZE || x.group_name === "extra").reduce((m, x) => {
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
      <header className="grid items-center gap-14 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-6">
          <p className="animate-rise text-[11px] font-medium tracking-[0.32em] text-terracotta uppercase">Animal House · Груминг салон</p>
          <h1 className="mt-4 animate-rise text-[clamp(2.6rem,5.6vw,4.6rem)] leading-[1.02] text-balance [animation-delay:80ms]">
            Красотата е в детайла.
            <span className="mt-2 block font-normal text-terracotta italic">Грижата — в отношението.</span>
          </h1>
          <p className="mt-6 max-w-[38ch] animate-rise text-[17px] leading-8 text-espresso-soft [animation-delay:160ms]">
            Всяко куче е различно. Затова започваме не с ножицата, а с внимание.
          </p>
          <div className="mt-8 flex animate-rise flex-wrap items-center gap-x-6 gap-y-3 [animation-delay:240ms]">
            <ButtonLink href="/booking" size="lg">
              Запази час
            </ButtonLink>
            <a href="#prices" className="link-underline text-[15px]">
              Услуги и цени
            </a>
          </div>
        </div>

        {/* Снимка + значка Animal House + бележка от грумъра */}
        <div className="animate-rise pb-10 [animation-delay:200ms] md:col-span-6 md:pb-0">
          <div className="relative mx-auto aspect-[4/5] w-[min(86%,420px)] md:mr-6 md:ml-auto">
            <div className="absolute inset-0 overflow-hidden rounded-lg bg-sand">
              <Image
                src={BEFORE_AFTER.after.src}
                alt={BEFORE_AFTER.after.alt}
                fill
                priority
                sizes="(min-width: 768px) 420px, 86vw"
                className="object-cover"
              />
            </div>
            <figure className="pattern pattern-scatter pattern-gold absolute -bottom-10 -left-6 w-[min(78%,270px)] rounded-lg bg-espresso p-5 text-cream shadow-[0_18px_40px_rgba(18,18,18,0.3)] sm:-left-12">
              <blockquote className="font-serif text-[1.35rem] leading-snug italic">„Грижата не е просто услуга. Тя е отношение.“</blockquote>
              <figcaption className="mt-3 text-[11px] font-medium tracking-[0.24em] text-gold uppercase">
                {s.team[0] ?? "Animal House"} · вашият грумър
              </figcaption>
            </figure>
          </div>
        </div>
      </header>

      {/* Три принципа — кратко, вместо дълъг текст */}
      <ul data-reveal className="mt-24 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
        {(
          [
            ["Внимание", "От първото разресване до последния детайл."],
            ["Разбиране", "Всяка стъпка — според козината, кожата и характера."],
            ["Висок клас", `Козметика от ${listBG(s.cosmetics)}.`],
          ] as const
        ).map(([title, text], i) => (
          <li key={title} className="flex items-baseline gap-4 bg-cream p-5 sm:block sm:p-8">
            <span className="font-serif text-lg text-gold lining-nums tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h2 className="text-[1.6rem] sm:mt-2 sm:text-[1.9rem]">{title}</h2>
              <p className="mt-1 text-[15px] leading-6 text-espresso-soft sm:mt-2">{text}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* Работно време и адрес — една лента */}
      <div data-reveal className="mt-4 flex flex-col gap-5 rounded-lg bg-sand p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <dl className="flex flex-wrap gap-x-10 gap-y-3 text-[15px]">
          {groupHours(hours).map((h) => (
            <div key={h.label} className="flex items-baseline gap-3">
              <dt className="text-espresso-soft">{h.label}</dt>
              <dd className="font-medium tabular-nums">{h.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[15px] text-espresso-soft">
          {s.address}.{" "}
          <a href={s.map_url} target="_blank" rel="noopener noreferrer" className="link-underline text-espresso">
            Карта
          </a>
        </p>
      </div>

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

      <div id="prices" className="mt-20 scroll-mt-28 space-y-20">
        {PET_SIZES.map((size) => {
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
            {SIZE_LABEL[SHARED_SIZE]}
            <span className="mt-2 block font-sans text-[15px] font-medium text-espresso-soft">За всеки размер</span>
          </h2>
          <div className="md:col-span-9">
            <table className="w-full text-left text-[15px]">
              <caption className="sr-only">{SIZE_LABEL[SHARED_SIZE]}</caption>
              <tbody>
                {extras.map((x) => <ServiceRow key={x.id} x={x} depositPercent={s.deposit_percent} />)}
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
