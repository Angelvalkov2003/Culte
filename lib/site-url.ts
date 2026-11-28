/**
 * Основният адрес на сайта (имейли, sitemap, canonical, OG, JSON-LD).
 * NEXT_PUBLIC_SITE_URL позволява временен адрес (напр. https://culte-beta.vercel.app), докато culte.eu не е вързан;
 * без нея — продукционният домейн. NEXT_PUBLIC_ се вгражда при build → след смяна е нужен redeploy.
 */
const DEFAULT_SITE_URL = "https://culte.eu";

function normalize(raw: string | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin : null;
  } catch {
    return null;
  }
}

export const SITE_URL = normalize(process.env.NEXT_PUBLIC_SITE_URL) ?? DEFAULT_SITE_URL;

/**
 * Основният адрес на сайта без наклонена черта накрая.
 * Без "server-only", защото се ползва и от имейл шаблоните (preview).
 */
export function baseSiteUrl(): string {
  return SITE_URL;
}
