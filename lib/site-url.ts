/**
 * Основният адрес на сайта без наклонена черта накрая.
 * Ред: NEXT_PUBLIC_SITE_URL → продукционният домейн във Vercel → адресът на текущия деплой във Vercel → localhost.
 * Без "server-only", защото се ползва и от имейл шаблоните (preview).
 */
export function baseSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}
