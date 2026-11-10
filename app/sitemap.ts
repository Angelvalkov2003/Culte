import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { getCategories, getProducts } from "@/lib/shop/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const pages = ["", "/grooming", "/booking", "/shop", "/about", "/contact", "/terms", "/privacy", "/cookies", "/shipping-returns"];
  const [products, categories] = await Promise.all([getProducts().catch(() => []), getCategories().catch(() => [])]);
  return [
    ...pages.map((p) => ({
      url: `${base}${p}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : p === "/booking" || p === "/shop" ? 0.9 : 0.5,
    })),
    ...categories.map((c) => ({ url: `${base}/shop?category=${c.slug}`, lastModified: now, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: now, priority: 0.8 })),
  ];
}
