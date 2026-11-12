import type { Metadata } from "next";
import Link from "next/link";
import { companyInfo, getSettings } from "@/lib/settings";
import { WithdrawalForm } from "@/components/site/withdrawal-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Отказ от договор",
  description: "Онлайн отказ от поръчка или резервация в 14-дневния срок, със стандартен формуляр.",
  alternates: { canonical: "/withdrawal" },
};

export default async function WithdrawalPage() {
  const c = companyInfo(await getSettings());
  return (
    <div className="container-page pt-12">
      <div className="grid gap-12 md:grid-cols-12">
        <header className="md:col-span-4">
          <h1 className="text-5xl">Отказ от договор</h1>
          <p className="mt-4 text-[15px] leading-7 text-espresso-soft">
            Имате право да се откажете от покупка в 14-дневен срок от получаването на продуктите, без да посочвате причина.
            Попълнете формуляра — веднага ще видите номера и часа на заявлението.
          </p>
          <p className="mt-4 text-sm text-espresso-soft">
            Условия и изключения: <Link href="/shipping-returns" className="link-underline">Доставка и връщане</Link>.
          </p>
        </header>
        <div className="md:col-span-7 md:col-start-6">
          <WithdrawalForm />

          <section aria-labelledby="std-form" className="prose-culte mt-16 border-t border-line pt-8">
            <h2 id="std-form">Стандартен формуляр за упражняване правото на отказ</h2>
            <p className="text-sm">
              (Приложение № 6 към чл. 52, ал. 1, т. 1 от Закона за защита на потребителите.) Можете да го изпратите и по имейл
              вместо онлайн формуляра.
            </p>
            <div className="rounded-md bg-sand p-5 text-sm leading-7 text-espresso">
              <p>
                До {c.name}, {c.address}, {c.email}:
              </p>
              <p>
                С настоящото уведомявам/уведомяваме*, че се отказвам/отказваме* от сключения от мен/нас* договор за покупка на
                следните стоки*/за предоставяне на следната услуга*: ............................................
              </p>
              <p>Поръчано на*/получено на*: ..................</p>
              <p>Име на потребителя/ите: ..................</p>
              <p>Адрес на потребителя/ите: ..................</p>
              <p>Подпис на потребителя/ите (само ако формулярът е на хартия): ..................</p>
              <p>Дата: ..................</p>
              <p className="text-xs text-espresso-soft">* Ненужното се зачертава.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
