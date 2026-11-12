import type { ReactNode } from "react";

export function LegalPage({
  title,
  updated,
  incomplete = false,
  children,
}: {
  title: string;
  updated: string;
  incomplete?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="container-page pt-12">
      <div className="grid gap-10 md:grid-cols-12">
        <header className="md:col-span-4">
          <h1 className="text-5xl">{title}</h1>
          <p className="mt-4 text-sm text-espresso-soft">В сила от: {updated}</p>
          {incomplete && (
            <p className="mt-3 rounded-md border border-clay/50 bg-sand p-3 text-sm">
              Данните в квадратни скоби се попълват от администратора: Настройки → Търговец.
            </p>
          )}
        </header>
        <article className="prose-culte md:col-span-7 md:col-start-6">{children}</article>
      </div>
    </div>
  );
}

export const LEGAL_UPDATED = "11 ноември 2026 г.";
