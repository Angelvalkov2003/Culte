import type { SiteSettings } from "@/lib/settings";
import type { BusinessHours, Product } from "@/lib/types";

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify + escape на "<" предотвратява инжектиране на </script>
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function localBusinessJsonLd(s: SiteSettings, hours: BusinessHours[]) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    "@context": "https://schema.org",
    "@type": "PetGrooming",
    "@id": `${site}/#business`,
    name: "Culte",
    slogan: s.slogan,
    url: site,
    image: `${site}/logo.png`,
    telephone: s.phone,
    priceRange: "€€",
    address: {
      "@type": "PostalAddress",
      streetAddress: "ул. Димитър Талев 144, ж.к. Оазис 3",
      addressLocality: "Пловдив",
      addressCountry: "BG",
    },
    hasMap: s.map_url,
    sameAs: [s.instagram_url, s.facebook_url, s.tiktok_url].filter(Boolean),
    openingHoursSpecification: hours
      .filter((h) => !h.is_closed)
      .map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${DAY[h.weekday]}`,
        opens: h.open_time,
        closes: h.close_time,
      })),
  };
}

export function productJsonLd(p: Product, url: string, image?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    sku: p.slug,
    brand: { "@type": "Brand", name: "Culte" },
    category: p.category?.name,
    image: image ? [image] : undefined,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "EUR",
      price: Number(p.price).toFixed(2),
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}
