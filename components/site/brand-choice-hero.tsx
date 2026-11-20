"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { cn } from "@/lib/format";

type Choice = "shop" | "grooming" | null;

const RING_TEXT = "Изберете своя свят · Изберете своя свят · ";
const MOBILE = "(max-width: 767px)";

/**
 * Hero на началната страница: две марки една до друга — Culte (магазин) и Animal House (груминг).
 * Компютър: панелът под курсора се разширява (CSS :hover), логата следват курсора; клик по панела отваря основния му линк.
 * Телефон: двете половини също са една до друга; изборът (превключвател в центъра, докосване или плъзгане)
 * разширява единия свят и показва текста и бутоните му, другият се свива до тясна лента.
 * Границата между двата свята се движи чрез една CSS променлива --seam (виж globals.css).
 */
export function BrandChoiceHero({ address }: { address: string }) {
  const ref = useRef<HTMLElement>(null);
  const frame = useRef(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [choice, setChoice] = useState<Choice>(null);
  const router = useRouter();

  const isMobile = () => window.matchMedia(MOBILE).matches;
  const stateOf = (me: Exclude<Choice, null>) => (choice === null ? "neutral" : choice === me ? "open" : "closed");

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const my = ((e.clientY - r.top) / r.height) * 2 - 1;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--mx", mx.toFixed(3));
      el.style.setProperty("--my", my.toFixed(3));
    });
  };
  const onLeave = () => {
    ref.current?.style.setProperty("--mx", "0");
    ref.current?.style.setProperty("--my", "0");
  };

  // Плъзгане с пръст: надясно → границата отива надясно → магазинът се разширява; наляво → грумингът.
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start || !isMobile()) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    setChoice(dx > 0 ? "shop" : "grooming");
  };

  // Клик по празно място в панел: на телефон избира този свят, на компютър отваря основния му линк.
  // (Не „stretched link“ през ::after — анимацията с transform на обвивката на бутона го ограничава.)
  const pick = (me: Exclude<Choice, null>, href: string) => (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    if (isMobile()) setChoice(me);
    else router.push(href);
  };

  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      data-choice={choice ?? "none"}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="choice relative overflow-hidden bg-sand"
    >
      <h1 id="hero-title" className="sr-only">
        Culte — козметика за кучета и Animal House — груминг салон в Пловдив
      </h1>

      {/* 01 — Culte, магазин */}
      <div className="choice-panel choice-panel-dark pattern pattern-scatter pattern-gold bg-espresso text-cream" data-state={stateOf("shop")} onClick={pick("shop", "/shop")}>
        <span className="choice-index text-gold">01 — Магазин</span>
        <div className="choice-body">
          <div className="choice-parallax" style={{ "--depth": "-16px" } as React.CSSProperties}>
            <div className="choice-logo choice-glow">
              <Image
                src="/brands/culte-c.png"
                alt="Culte"
                width={599}
                height={552}
                priority
                sizes="(min-width: 768px) 240px, 40vw"
                className="choice-logo-c choice-img-c h-auto"
              />
            </div>
          </div>
          <p className="choice-in choice-eyebrow text-gold" style={{ "--d": "650ms" } as React.CSSProperties}>
            Козметика за кучета
          </p>
          <h2 className="choice-in choice-title" style={{ "--d": "750ms" } as React.CSSProperties}>
            Culte
          </h2>
          <div className="choice-more">
            <p className="choice-in choice-text text-cream/70" style={{ "--d": "850ms" } as React.CSSProperties}>
              Продуктите, които ползваме в салона — за вкъщи, между двете посещения.
            </p>
            <div className="choice-in mt-8" style={{ "--d": "950ms" } as React.CSSProperties}>
              <Link href="/shop" className="choice-cta choice-cta-light">
                Към магазина
                <Arrow />
              </Link>
            </div>
          </div>
        </div>
        <span aria-hidden className="choice-vert text-gold">
          Магазин
        </span>
        <span className="choice-foot text-cream/45">Доставка със Speedy и BOX NOW</span>
      </div>

      {/* 02 — Animal House, груминг */}
      <div
        className="choice-panel choice-panel-light pattern pattern-bones bg-sand text-espresso"
        data-state={stateOf("grooming")}
        onClick={pick("grooming", "/booking")}
      >
        <span className="choice-index text-terracotta">02 — Груминг</span>
        <div className="choice-body">
          <div className="choice-parallax" style={{ "--depth": "14px" } as React.CSSProperties}>
            <div className="choice-logo">
              <Image
                src="/brands/animal-house.png"
                alt="Animal House Grooming Salon"
                width={537}
                height={465}
                priority
                sizes="(min-width: 768px) 300px, 50vw"
                className="choice-logo-ah choice-img-ah h-auto"
              />
            </div>
          </div>
          <p className="choice-in choice-eyebrow text-terracotta" style={{ "--d": "700ms" } as React.CSSProperties}>
            Груминг салон в Пловдив
          </p>
          <h2 className="choice-in choice-title" style={{ "--d": "800ms" } as React.CSSProperties}>
            Animal House
          </h2>
          <div className="choice-more">
            <p className="choice-in choice-text text-espresso/70" style={{ "--d": "900ms" } as React.CSSProperties}>
              Спокойна грижа с едно куче наведнъж — баня, подсушаване и подстригване.
            </p>
            <div
              className="choice-in mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-4"
              style={{ "--d": "1000ms" } as React.CSSProperties}
            >
              <Link href="/booking" className="choice-cta choice-cta-dark">
                Запази час
                <Arrow />
              </Link>
              <Link href="/grooming" className="link-underline relative z-10 text-[15px]">
                Услуги и цени
              </Link>
            </div>
          </div>
        </div>
        <span aria-hidden className="choice-vert text-terracotta">
          Груминг
        </span>
        <span className="choice-foot text-espresso/50">{address}</span>
      </div>

      {/* Границата: златна линия + медальон, следват --seam */}
      <span aria-hidden className="choice-divider" />
      <Medallion />

      {/* Телефон: превключвател в центъра */}
      <div role="group" aria-label="Изберете магазин или груминг" className="choice-switch">
        <span aria-hidden className="choice-switch-thumb" />
        <button type="button" aria-pressed={choice === "shop"} onClick={() => setChoice("shop")} className={cn(choice === "shop" && "is-on")}>
          Магазин
        </button>
        <button
          type="button"
          aria-pressed={choice === "grooming"}
          onClick={() => setChoice("grooming")}
          className={cn(choice === "grooming" && "is-on")}
        >
          Груминг
        </button>
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="choice-arrow size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Медальон на границата: „&“ с въртящ се надпис. Само декоративен. */
function Medallion() {
  const r = 40;
  const len = 2 * Math.PI * r;
  return (
    <span aria-hidden className="choice-medallion">
      <svg viewBox="0 0 100 100" className="choice-ring absolute inset-0 size-full">
        <defs>
          <path id="choice-ring-path" d={`M50,50 m-${r},0 a${r},${r} 0 1,1 ${r * 2},0 a${r},${r} 0 1,1 -${r * 2},0`} />
        </defs>
        <text className="fill-espresso-soft text-[7.2px] uppercase" style={{ letterSpacing: "0.12em" }}>
          <textPath href="#choice-ring-path" textLength={len.toFixed(1)} lengthAdjust="spacing">
            {RING_TEXT}
          </textPath>
        </text>
      </svg>
      <span className="choice-amp relative font-serif leading-none text-terracotta">&amp;</span>
    </span>
  );
}
