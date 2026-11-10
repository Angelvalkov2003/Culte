import type { ReactNode } from "react";
import { cn } from "@/lib/format";

export function PageHeader({ title, actions, children }: { title: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl">{title}</h1>
        {children && <div className="mt-2 text-sm text-espresso-soft">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-line bg-white/60 p-5", className)}>
      {title && <h2 className="mb-4 font-sans text-sm font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

const TONES: Record<string, string> = {
  pending_payment: "bg-clay/20 text-espresso",
  confirmed: "bg-olive/15 text-olive",
  completed: "bg-espresso/10 text-espresso",
  cancelled: "bg-danger/10 text-danger",
  expired: "bg-espresso/5 text-espresso/60",
  new: "bg-terracotta/15 text-terracotta-dark",
  processing: "bg-clay/20 text-espresso",
  shipped: "bg-olive/15 text-olive",
  delivered: "bg-espresso/10 text-espresso",
  stock_issue: "bg-danger/15 text-danger",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={cn("inline-block rounded-sm px-2 py-0.5 text-xs font-medium whitespace-nowrap", TONES[status] ?? "bg-sand")}>
      {label}
    </span>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-white/60">
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th scope="col" className={cn("border-b border-line px-4 py-3 font-medium text-espresso-soft", className)}>{children}</th>;
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-line/70 px-4 py-3 align-middle", className)}>{children}</td>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-espresso-soft">{children}</p>;
}
