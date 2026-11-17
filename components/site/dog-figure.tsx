import Image from "next/image";
import { cn } from "@/lib/format";

/** Изрязани снимки (прозрачен фон) в public/dogs. Размерите са реалните в пиксели. */
export const DOGS = {
  foam: { src: "/dogs/foam-towel.png", w: 771, h: 1010, alt: "Мокро куче с пяна на главата, увито в бяла хавлия" },
  puppy: { src: "/dogs/puppy-towel.png", w: 428, h: 413, alt: "Пухкаво кученце, увито в кремава хавлия" },
  peach: { src: "/dogs/peach-towel.png", w: 310, h: 220, alt: "Куче след баня, увито в хавлия" },
  blue: { src: "/dogs/blue-towel.png", w: 347, h: 344, alt: "Куче, завито със синя хавлия" },
  yorkieScissors: { src: "/dogs/yorkie-cut.png", w: 311, h: 373, alt: "Йоркширски териер по време на подстригване с ножица и гребен" },
  shihtzu: { src: "/dogs/shihtzu-brush.png", w: 278, h: 201, alt: "Ши-тцу, което се разресва и подстригва" },
  yorkieSalon: { src: "/dogs/yorkie-cosmetics.png", w: 1344, h: 1049, alt: "Йоркширски териер сред четки и козметика за кучета" },
  poodleGold: { src: "/dog9.png", w: 1086, h: 1448, alt: "Черен пудел след подстригване, със златна папийонка" },
  poodleViolet: { src: "/dog8.png", w: 1086, h: 1448, alt: "Черен пудел с лилава папийонка с пайети" },
} as const;

export type DogKey = keyof typeof DOGS;

const TONES = {
  sand: "bg-sand",
  "sand-deep": "bg-sand-deep",
  clay: "bg-clay/45",
  terracotta: "bg-terracotta",
  olive: "bg-olive/30",
  espresso: "bg-espresso",
} as const;

/** Сянка само встрани и отгоре — долният ръб на снимката е прав и стъпва на ръба на блока. */
const SHADOW = "drop-shadow-[0_14px_18px_rgba(18,18,18,0.14)] [clip-path:inset(-40%_0_0_0)]";

/** Изрязаното куче, само (без фон). Ширина се задава с className. */
export function DogCutout({
  dog,
  className,
  sizes = "320px",
  priority,
}: {
  dog: DogKey;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const d = DOGS[dog];
  return (
    <Image
      src={d.src}
      width={d.w}
      height={d.h}
      alt={d.alt}
      sizes={sizes}
      priority={priority}
      className={cn("pointer-events-none h-auto select-none", SHADOW, className)}
    />
  );
}

/**
 * Куче, което „излиза“ от цветен блок: блокът покрива долните ~60% от кучето, главата е над него.
 * Квадратна рамка; ширината и височината на блока се смятат от пропорциите на снимката,
 * така че и широките, и високите снимки да „стъпват“ еднакво.
 */
export function PopOut({
  dog,
  tone = "sand-deep",
  className,
  blockClassName,
  sizes = "(min-width: 1024px) 300px, 50vw",
  priority,
}: {
  dog: DogKey;
  tone?: keyof typeof TONES;
  className?: string;
  blockClassName?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const d = DOGS[dog];
  const ratio = d.h / d.w;
  const width = Math.min(1, 0.94 / ratio); // дял от ширината на рамката
  const height = width * ratio; // дял от височината (рамката е квадрат)
  const block = Math.max(0.4, height * 0.6);
  return (
    <figure className={cn("relative aspect-square", className)}>
      <div aria-hidden className={cn("absolute inset-x-0 bottom-0 rounded-lg", TONES[tone], blockClassName)} style={{ height: `${block * 100}%` }} />
      <Image
        src={d.src}
        alt={d.alt}
        width={d.w}
        height={d.h}
        sizes={sizes}
        priority={priority}
        style={{ width: `${width * 100}%` }}
        className={cn(
          "pointer-events-none absolute bottom-0 left-1/2 h-auto -translate-x-1/2 select-none transition-transform duration-500 ease-out origin-bottom group-hover:scale-[1.03]",
          SHADOW,
        )}
      />
    </figure>
  );
}
