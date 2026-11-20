import Link from "next/link";
import { getBusinessHours, getSettings, groupHours, listBG } from "@/lib/settings";
import { getCategories, getProducts } from "@/lib/shop/catalog";
import { ButtonLink } from "@/components/ui/button";
import { ProductCard } from "@/components/site/product-card";
import { JsonLd, localBusinessJsonLd } from "@/components/site/json-ld";
import { PopOut } from "@/components/site/dog-figure";
import { BrandChoiceHero } from "@/components/site/brand-choice-hero";
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

      {/* Hero: избор между двата свята — Culte (магазин) и Animal House (груминг) */}
      <BrandChoiceHero address={s.address} />

      {/* Салонът — кратки факти върху бяло */}
      <section aria-label="Салонът" className="container-page mt-20 md:mt-28">
        <dl data-reveal className="grid gap-10 border-y border-line py-10 text-[15px] md:grid-cols-3 md:gap-8">
          <div>
            <dt className="text-sm text-espresso-soft">{s.team.length > 1 ? "Грумъри" : "Грумър"}</dt>
            <dd className="mt-2 font-serif text-2xl text-espresso">{listBG(s.team)}</dd>
          </div>
          <div>
            <dt className="text-sm text-espresso-soft">Козметика в салона</dt>
            <dd className="mt-2 font-serif text-2xl text-espresso">{listBG(s.cosmetics)}</dd>
          </div>
          <div>
            <dt className="text-sm text-espresso-soft">Адрес</dt>
            <dd className="mt-2 text-espresso">
              {s.address}.{" "}
              <a href={s.map_url} target="_blank" rel="noopener noreferrer" className="link-underline">
                Карта
              </a>
            </dd>
          </div>
        </dl>
      </section>

      {/* Един час в салона */}
      <section aria-labelledby="ritual-title" className="container-page mt-24 md:mt-28">
        <div data-reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-espresso-soft">Един час в Animal House</p>
            <h2 id="ritual-title" className="mt-3 max-w-[24ch] text-[clamp(2.2rem,4.5vw,3.4rem)]">
              Подари спа изживяване на своето кученце
            </h2>
          </div>
          <Link href="/grooming" className="link-underline text-[15px]">
            Услуги и цени
          </Link>
        </div>
        <ol className="mt-14 grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-4 lg:gap-x-6">
          {(
            [
              ["peach", "sand-deep", "Нокти, уши и очи", "Започваме с изрязване на ноктите и почистване на ушите и очите."],
              ["puppy", "sand", "Баня", "Спа баня с подходящи продукти според типа козина."],
              ["shihtzu", "sand-deep", "Подсушаване", "Подсушаване и внимателно разресване на козината."],
              ["yorkieScissors", "sand", "Подстригване", "По стандарта на породата или по желание на клиента."],
            ] as const
          ).map(([dog, tone, title, text], i) => (
            <li key={title} data-reveal className={cn("group", i % 2 === 1 && "lg:mt-12")}>
              <PopOut dog={dog} tone={tone} sizes="(min-width: 1024px) 280px, 45vw" />
              <div className="mt-5 flex items-baseline gap-3 border-t border-line pt-4">
                <span className="font-serif text-xl text-gold tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-sans text-base font-semibold">{title}</h3>
              </div>
              <p className="mt-1.5 text-[15px] leading-6 text-espresso-soft">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Две посоки — груминг / магазин */}
      <section aria-label="Посоки" className="container-page mt-24 md:mt-28">
        <div className="grid gap-4 md:grid-cols-2">
          <article data-reveal className="relative flex min-h-[380px] flex-col justify-between overflow-hidden rounded-lg bg-sand p-8 sm:min-h-[420px] sm:p-10">
            <div>
              <p className="text-sm text-espresso-soft">Груминг салон</p>
              <h2 className="mt-3 max-w-[12ch] text-[clamp(2rem,4vw,3rem)]">Запази час за груминг</h2>
              <dl className="mt-8 grid max-w-sm grid-cols-2 gap-y-1 text-sm text-espresso-soft">
                {hoursText.map((h) => (
                  <div key={h.label} className="contents">
                    <dt>{h.label}</dt>
                    <dd className="tabular-nums text-espresso">{h.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <ButtonLink href="/booking" size="lg" className="mt-10 w-fit">
              Запази час
            </ButtonLink>
          </article>

          <article data-reveal className="relative flex min-h-[380px] flex-col justify-between overflow-hidden rounded-lg bg-espresso p-8 text-cream sm:min-h-[420px] sm:p-10">
            <div>
              <p className="text-sm text-cream/60">Онлайн магазин</p>
              <h2 className="mt-3 max-w-[13ch] text-[clamp(2rem,4vw,3rem)] text-cream">Козметика и парфюми</h2>
              <p className="mt-6 max-w-sm text-[15px] leading-7 text-cream/70">
                Шампоани, балсами и аромати, които ползваме и препоръчваме. Доставка в цялата страна.
              </p>
              {categories.length > 0 && (
                <ul className="mt-5 flex max-w-md flex-wrap gap-x-5 gap-y-1.5 text-sm">
                  {categories.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <Link href={`/shop?category=${c.slug}`} className="text-cream/75 transition-colors hover:text-sand-deep">
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <ButtonLink href="/shop" size="lg" variant="light" className="mt-10 w-fit">
              Към магазина
            </ButtonLink>
          </article>
        </div>
      </section>

      {/* Записване */}
      <section aria-labelledby="steps-title" className="mt-24 bg-sand py-20 md:mt-28 md:py-24">
        <div className="container-page grid items-end gap-12 md:grid-cols-12">
          <div data-reveal className="md:col-span-7">
            <h2 id="steps-title" className="text-[clamp(2.4rem,5vw,3.8rem)] leading-[1.05]">
              Запиши час лесно и удобно
            </h2>
            <p className="mt-6 max-w-[46ch] text-[15px] leading-7 text-espresso-soft">
              Ако нещо се промени, ще сме ви благодарни да ни предупредите поне 48 часа по-рано.
            </p>
          </div>

          <div data-reveal className="[--reveal-delay:120ms] md:col-span-4 md:col-start-9">
            <ButtonLink href="/booking" size="lg" className="w-full">
              Запази час онлайн
            </ButtonLink>
            <div className="my-6 flex items-center gap-4 text-sm text-espresso-soft" aria-hidden>
              <span className="h-px flex-1 bg-espresso/15" />
              или
              <span className="h-px flex-1 bg-espresso/15" />
            </div>
            <p className="text-sm text-espresso-soft">Обадете се</p>
            <a
              href={`tel:${s.phone.replace(/\s+/g, "")}`}
              className="mt-1 block font-serif text-[2rem] leading-tight lining-nums text-espresso transition-colors hover:text-terracotta"
            >
              {s.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Продукти */}
      {featured.length > 0 && (
        <section aria-labelledby="shop-title" className="container-page mt-24 md:mt-28">
          <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-espresso-soft">Разгледайте нашите професионални продукти</p>
              <h2 id="shop-title" className="mt-3 max-w-lg text-4xl">
                От рафта в салона до вашата баня
              </h2>
            </div>
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
