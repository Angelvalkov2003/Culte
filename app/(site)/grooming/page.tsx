import type { Metadata } from "next";
import { getActiveServices } from "@/lib/booking/services";
import { getBusinessHours, getSettings, groupHours } from "@/lib/settings";
import { formatDuration, formatRange } from "@/lib/format";
import { SIZE_LABEL, type DogSize } from "@/lib/types";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Груминг салон в Пловдив — услуги и цени",
  description:
    "Цялостен груминг, подстригване, къпане, спа баня и зъбна хигиена за малки, средни и големи породи. Цени и продължителност.",
  alternates: { canonical: "/grooming" },
};

export default async function GroomingPage() {
  const [services, s, hours] = await Promise.all([getActiveServices(), getSettings(), getBusinessHours()]);
  const sizes: DogSize[] = ["small", "medium", "large"];

  return (
    <div className="container-page pt-12">
      <header className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-7">
          <h1 className="text-[clamp(2.6rem,6vw,4.4rem)]">Груминг, който кучето ви ще понесе спокойно</h1>
          <p className="prose-culte mt-6">
            {s.team.join(" и ")} работят с всяко куче поотделно, с козметика {s.cosmetics.join(" и ")}. Преди да започнем,
            питаме за навиците и чувствителните места, а след това подстригваме по породата и по начина ви на живот.
          </p>
          <ButtonLink href="/booking" size="lg" className="mt-8">
            Запази час
          </ButtonLink>
        </div>
        <dl className="space-y-2 self-end text-[15px] md:col-span-4 md:col-start-9">
          {groupHours(hours).map((h) => (
            <div key={h.label} className="flex justify-between gap-4 border-b border-line py-2">
              <dt className="text-espresso-soft">{h.label}</dt>
              <dd className="tabular-nums">{h.value}</dd>
            </div>
          ))}
          <p className="pt-3 text-espresso-soft">{s.address}</p>
        </dl>
      </header>

      <div className="mt-20 space-y-20">
        {sizes.map((size) => {
          const list = services.filter((x) => x.size === size);
          if (!list.length) return null;
          return (
            <section key={size} aria-labelledby={`size-${size}`} className="grid gap-6 md:grid-cols-12">
              <h2 id={`size-${size}`} className="text-4xl md:col-span-3">
                {SIZE_LABEL[size]}
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
                  <tbody>
                    {list.map((x) => (
                      <tr key={x.id} className="border-b border-line align-top">
                        <td className="py-3.5 pr-4">
                          <span className="font-medium">{x.name}</span>
                          {x.description && <span className="mt-0.5 block text-sm text-espresso-soft">{x.description}</span>}
                          <span className="mt-0.5 block text-sm text-espresso-soft sm:hidden">
                            {formatDuration(x.duration_min, x.duration_max)}
                          </span>
                        </td>
                        <td className="hidden py-3.5 pr-4 whitespace-nowrap text-espresso-soft sm:table-cell">
                          {formatDuration(x.duration_min, x.duration_max)}
                        </td>
                        <td className="py-3.5 text-right whitespace-nowrap tabular-nums">
                          {formatRange(x.price_from, x.price_to)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-12 max-w-2xl text-sm leading-6 text-espresso-soft">
        Цените са ориентировъчни. Крайната цена зависи от състоянието на козината и се уточнява в салона. При онлайн
        записване се плаща капаро {s.deposit_percent}% от началната цена.
      </p>
    </div>
  );
}
