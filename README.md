# Culte

Груминг салон с онлайн записване (капаро 50% през Stripe) и онлайн магазин за козметика за животни.
Next.js 16 · Tailwind 4 · Supabase · Stripe · Resend · Cloudinary. Архитектура и конвенции: `CLAUDE.md`.

## Локално

```bash
npm install
cp .env.example .env.local   # ако още няма; попълнете стойностите
npm run dev
stripe listen --forward-to localhost:3000/api/stripe/webhook   # копирайте whsec_... в STRIPE_WEBHOOK_SECRET
```

Тестова карта: `4242 4242 4242 4242`, произволна бъдеща дата и CVC.

## Деплой във Vercel

1. **Supabase.** Създайте проект → SQL Editor → изпълнете целия `supabase/schema.sql` наведнъж. Файлът първо изтрива всичко от сайта и създава базата наново (таблици, RLS, функции, seed) — при промяна по схемата се пуска отново целият.
   От Project Settings → API вземете URL, publishable (или anon) ключа и service role ключа.
2. **Vercel.** Import на GitHub репото → Framework: Next.js. В Settings → Environment Variables добавете всички имена от
   `.env.example`:
   - Домейнът е хардкоднат в `lib/site-url.ts` (`https://culte.eu`)
   - `ADMIN_PASSWORD` (силна парола), `ADMIN_SESSION_SECRET` (случаен низ, `openssl rand -base64 32`)
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` може да остане празно — взима се от `CLOUDINARY_URL`.
3. **Stripe webhook.** Dashboard → Developers → Webhooks → Add endpoint:
   `https://culte.eu/api/stripe/webhook`, събития `checkout.session.completed`, `checkout.session.expired`,
   `checkout.session.async_payment_succeeded`. Signing secret → `STRIPE_WEBHOOK_SECRET` във Vercel. За live режим сменете
   и `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` с live ключове.
4. **Resend.** Domains → Add domain → добавете DNS записите → след верификация сменете
   `EMAIL_FROM="Culte <hello@вашия-домейн>"`. Дотогава `onboarding@resend.dev` праща само до имейла на собственика на акаунта.
5. **Без cron** (безплатен Vercel план). Напомнянията за утрешните часове и GDPR почистването се пускат с бутона
   „Напомняния за утре и почистване“ на таблото в админа — веднъж дневно.
6. Redeploy след промяна на env променливи.

## Админ панел

`/admin` → вход с `ADMIN_PASSWORD`. Табло, календар, резервации (ръчно добавяне, отказ с връщане на капарото),
услуги, работно време, блокирани периоди, продукти (inline активен/бройки), категории, поръчки, доставка, настройки.

## Преди пускане

- Попълнете данните в квадратни скоби в `components/site/legal-page.tsx` и прегледайте правните страници.
- Доставката е по ръчни тарифи (`shipping_methods`). Интеграция с Еконт/Спиди: нов провайдър в `lib/shipping/`.
