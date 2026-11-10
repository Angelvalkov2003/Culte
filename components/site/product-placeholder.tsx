import { cn } from "@/lib/format";

/** Елегантен placeholder за продукт без снимка: пясъчен фон, монограм и категорията. */
export function ProductPlaceholder({
  category,
  name,
  className,
  large = false,
}: {
  category?: string | null;
  name: string;
  className?: string;
  large?: boolean;
}) {
  // Лек вариант на тона по името, за да не изглеждат всички еднакво
  const tones = ["bg-sand", "bg-sand-deep/70", "bg-[#EFE4D3]", "bg-[#EDE6D6]"];
  const tone = tones[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % tones.length];
  return (
    <div
      className={cn("relative flex h-full w-full flex-col justify-between overflow-hidden p-5", tone, className)}
      aria-hidden="true"
    >
      <span className="text-[13px] text-espresso-soft">{category ?? "Culte"}</span>
      <span
        className={cn(
          "pointer-events-none absolute -right-[6%] -bottom-[18%] font-serif leading-none text-clay/25 select-none",
          large ? "text-[22rem]" : "text-[13rem]",
        )}
      >
        C
      </span>
      <span className={cn("relative max-w-[85%] font-serif text-espresso/80", large ? "text-3xl" : "text-lg leading-snug")}>
        Culte
      </span>
    </div>
  );
}
