import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "light" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-espresso text-cream hover:bg-espresso/90",
  secondary: "border border-espresso/20 text-espresso hover:border-espresso hover:bg-sand",
  ghost: "text-espresso hover:bg-sand",
  light: "bg-cream text-espresso hover:bg-sand",
  danger: "border border-danger/40 text-danger hover:bg-danger hover:text-cream",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
