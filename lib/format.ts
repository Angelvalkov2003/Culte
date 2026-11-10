import { clsx, type ClassValue } from "clsx";

export const cn = (...v: ClassValue[]) => clsx(v);

const eur = new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR" });

export function formatEUR(value: number | string): string {
  return eur.format(Number(value));
}

export function formatRange(from: number | string, to: number | string): string {
  return Number(from) === Number(to) ? formatEUR(from) : `${formatEUR(from)} – ${formatEUR(to)}`;
}

export function toCents(value: number | string): number {
  return Math.round(Number(value) * 100);
}

/** Закръгляне до 2 знака без грешки с плаваща запетая. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} мин`;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

export function formatDuration(a: number, b: number): string {
  return a === b ? formatMinutes(a) : `${formatMinutes(a)} – ${formatMinutes(b)}`;
}

export function slugify(input: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l",
    м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch",
    ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya",
  };
  return input
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
