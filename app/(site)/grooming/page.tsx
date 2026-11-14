import type { Metadata } from "next";
import { getActiveServices } from "@/lib/booking/services";
import { getBusinessHours, getSettings, groupHours, listBG } from "@/lib/settings";
import { formatDuration, formatEUR, formatRange } from "@/lib/format";
import { DOG_SIZES, EXTRA_FEES, PRICE_NOTE, SERVICE_GROUPS, SERVICE_GROUP_LABEL, SIZE_HINT, SIZE_LABEL } from "@/lib/types";
import { serviceDeposit } from "@/lib/booking/deposit";
import { ButtonLink } from "@/components/ui/button";
import { PopOut } from "@/components/site/dog-figure";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Груминг салон в Пловдив — услуги и цени",
  description:
    "Породен груминг за пудели, йоркширски териери, ши тцу, померани и др., цялостен груминг по килограми и допълнителни услуги. Цени и продължителност.",
  alternates: { canonical: "/grooming" },
};

export default async function GroomingPage() {
  const [services, s, hours] = await Promise.all([getActiveServices(), getSettings(), getBusinessHours()]);
  
  return (
    <div className="container-page pt-12">
      <header className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-7">
          <h1 className="animate-rise text-[clamp(2.6rem,6vw,4.4rem)]">Груминг, който кучето ви ще понесе спокойно</h1>
          <p className="prose-culte mt-6">
            {listBG(s.team)} {s.team.length > 1 ? "работят" : "работи"} с всяко куче поотделно, с козметика {listBG(s.cosmetics)}. Преди да започнем,
            питаме за навиците и чувствителните места, а след това подстригваме по породата и по начина ви на живот.
          </p>
          <ButtonLink href="/booking" size="lg" className="mt-8">
            Запази час
          </ButtonLink>
        </div>
        <div className="group self-end md:col-span-4 md:col-start-9">
          <PopOut dog="yorkieScissors" tone="clay" priority className="mx-auto max-w-[300px] md:mx-0 md:max-w-none" sizes="(min-width: 768px) 360px, 300px" />
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

      <div className="mt-20 space-y-20">
        {DOG_SIZES.map((size) => {
          const list = services.filter((x) => x.size === size);
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
                  {SERVICE_GROUPS.map((g) => {
                    const rows = list.filter((x) => x.group_name === g);
                    if (!rows.length) return null;
                    return (
                  <tbody key={g}>
                    <tr><th colSpan={3} scope="rowgroup" className="pt-6 pb-1 text-left text-sm font-semibold">{SERVICE_GROUP_LABEL[g]}</th></tr>
                    {rows.map((x) => (
                      <tr key={x.id} className="border-b border-line align-top">
                        <td className="py-3.5 pr-4">
                          <span className="font-medium">{x.name}</span>
                          {x.description && <span className="mt-0.5 block text-sm text-espresso-soft">{x.description}</span>}
                          {x.includes && <span className="mt-1 block text-sm"><span className="text-espresso-soft">Включва: </span>{x.includes}</span>}
                          <span className="mt-0.5 block text-sm text-espresso-soft sm:hidden">
                            {formatDuration(x.duration_min, x.duration_max)}
                          </span>
                        </td>
                        <td className="hidden py-3.5 pr-4 whitespace-nowrap text-espresso-soft sm:table-cell">
                          {formatDuration(x.duration_min, x.duration_max)}
                        </td>
                        <td className="py-3.5 text-right whitespace-nowrap tabular-nums">
                          {formatRange(x.price_from, x.price_to)}
                          <span className="block text-xs text-espresso-soft">капаро {formatEUR(serviceDeposit(x, s.deposit_percent))}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                    );
                  })}
                </table>
              </div>
            </section>
          );
        })}
      </div>

      <section data-reveal aria-labelledby="fees-title" className="mt-20 grid gap-6 md:grid-cols-12">
        <h2 id="fees-title" className="text-4xl md:col-span-3">
          Такси и котки
          <span className="mt-2 block font-sans text-[15px] font-medium text-espresso-soft">Не се записват онлайн</span>
        </h2>
        <ul className="text-[15px] md:col-span-9">
          {EXTRA_FEES.map((f) => (
            <li key={f.name} className="flex items-baseline justify-between gap-4 border-b border-line py-3.5">
              <span>
                <span className="font-medium">{f.name}</span>
                {f.note && <span className="text-espresso-soft"> · {f.note}</span>}
              </span>
              <span className="whitespace-nowrap tabular-nums">{f.price}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-12 max-w-2xl text-sm leading-6 text-espresso-soft">
        {PRICE_NOTE} Телефон: {s.phone}. При онлайн записване се плаща посоченото капаро, остатъкът — в салона.
      </p>
    </div>
  );
}
