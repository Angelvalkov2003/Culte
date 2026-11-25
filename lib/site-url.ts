/** Продукционният домейн на сайта (хардкоднат). */
export const SITE_URL = "https://culte.eu";

/**
 * Основният адрес на сайта без наклонена черта накрая.
 * Без "server-only", защото се ползва и от имейл шаблоните (preview).
 */
export function baseSiteUrl(): string {
  return SITE_URL;
}
