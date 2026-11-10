import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="container-page pt-12">
      <div className="grid gap-10 md:grid-cols-12">
        <header className="md:col-span-4">
          <h1 className="text-5xl">{title}</h1>
          <p className="mt-4 text-sm text-espresso-soft">Последна редакция: {updated}</p>
          <p className="mt-2 text-sm text-espresso-soft">
            Данните в квадратни скоби се попълват от търговеца преди публикуване.
          </p>
        </header>
        <article className="prose-culte md:col-span-7 md:col-start-6">{children}</article>
      </div>
    </div>
  );
}

export const COMPANY = {
  name: "[Наименование на търговеца]",
  eik: "[ЕИК]",
  seat: "[Седалище и адрес на управление]",
  email: "[имейл за контакт]",
  phone: "0878 817 088",
  salon: "гр. Пловдив, ж.к. Оазис 3 / ул. Димитър Талев 144",
};
