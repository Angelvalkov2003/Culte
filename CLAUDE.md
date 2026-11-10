# Culte — груминг салон + магазин за козметика за кучета

Next.js 16 (App Router, TS, Server Actions) · Tailwind 4 · Supabase · Stripe Checkout · Resend + React Email · Cloudinary. UI само на български, EUR, TZ Europe/Sofia.

## Команди
- `npm run dev` / `npm run build` / `npm run lint` / `npm run typecheck`
- `npm run icons` — favicon/OG от `public/logo.png`; `npm run email` — preview на имейлите
- `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- E2E: `.claude/skills/webapp-testing` (Playwright, Python) — скриптове в `tests/`

## Архитектура
- `app/(site)/*` публичен сайт; `app/admin/*` админ (защита: `proxy.ts` + `requireAdmin()` във всяко action)
- `app/api/stripe/webhook` — един webhook; `metadata.kind` = `booking` | `order`; идемпотентно чрез статуси + `stripe_events`
- `lib/supabase/` — `admin.ts` (service role, само сървър, всички записи), `public.ts` (publishable ключ, само четене)
- `lib/booking/` — свободни часове, създаване на резервация; `lib/shop/` — количка (cookie `culte_cart`), поръчки
- `lib/shipping/` — интерфейс `ShippingProvider` (днес `manual`; място за Еконт/Спиди)
- `emails/` — React Email шаблони; `lib/email.ts` праща през Resend
- `supabase/schema.sql` — ЕДИН файл, пуска се ръчно в Supabase (агентът НЕ изпълнява SQL)

## Конвенции
- Цени в БД: `numeric(10,2)` EUR; към Stripe → центове. Формат `formatEUR()`.
- Времена в БД: `timestamptz`; локално смятане през `lib/time.ts` (date-fns-tz, Europe/Sofia).
- Дизайн токени в `app/globals.css` (`--cream`, `--sand`, `--terracotta`...). Без емоджита/градиенти, радиус 4–8px.
- Валидация със Zod на всеки вход. Наличности само чрез SQL функции (`order_deduct_stock` / `order_restore_stock` / `create_order`).
- Версии: ESLint 9 (плъгините на eslint-config-next още не поддържат 10), TypeScript 6 (TS 7 няма JS API за Next/typescript-eslint).

## Env (имена; стойности само в `.env.local`, никога в код)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (fallback NEXT_PUBLIC_SUPABASE_ANON_KEY), SUPABASE_SERVICE_ROLE_KEY,
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, CLOUDINARY_URL, NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
RESEND_API_KEY, CONTACT_EMAIL, EMAIL_FROM, ADMIN_PASSWORD, ADMIN_SESSION_SECRET, NEXT_PUBLIC_SITE_URL, CRON_SECRET

## Git
Автор/commit имейл: angel4o2003@abv.bg · remote: github.com/Angelvalkov2003/Culte
