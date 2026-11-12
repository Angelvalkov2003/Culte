import Link from "next/link";
import { getBusinessHours, getSettings, groupHours } from "@/lib/settings";
import { getCategories, getProducts } from "@/lib/shop/catalog";
import { ButtonLink } from "@/components/ui/button";
import { ProductCard } from "@/components/site/product-card";
import { JsonLd, localBusinessJsonLd } from "@/components/site/json-ld";
import { DogCutout, PopOut } from "@/components/site/dog-figure";
import { cn } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [s, hours, categories, products] = await Promise.all([
    getSettings(),
    getBusinessHours(),
    getCategories(),
    getProducts({ limit: 8 }),
  ]);
  const featured = products.filter((p) => p.stock > 0).slice(0, 4);
  const hoursText = groupHours(hours);

  return (
    <>
      <JsonLd data={localBusinessJsonLd(s, hours)} />

      {/* Hero: две равностойни посоки */}
      <section aria-labelledby="hero-title" className="container-page pt-8 sm:pt-12">
        <h1 id="hero-title" className="sr-only">
          Culte — груминг салон и козметика за кучета
        </h1>
        <p className="max-w-xl animate-rise text-[15px] text-espresso-soft">
          Груминг салон в Пловдив и подбрана козметика за кучета.{" "}
          <span className="text-espresso">{s.slogan}.</span>
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-2 md:gap-4">
          <article className="relative flex min-h-[440px] flex-col justify-between overflow-hidden rounded-lg bg-sand p-7 pattern pattern-bones sm:min-h-[560px] sm:p-10">
            <div className="relative z-10">
              <p className="text-sm text-olive">Груминг салон</p>
              <h2 className="mt-4 max-w-[12ch] text-[clamp(2.6rem,6vw,4.6rem)] text-espresso">
                Запази час за груминг
              </h2>
            </div>
            <div className="relative z-10 space-y-6 lg:max-w-[15.5rem] xl:max-w-[17rem]">
              <p className="max-w-sm text-[15px] leading-7 text-espresso-soft">
                Изберете размер, услуга и свободен час. Плащате онлайн половината, остатъка — в салона.
              </p>
              <dl className="grid max-w-sm grid-cols-2 gap-y-1 text-sm text-espresso-soft">
                {hoursText.map((h) => (
                  <div key={h.label} className="contents">
                    <dt>{h.label}</dt>
                    <dd className="tabular-nums text-espresso">{h.value}</dd>
                  </div>
                ))}
              </dl>
              <ButtonLink href="/booking" size="lg">
                Запази час
              </ButtonLink>
            </div>
            <DogCutout
              dog="poodleGold"
              priority
              sizes="(min-width: 1280px) 290px, (min-width: 1024px) 230px, 220px"
              className="-mb-7 mt-8 ml-auto w-[min(62%,220px)] animate-rise sm:-mb-10 lg:absolute lg:right-6 lg:bottom-0 lg:mb-0 lg:w-[42%] lg:max-w-[290px] xl:right-10"
            />
          </article>

          <article className="relative flex min-h-[440px] flex-col justify-between overflow-hidden rounded-lg bg-espresso p-7 text-cream pattern pattern-grid pattern-light sm:min-h-[560px] sm:p-10">
            <div className="relative z-10">
              <p className="text-sm text-clay">Онлайн магазин</p>
              <h2 className="mt-4 max-w-[12ch] text-[clamp(2.6rem,6vw,4.6rem)] text-cream">
                Пазарувай козметика
              </h2>
            </div>
            <div className="relative z-10 space-y-6 lg:max-w-[15.5rem] xl:max-w-[17rem]">
              <p className="max-w-sm text-[15px] leading-7 text-cream/75">
                Шампоани, балсами и аромати, които ползваме и препоръчваме. Доставка в цялата страна.
              </p>
              {categories.length > 0 && (
                <ul className="flex max-w-md flex-wrap gap-x-5 gap-y-1.5 text-sm">
                  {categories.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <Link href={`/shop?category=${c.slug}`} className="text-cream/80 hover:text-cream">
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <ButtonLink href="/shop" size="lg" variant="light">
                Към магазина
              </ButtonLink>
            </div>
            <DogCutout
              dog="poodleViolet"
              sizes="(min-width: 1280px) 290px, (min-width: 1024px) 230px, 220px"
              className="-mb-7 mt-8 ml-auto w-[min(62%,220px)] animate-rise [animation-delay:120ms] sm:-mb-10 lg:absolute lg:right-6 lg:bottom-0 lg:mb-0 lg:w-[42%] lg:max-w-[290px] xl:right-10 drop-shadow-[0_0_28px_rgba(244,235,222,0.22)]"
            />
          </article>
        </div>
      </section>

      {/* Салонът */}
      <section aria-labelledby="salon-title" className="container-page mt-28 grid gap-12 md:grid-cols-12">
        <div className="md:col-span-7">
          <h2 id="salon-title" className="text-[clamp(2.2rem,4.5vw,3.6rem)] text-espresso">
            Всяко куче получава цялото ни внимание. Буквално.
          </h2>
          <p className="prose-culte mt-6">
            В салона работим с едно куче наведнъж. Няма чакане в клетка и шум от други животни — само спокойна
            обстановка, топла вода и време да свикне с нас. Подстригваме според породата и според това как живее
            кучето ви, а не по шаблон.
          </p>
        </div>
        <dl className="grid content-end gap-8 text-[15px] md:col-span-4 md:col-start-9">
          <div>
            <dt className="text-sm text-espresso-soft">Грумъри</dt>
            <dd className="mt-1 font-serif text-2xl">{s.team.join(" и ")}</dd>
          </div>
          <div>
            <dt className="text-sm text-espresso-soft">Козметика в салона</dt>
            <dd className="mt-1 font-serif text-2xl">{s.cosmetics.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-sm text-espresso-soft">Адрес</dt>
            <dd className="mt-1">
              {s.address}.{" "}
              <a href={s.map_url} target="_blank" rel="noopener noreferrer" className="link-underline">
                Карта
              </a>
            </dd>
          </div>
        </dl>
      </section>

      {/* Един час в салона — визуален ритъм от изрязани снимки */}
      <section aria-labelledby="ritual-title" className="container-page mt-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-olive">Един час в Culte</p>
            <h2 id="ritual-title" className="mt-3 max-w-[24ch] text-[clamp(2.2rem,4.5vw,3.4rem)]">
              Без бързане. Без клетки. Само вашето куче.
            </h2>
          </div>
          <Link href="/grooming" className="link-underline text-[15px]">
            Услуги и цени
          </Link>
        </div>
        <ol className="mt-14 grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-4 lg:gap-x-6">
          {(
            [
              ["peach", "sand-deep", "Баня", "Шампоан и балсам според козината и кожата, с топла вода."],
              ["puppy", "clay", "Подсушаване", "Внимателно и с почивки, ако кучето има нужда от тях."],
              ["yorkieScissors", "sand-deep", "Подстригване", "По стандарта на породата или според начина ви на живот."],
              ["shihtzu", "clay", "Финален щрих", "Разресване, последни корекции и съвет за грижа у дома."],
            ] as const
          ).map(([dog, tone, title, text], i) => (
            <li key={title} className={cn("group", i % 2 === 1 && "lg:mt-12")}>
              <PopOut dog={dog} tone={tone} sizes="(min-width: 1024px) 280px, 45vw" />
              <div className="mt-5 flex items-baseline gap-3 border-t border-espresso/15 pt-4">
                <span className="font-serif text-xl text-clay tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-sans text-base font-semibold">{title}</h3>
              </div>
              <p className="mt-1.5 text-[15px] leading-6 text-espresso-soft">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Как става записването — реална последователност */}
      <section aria-labelledby="steps-title" className="mt-28 bg-sand py-20 pattern pattern-scatter">
        <div className="container-page grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <h2 id="steps-title" className="text-4xl">
              Записването отнема две минути
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-espresso-soft">
              Капарото пази часа само за вас. Ако нещо се промени, обадете ни се на{" "}
              <a href={`tel:${s.phone.replace(/\s+/g, "")}`} className="link-underline text-espresso">
                {s.phone}
              </a>
              .
            </p>
          </div>
          <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2 md:col-span-7 md:col-start-6">
            {[
              ["Размер и услуга", "Малка, средна или голяма порода и услугата, от която има нужда."],
              ["Ден и час", "Показваме само реално свободните часове в календара на салона."],
              ["Данни за кучето", "Име, порода и всичко, което трябва да знаем предварително."],
              ["Капаро", "Плащате сигурно с карта. Часът се потвърждава веднага след плащането."],
            ].map(([title, text], i) => (
              <li key={title} className="border-t border-espresso/15 pt-4">
                <p className="font-serif text-xl text-clay tabular-nums">{i + 1}</p>
                <h3 className="mt-1 font-sans text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-[15px] leading-6 text-espresso-soft">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Продукти */}
      {featured.length > 0 && (
        <section aria-labelledby="shop-title" className="container-page mt-28">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="shop-title" className="max-w-lg text-4xl">
              От рафта в салона до вашата баня
            </h2>
            <Link href="/shop" className="link-underline text-[15px]">
              Всички продукти
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
