import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

export const inputClass =
  "block w-full rounded-md border border-line bg-cream px-3.5 py-2.5 text-[15px] text-espresso placeholder:text-espresso/40 transition-colors focus:border-espresso focus:bg-cream focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-sand-deep/80 aria-[invalid=true]:border-danger";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-espresso">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-espresso-soft">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "min-h-24", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(inputClass, "pr-8", className)} {...props} />;
}
