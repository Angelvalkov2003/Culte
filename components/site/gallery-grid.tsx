"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GalleryPhoto } from "@/lib/gallery";
import { cn } from "@/lib/format";

/**
 * Масонри мрежа (CSS колони, снимките не се изрязват — много от тях са колажи „преди / след“).
 * Клик отваря снимката на цял екран; смяна със стрелките, клавиатурата (← → Esc) или плъзгане с пръст.
 */
export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setOpen(null);
    opener.current?.focus();
  }, []);
  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length)), [photos.length]);

  return (
    <>
      <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {photos.map((p, i) => (
          <li key={p.src} data-reveal className="mb-4 break-inside-avoid">
            <button
              type="button"
              onClick={(e) => {
                opener.current = e.currentTarget;
                setOpen(i);
              }}
              className="group relative block w-full overflow-hidden rounded-lg bg-sand"
              aria-label={`Отвори снимка: ${p.alt}`}
            >
              <Image
                src={p.src}
                alt={p.alt}
                width={p.w}
                height={p.h}
                sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                className="h-auto w-full transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-[1.03]"
              />
              <span className="absolute inset-0 bg-espresso/0 transition-colors duration-500 group-hover:bg-espresso/15" />
              <span className="absolute right-3 bottom-3 grid size-9 translate-y-2 place-items-center rounded-md bg-cream/90 text-espresso opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M12 3h5v5M8 17H3v-5M17 3l-6 6M3 17l6-6" />
                </svg>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open !== null && <Lightbox photos={photos} index={open} onClose={close} onGo={go} />}
    </>
  );
}

function Lightbox({
  photos,
  index,
  onClose,
  onGo,
}: {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onGo: (d: number) => void;
}) {
  const p = photos[index];
  const closeBtn = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    closeBtn.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onGo(1);
      else if (e.key === "ArrowLeft") onGo(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, onGo]);

  // Portal в body: иначе main (isolate) държи прозореца под sticky хедъра.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Галерия"
      className="fixed inset-0 z-[90] flex animate-[lightbox-in_300ms_ease-out_both] flex-col bg-espresso/95"
      // Клик навсякъде извън снимката и бутоните затваря.
      onClick={(e) => !(e.target as HTMLElement).closest("img, button") && onClose()}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) onGo(dx < 0 ? 1 : -1);
      }}
    >
      <style>{KEYFRAMES}</style>
      <div className="flex items-center justify-between px-4 py-1 text-cream sm:px-6">
        <span className="text-sm tabular-nums text-cream/70">
          {index + 1} / {photos.length}
        </span>
        <button
          ref={closeBtn}
          type="button"
          onClick={onClose}
          aria-label="Затвори"
          className="grid size-11 place-items-center rounded-md text-cream transition-colors hover:bg-cream/10"
        >
          <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>

      {/* --chrome = височината на горната и долната лента; снимката заема всичко останало (и се уголемява над реалния си размер). */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center [--chrome:7rem] [--padx:0px] sm:[--chrome:5.75rem] sm:[--padx:2rem]">
        {/* Реалните пропорции: елементът е колкото видимата снимка, така празното място около нея затваря. */}
        <Image
          key={p.src}
          src={p.src}
          alt={p.alt}
          width={p.w}
          height={p.h}
          sizes="100vw"
          style={{ width: `min(calc(100vw - var(--padx)), calc((100svh - var(--chrome)) * ${p.w / p.h}))` }}
          className="h-auto max-w-none animate-[lightbox-img_350ms_cubic-bezier(0.2,0.7,0.2,1)_both] sm:rounded-sm"
        />
        <NavBtn dir={-1} onGo={onGo} place="side" />
        <NavBtn dir={1} onGo={onGo} place="side" />
      </div>

      <div className="flex items-center gap-3 px-2 py-2 sm:justify-center sm:px-4 sm:py-3">
        <NavBtn dir={-1} onGo={onGo} place="bar" />
        <p className="line-clamp-2 flex-1 text-center text-sm leading-tight text-cream/70 sm:flex-none">{p.alt}</p>
        <NavBtn dir={1} onGo={onGo} place="bar" />
      </div>
    </div>,
    document.body,
  );
}

const KEYFRAMES = `@keyframes lightbox-in{from{opacity:0}}@keyframes lightbox-img{from{opacity:0;transform:scale(.97)}}`;

/** `side` — върху снимката отстрани (от sm нагоре); `bar` — в долната лента (само на телефон, за да не покриват снимката). */
function NavBtn({ dir, onGo, place }: { dir: 1 | -1; onGo: (d: number) => void; place: "side" | "bar" }) {
  return (
    <button
      type="button"
      onClick={() => onGo(dir)}
      aria-label={dir < 0 ? "Предишна снимка" : "Следваща снимка"}
      className={cn(
        "size-11 shrink-0 place-items-center rounded-full bg-cream/90 text-espresso shadow-lg transition-transform hover:scale-105",
        place === "side"
          ? cn("absolute top-1/2 hidden -translate-y-1/2 sm:grid sm:size-12", dir < 0 ? "left-5" : "right-5")
          : "grid sm:hidden",
      )}
    >
      <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir < 0 ? "M12 4l-6 6 6 6" : "M8 4l6 6-6 6"} />
      </svg>
    </button>
  );
}
