import type { Metadata } from "next";
import { BEFORE_AFTER, GALLERY } from "@/lib/gallery";
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

      <section data-reveal className="mt-20 flex flex-col items-center rounded-lg bg-sand px-6 py-14 text-center">
        <h2 className="max-w-[20ch] text-[clamp(1.9rem,3.6vw,2.8rem)]">Следващата снимка може да е на вашето куче</h2>
        <ButtonLink href="/booking" size="lg" className="mt-8">
          Запази час
        </ButtonLink>
      </section>
    </div>
  );
}
