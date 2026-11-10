import type { Metadata } from "next";
import { COMPANY, LegalPage } from "@/components/site/legal-page";
import { getShippingMethods } from "@/lib/shop/catalog";
import { formatEUR } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Доставка и връщане",
  description: "Начини и цени на доставка, 14-дневно право на отказ и връщане на продукти от Culte.",
  alternates: { canonical: "/shipping-returns" },
};

export default async function ShippingReturnsPage() {
  const methods = await getShippingMethods();
  return (
    <LegalPage title="Доставка и връщане" updated="ноември 2026">
      <h2>Доставка</h2>
      {methods.length > 0 ? (
        <ul>
          {methods.map((m) => (
            <li key={m.id}>
              <strong>{m.name}</strong> — {Number(m.price) === 0 ? "безплатна" : formatEUR(m.price)}
              {m.free_over != null && Number(m.price) > 0 && `, безплатна при поръчка над ${formatEUR(m.free_over)}`}.
              {m.description && ` ${m.description}`}
            </li>
          ))}
        </ul>
      ) : (
        <p>Доставяме в цяла България до адрес или офис на куриер.</p>
      )}
      <p>Поръчките се обработват в рамките на 1 работен ден. Ще получите имейл, когато пратката бъде изпратена.</p>

      <h2>Право на отказ — 14 дни</h2>
      <p>
        Имате право да се откажете от покупката без да посочвате причина в срок от 14 дни от получаването на продуктите
        (чл. 50 от Закона за защита на потребителите). За целта ни уведомете на {COMPANY.email} или на {COMPANY.phone} с
        номера на поръчката.
      </p>
      <ul>
        <li>Върнете продуктите до 14 дни след уведомлението, неотворени и в оригиналната опаковка.</li>
        <li>
          Козметичните продукти, които са отворени или с нарушена защитна опаковка, не могат да бъдат върнати по хигиенни
          причини (чл. 57, т. 5 от ЗЗП).
        </li>
        <li>Разходите за обратната доставка са за ваша сметка, освен ако продуктът е дефектен или сме сгрешили поръчката.</li>
        <li>Връщаме сумата до 14 дни след получаване на продуктите, по същия начин, по който е платено.</li>
      </ul>

      <h2>Дефектни или сгрешени продукти</h2>
      <p>
        Ако получите повреден или различен продукт, свържете се с нас до 3 дни след получаването. Ще го заменим или ще
        върнем сумата изцяло, включително доставката.
      </p>
    </LegalPage>
  );
}
