import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/format";
import { BEFORE_AFTER, GALLERY, HALLOWEEN_PHOTO } from "@/lib/gallery";
import { BeforeAfter } from "@/components/site/before-after";
import { GalleryGrid } from "@/components/site/gallery-grid";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Галерия — преди и след груминг",
  description: "Снимки от груминг салон Animal House в Пловдив: пудели, йоркширски териери, малтийски болонки и други, преди и след подстригване.",
  alternates: { canonical: "/gallery" },
};

export default function GalleryPage() {
  return (
    <div className="container-page pt-12 pb-8">
      {/* Преди / след — плъзгач */}
      <section aria-labelledby="gallery-title" className="grid items-center gap-10 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-5">
          <p className="animate-rise text-[11px] font-medium tracking-[0.32em] text-terracotta uppercase">Галерия · Animal House</p>
          <h1 id="gallery-title" className="mt-4 animate-rise text-[clamp(2.6rem,5.4vw,4.4rem)] [animation-delay:80ms]">
            Преди и след
          </h1>
          <p className="mt-6 max-w-[40ch] animate-rise text-[16px] leading-7 text-espresso-soft [animation-delay:160ms]">
            Плъзнете дръжката по снимката, за да видите промяната — от рошаво кученце до готов пудел след салона.
          </p>
          <div className="mt-8 flex animate-rise flex-wrap items-center gap-x-6 gap-y-3 [animation-delay:240ms]">
            <ButtonLink href="/booking" size="lg">
              Запази час
            </ButtonLink>
            <a href="#photos" className="link-underline text-[15px]">
              Всички снимки
            </a>
          </div>
        </div>
        <div className="animate-rise [animation-delay:200ms] md:col-span-6 md:col-start-7">
          <BeforeAfter before={BEFORE_AFTER.before} after={BEFORE_AFTER.after} className="mx-auto max-w-[520px]" />
        </div>
      </section>

      {/* Останалите снимки */}
      <section id="photos" aria-labelledby="photos-title" className="mt-24 scroll-mt-28 md:mt-32">
        <div data-reveal className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <h2 id="photos-title" className="text-[clamp(2rem,4vw,3rem)]">
            От салона
          </h2>
          <p className="text-sm text-espresso-soft">Натиснете снимка, за да я отворите</p>
        </div>
        <GalleryGrid photos={GALLERY} />
      </section>

      {/* Финал: ветрило от „полароиди“ — две снимки и празна рамка за следващото приятелче */}
      <section
        data-reveal
        aria-labelledby="next-title"
        className="group pattern pattern-scatter pattern-gold mt-24 grid items-center gap-12 overflow-hidden rounded-lg bg-espresso px-6 py-16 text-cream sm:px-12 md:grid-cols-12 md:gap-8 md:py-20"
      >
        <div className="relative mx-auto h-[300px] w-[280px] sm:h-[340px] sm:w-[340px] md:col-span-5 md:h-[380px] md:w-full">
          <Polaroid
            src={HALLOWEEN_PHOTO.src}
            alt={HALLOWEEN_PHOTO.alt}
            caption="Хелоуин"
            className="top-6 left-[4%] -rotate-[9deg] group-hover:-translate-x-4 group-hover:-rotate-[14deg]"
          />
          <Polaroid
            src={BEFORE_AFTER.after.src}
            alt={BEFORE_AFTER.after.alt}
            caption="След салона"
            className="top-0 left-1/2 -translate-x-1/2 rotate-[3deg] group-hover:-translate-y-3"
          />
          <figure className="absolute right-[4%] bottom-0 w-[46%] rotate-[8deg] rounded-sm bg-cream p-2 pb-9 shadow-[0_18px_40px_rgba(0,0,0,0.35)] transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:translate-x-4 group-hover:rotate-[12deg]">
            <div className="pattern pattern-scatter grid aspect-[3/4] place-items-center rounded-[2px] border border-dashed border-clay bg-sand">
              <span className="font-serif text-6xl leading-none text-terracotta transition-transform duration-700 group-hover:scale-110">?</span>
            </div>
            <figcaption className="absolute inset-x-0 bottom-2.5 text-center font-serif text-[15px] text-espresso italic">Вашето приятелче?</figcaption>
          </figure>
        </div>

        <div className="text-center md:col-span-6 md:col-start-7 md:text-left">
          <p className="text-[11px] font-medium tracking-[0.32em] text-gold uppercase">Вашият ред</p>
          <h2 id="next-title" className="mt-4 text-[clamp(2.1rem,4.2vw,3.4rem)] text-balance">
            Следващата снимка може да е на{" "}
            <span className="font-normal text-gold italic">вашето приятелче</span>
          </h2>
          <p className="mx-auto mt-5 max-w-[40ch] text-[15px] leading-7 text-cream/70 md:mx-0">
            Запазете час онлайн за минута. Ние ще се погрижим за банята, подстригването и всеки детайл — а то ще си тръгне
            спокойно и красиво.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 md:justify-start">
            <ButtonLink href="/booking" size="lg" variant="light">
              Запази час
            </ButtonLink>
            <Link href="/grooming" className="text-[15px] text-cream underline decoration-cream/30 underline-offset-4 transition-colors hover:decoration-cream">
              Услуги и цени
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Polaroid({ src, alt, caption, className }: { src: string; alt: string; caption: string; className?: string }) {
  return (
    <figure
      className={cn(
        "absolute w-[46%] rounded-sm bg-cream p-2 pb-9 shadow-[0_18px_40px_rgba(0,0,0,0.35)] transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
        className,
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-[2px] bg-sand">
        <Image src={src} alt={alt} fill sizes="200px" className="object-cover" />
      </div>
      <figcaption className="absolute inset-x-0 bottom-2.5 text-center font-serif text-[15px] text-espresso italic">{caption}</figcaption>
    </figure>
  );
}
