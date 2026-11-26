import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "За нас",
  description: "Culte — груминг салон в Пловдив, в който работим с едно куче наведнъж, и магазин за козметика за животни.",
  alternates: { canonical: "/about" },
};

const FACTS = [
  ["1", "куче наведнъж", "Без бързане и без чакане в клетка."],
  ["0", "минути в клетка", "Кучето е с нас през цялото време."],
  ["100%", "изпробвано", "Всеки продукт в магазина първо е минал през салона."],
] as const;

const STORY = [
  "Казвам се Стефани Бучакова и вече повече от 5 години професионалният груминг е моя страст и призвание.",
  "През годините, прекарани сред безброй пухкави муцунки, разбрах, че грижата за животните е много повече от професия – тя е любов, търпение, отдаденост и внимание към всеки детайл.",
  "Именно този опит ме вдъхнови да направя следващата крачка – да създам собствена професионална козметика за домашни любимци. Така се роди CULTE – бранд, зад който стоят моята любов, страст, опит и желание да предложа най-качествената домашна грижа.",
  "Днес Animal House Grooming Salon и Culte са двете страни на една обща идея – да даваме най-доброто на онези, които ни даряват с безусловна любов всеки ден.",
] as const;

const STEPS = [
  ["Запознаваме се", "Питаме за навиците, страховете и здравето на кучето."],
  ["Подбираме", "Шампоан и балсам според козината и чувствителността на кожата."],
  ["Не бързаме", "Ако кучето се напрегне, правим почивка и продължаваме, когато е готово."],
  ["Разказваме ви", "Какво видяхме и как да поддържате козината у дома."],
] as const;

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <div className="pt-12">
      {/* Начало */}
      <section className="container-page grid items-start gap-12 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-6">
          <p className="animate-rise text-[11px] font-medium tracking-[0.32em] text-terracotta uppercase">За нас</p>
          <h1 className="mt-4 animate-rise text-[clamp(2.4rem,4.2vw,3.8rem)] text-balance [animation-delay:80ms]">{s.slogan}</h1>
          <div className="mt-8 max-w-[52ch] animate-rise space-y-5 text-[16px] leading-7 text-espresso-soft [animation-delay:160ms]">
            {STORY.map((t) => (
              <p key={t.slice(0, 24)}>{t}</p>
            ))}
            <p className="font-serif text-[1.35em] leading-snug text-espresso italic">Защото те не са просто домашни любимци. Те са семейство!</p>
          </div>
          <p className="mt-8 animate-rise [animation-delay:220ms]">
            <span className="block text-[11px] font-medium tracking-[0.28em] text-terracotta uppercase">С любов,</span>
            <span className="mt-2 block font-serif text-[1.8rem] leading-none italic">Стефани Бучакова</span>
          </p>
        </div>
        <div className="animate-rise [animation-delay:200ms] md:sticky md:top-28 md:col-span-5 md:col-start-8">
          <div className="relative mx-auto aspect-[1206/1305] max-w-[440px] overflow-hidden rounded-lg bg-sand md:max-w-none">
            <Image
              src="/za-nas.png"
              alt="Стефани Бучакова с черен той пудел със златна папийонка"
              fill
              priority
              sizes="(min-width: 768px) 42vw, 440px"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Три числа */}
      <section aria-label="Накратко" className="pattern pattern-bones pattern-gold mt-20 bg-espresso py-16 text-cream md:mt-28 md:py-20">
        <dl className="container-page grid gap-12 sm:grid-cols-3 sm:gap-8">
          {FACTS.map(([num, label, text]) => (
            <div key={label} data-reveal className="grid grid-cols-[5.5rem_1fr] items-baseline gap-x-5 border-t border-gold/40 pt-6 sm:block">
              <dt className="contents sm:block">
                <span className="row-span-2 block font-serif text-[3.4rem] leading-none text-gold lining-nums sm:text-[clamp(3.6rem,7vw,5.4rem)]">{num}</span>
                <span className="block text-[11px] font-medium tracking-[0.28em] uppercase sm:mt-3">{label}</span>
              </dt>
              <dd className="col-start-2 mt-2 max-w-[30ch] text-[15px] leading-6 text-cream/65 sm:mt-3">{text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Как работим */}
      <section aria-labelledby="how-title" className="container-page mt-24 md:mt-28">
        <h2 id="how-title" data-reveal className="text-[clamp(2.2rem,4.5vw,3.4rem)]">
          Как работим
        </h2>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, text], i) => (
            <li key={title} data-reveal className="group relative overflow-hidden rounded-lg bg-sand p-6 pt-16 transition-colors duration-500 hover:bg-sand-deep">
              <span
                aria-hidden
                className="absolute -top-3 right-3 font-serif text-[6rem] leading-none text-cream lining-nums transition-transform duration-700 group-hover:-translate-y-1"
              >
                {i + 1}
              </span>
              <h3 className="relative font-serif text-2xl">{title}</h3>
              <p className="relative mt-2 text-[15px] leading-6 text-espresso-soft">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Хората и козметиката */}
      <section aria-label="Екипът и козметиката" className="container-page mt-24 grid gap-4 md:mt-28 md:grid-cols-2">
        <div data-reveal className="rounded-lg border border-line p-8 sm:p-10">
          <p className="text-[11px] font-medium tracking-[0.28em] text-terracotta uppercase">В салона ще срещнете</p>
          <p className="mt-4 font-serif text-[clamp(2.4rem,5vw,3.6rem)] leading-none italic">{s.team.join(" и ")}</p>
          <p className="mt-4 max-w-[36ch] text-[15px] leading-6 text-espresso-soft">
            С професионализъм, прецизност и време за всяко куче.
          </p>
        </div>
        <div data-reveal className="rounded-lg border border-line p-8 sm:p-10">
          <p className="text-[11px] font-medium tracking-[0.28em] text-terracotta uppercase">Работим с козметика</p>
          <ul className="mt-5 flex flex-wrap gap-2.5">
            {s.cosmetics.map((c) => (
              <li key={c} className="rounded-md border border-gold/60 px-4 py-2 font-serif text-xl">
                {c}
              </li>
            ))}
          </ul>
          <p className="mt-5 max-w-[36ch] text-[15px] leading-6 text-espresso-soft">
            Същите продукти намирате и в{" "}
            <Link href="/shop" className="link-underline text-espresso">
              магазина
            </Link>
            {" "}— за грижа у дома.
          </p>
        </div>
      </section>

      {/* Покана */}
      <section data-reveal className="container-page mt-24 md:mt-28">
        <div className="pattern pattern-scatter flex flex-col items-center rounded-lg bg-sand px-6 py-14 text-center sm:py-16">
          <h2 className="text-[clamp(2.2rem,4.5vw,3.4rem)]">Елате да се запознаем</h2>
          <p className="mt-3 text-[15px] text-espresso-soft">{s.address}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <ButtonLink href="/booking" size="lg">
              Запази час
            </ButtonLink>
            <Link href="/contact" className="link-underline text-[15px]">
              Контакти
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
