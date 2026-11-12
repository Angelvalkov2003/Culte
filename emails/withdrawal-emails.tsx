import { formatDateTime } from "@/lib/time";
import type { WithdrawalRequest } from "@/lib/types";
import { EmailLayout, P, Rows } from "./components";

function rows(w: WithdrawalRequest): [string, string][] {
  return [
    ["Номер на заявлението", `О-${w.number}`],
    ["Получено на", formatDateTime(w.created_at)],
    [w.kind === "order" ? "Поръчка №" : "Резервация №", w.reference],
    ["Име", w.customer_name],
    ["Имейл", w.customer_email],
    ["Отказ от", w.items || (w.kind === "order" ? "цялата поръчка" : "резервацията")],
    ...(w.reason ? ([["Причина", w.reason]] as [string, string][]) : []),
  ];
}

/** Потвърждение на траен носител (чл. 11а, ал. 4 от Директива 2011/83/ЕС). */
export function WithdrawalReceivedEmail({ w }: { w: WithdrawalRequest }) {
  return (
    <EmailLayout preview={`Получихме отказа ви — заявление О-${w.number}`} title="Получихме отказа ви от договора">
      <P>
        Здравейте, {w.customer_name}! Потвърждаваме, че на {formatDateTime(w.created_at)} получихме вашето изявление за
        отказ от договора. Пазете този имейл като доказателство.
      </P>
      <Rows rows={rows(w)} />
      {w.kind === "order" ? (
        <P>
          Моля, върнете продуктите до 14 дни, неотворени и в оригиналната опаковка. Ще върнем сумата до 14 дни от
          получаването им, по същия начин, по който сте платили. Ще се свържем с вас с указания за връщането.
        </P>
      ) : (
        <P>Ще се свържем с вас до един работен ден. Ако услугата още не е извършена, капарото ще бъде върнато по картата ви.</P>
      )}
    </EmailLayout>
  );
}

export function WithdrawalAdminEmail({ w }: { w: WithdrawalRequest }) {
  return (
    <EmailLayout preview={`Отказ от договор О-${w.number}`} title={`Нов отказ от договор О-${w.number}`}>
      <P>Клиентът е получил автоматично потвърждение. Обработете заявлението в админ панела → Откази.</P>
      <Rows rows={rows(w)} />
    </EmailLayout>
  );
}
