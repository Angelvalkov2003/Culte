import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

/** Квадратче в стила на сайта: истински input (достъпност/формуляри), рисувана отметка. */
export function CheckboxBox({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return (
    <span className={cn("relative inline-flex size-5 shrink-0", className)}>
      <input
        type="checkbox"
        className="peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-sm border border-clay bg-white/80 transition-colors checked:border-terracotta checked:bg-terracotta hover:border-terracotta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta aria-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      />
      <svg
        viewBox="0 0 16 16"
        aria-hidden
        className="pointer-events-none absolute inset-0 m-auto size-3.5 scale-50 text-cream opacity-0 transition-[opacity,transform] duration-150 peer-checked:scale-100 peer-checked:opacity-100"
      >
        <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** Ред с квадратче и текст. */
export function Checkbox({
  children,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { children: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-[15px]", className)}>
      <CheckboxBox className="mt-0.5" {...props} />
      <span>{children}</span>
    </label>
  );
}

/** По-голяма „карта“ за опции като „Искам фактура“. */
export function CheckboxCard({
  title,
  description,
  checked,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type" | "title"> & { title: ReactNode; description?: ReactNode }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors sm:p-5",
        checked ? "border-terracotta bg-sand/60" : "border-line bg-white/40 hover:border-clay",
        className,
      )}
    >
      <CheckboxBox className="mt-0.5" checked={checked} {...props} />
      <span>
        <span className="block font-medium">{title}</span>
        {description && <span className="mt-0.5 block text-sm text-espresso-soft">{description}</span>}
      </span>
    </label>
  );
}
