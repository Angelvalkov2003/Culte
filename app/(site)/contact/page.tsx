import type { Metadata } from "next";
import { getBusinessHours, getSettings, groupHours } from "@/lib/settings";
import { MapEmbed } from "@/components/site/map-embed";
import { PopOut } from "@/components/site/dog-figure";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Контакти",
  description: "Адрес, телефон и работно време на груминг салон Culte в Пловдив.",
  alternates: { canonical: "/contact" },
};

/** „гр. Пловдив, ж.к. Оазис 3 / ул. Димитър Талев 144“ → „ул. Димитър Талев 144, Пловдив“ — Google го намира точно. */
function mapQuery(address: string): string {
  const street = address.split("/").pop()?.trim();
  const city = /Пловдив/i.test(address) ? "Пловдив" : "";
  return street && street !== address.trim() ? [street, city].filter(Boolean).join(", ") : address;
}

function directionsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery(address))}`;
}

export default async function ContactPage() {
  const [s, hours] = await Promise.all([getSettings(), getBusinessHours()]);
  const tel = s.phone.replace(/\s+/g, "");
  return (
    <div className="container-page pt-12">
      <h1 className="animate-rise text-[clamp(2.6rem,6vw,4.4rem)]">Контакти</h1>
      <div className="mt-10 grid gap-10 md:grid-cols-12">
        <div className="space-y-8 text-[15px] md:col-span-4">
          <div>
            <h2 className="font-sans text-sm font-semibold">Адрес</h2>
            <address className="mt-2 not-italic">{s.address}</address>
            <a href={s.map_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block link-underline">
              Отвори в Google Maps
            </a>
          </div>
          <div>
            <h2 className="font-sans text-sm font-semibold">Телефон</h2>
            <a href={`tel:${tel}`} className="mt-2 block font-serif text-3xl hover:text-terracotta">{s.phone}</a>
          </div>
          <div>
            <h2 className="font-sans text-sm font-semibold">Работно време</h2>
            <dl className="mt-2 space-y-1">
              {groupHours(hours).map((h) => (
                <div key={h.label} className="flex justify-between gap-4 border-b border-line py-1.5">
                  <dt>{h.label}</dt>
                  <dd className="tabular-nums">{h.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="font-sans text-sm font-semibold">Социални мрежи</h2>
            <ul className="mt-2 flex gap-5">
              <li><a href={s.instagram_url} target="_blank" rel="noopener noreferrer" className="link-underline">Instagram</a></li>
              <li><a href={s.facebook_url} target="_blank" rel="noopener noreferrer" className="link-underline">Facebook</a></li>
              <li><a href={s.tiktok_url} target="_blank" rel="noopener noreferrer" className="link-underline">TikTok</a></li>
            </ul>
          </div>
          <PopOut dog="foam" tone="sand" className="max-w-[240px]" sizes="240px" />
        </div>
        <div className="md:col-span-8">
          <MapEmbed query={mapQuery(s.address)} address={s.address} href={directionsUrl(s.address)} />
        </div>
      </div>
    </div>
  );
}
