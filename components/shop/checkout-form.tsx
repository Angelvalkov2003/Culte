"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { placeOrder } from "@/app/(site)/checkout/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Checkbox, CheckboxCard } from "@/components/ui/checkbox";
import { cn, formatEUR, round2 } from "@/lib/format";
import type { ShippingMethod } from "@/lib/types";
import { ShippingPicker, type ShippingState } from "@/components/shop/shipping-picker";
import { revealFirstError } from "@/lib/scroll";

export function CheckoutForm({
  manualMethods,
  speedyEnabled,
  boxnow,
  subtotal,
  items,
}: {
  manualMethods: ShippingMethod[];
  speedyEnabled: boolean;
  boxnow: { enabled: boolean; price: number; partnerId: string | null };
  subtotal: number;
  items: { id: string; name: string; quantity: number; total: number }[];
}) {
  const [ship, setShip] = useState<ShippingState>({ selection: null, price: null, deadline: null, loading: false, error: null });
  const [payment, setPayment] = useState<"stripe" | "cod">("stripe");
  const [f, setF] = useState({ name: "", email: "", phone: "", note: "", terms: false, invoice: false, invoiceCompany: "", invoiceEik: "", invoiceVat: "", invoiceAddress: "", invoiceMol: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const shipping = ship.price;
  const total = round2(subtotal + (shipping ?? 0));
  const shippingReady = Boolean(ship.selection) && shipping != null && !ship.loading && !ship.error;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!ship.selection || shipping == null) {
      setError(ship.error ?? "Изберете начин на доставка и попълнете нужните полета.");
      revealFirstError(formRef.current);
      return;
    }
    const selection = ship.selection;
    const shippingPrice = shipping;
    start(async () => {
      const r = await placeOrder({
        ...f,
        terms: f.terms as true,
        shipping: selection,
        clientShippingPrice: shippingPrice,
        clientTotal: total,
        paymentMethod: payment,
      });
      if (r.ok) {
        window.location.assign(r.redirect);
        return;
      }
      setError(r.error);
      setErrors(r.fieldErrors ?? {});
      revealFirstError(formRef.current);
    });
  }

  const set = (k: Exclude<keyof typeof f, "terms" | "invoice">) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="mt-10 grid gap-10 lg:grid-cols-12">
      <div className="space-y-10 lg:col-span-7">
        <fieldset className="space-y-5">
          <legend className="font-serif text-2xl">Данни за контакт</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Име и фамилия" htmlFor="name" error={errors.name} className="sm:col-span-2">
              <Input id="name" autoComplete="name" value={f.name} onChange={set("name")} aria-invalid={!!errors.name} />
            </Field>
            <Field label="Имейл" htmlFor="email" error={errors.email}>
              <Input id="email" type="email" autoComplete="email" value={f.email} onChange={set("email")} aria-invalid={!!errors.email} />
            </Field>
            <Field label="Телефон" htmlFor="phone" error={errors.phone}>
              <Input id="phone" type="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} aria-invalid={!!errors.phone} />
            </Field>
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-serif text-2xl">Доставка</legend>
          <ShippingPicker
            subtotal={subtotal}
            manualMethods={manualMethods}
            speedyEnabled={speedyEnabled}
            boxnow={boxnow}
            errors={errors}
            onChange={setShip}
          />
          <Field label="Бележка (по желание)" htmlFor="note" className="mt-5">
            <Textarea id="note" rows={2} value={f.note} onChange={set("note")} maxLength={1000} />
          </Field>
        </fieldset>

        <fieldset>
          <legend className="font-serif text-2xl">Фактура</legend>
          <CheckboxCard
            className="mt-4"
            checked={f.invoice}
            onChange={(e) => setF({ ...f, invoice: e.target.checked })}
            title="Искам фактура"
            description="За фирма или физическо лице — попълнете данните за фактурата."
          />
          {f.invoice && (
            <div className="mt-4 grid animate-rise gap-4 rounded-lg border border-line bg-white/40 p-4 sm:grid-cols-2 sm:p-5">
              <Field label="Фирма / име" htmlFor="invoiceCompany" error={errors.invoiceCompany} className="sm:col-span-2">
                <Input id="invoiceCompany" value={f.invoiceCompany} onChange={set("invoiceCompany")} aria-invalid={!!errors.invoiceCompany} />
              </Field>
              <Field label="ЕИК / ЕГН" htmlFor="invoiceEik" error={errors.invoiceEik}>
                <Input id="invoiceEik" inputMode="numeric" value={f.invoiceEik} onChange={set("invoiceEik")} aria-invalid={!!errors.invoiceEik} />
              </Field>
              <Field label="ДДС номер (ако има)" htmlFor="invoiceVat">
                <Input id="invoiceVat" value={f.invoiceVat} onChange={set("invoiceVat")} />
              </Field>
              <Field label="Адрес по регистрация" htmlFor="invoiceAddress" error={errors.invoiceAddress}>
                <Input id="invoiceAddress" value={f.invoiceAddress} onChange={set("invoiceAddress")} aria-invalid={!!errors.invoiceAddress} />
              </Field>
              <Field label="МОЛ" htmlFor="invoiceMol">
                <Input id="invoiceMol" value={f.invoiceMol} onChange={set("invoiceMol")} />
              </Field>
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className="font-serif text-2xl">Плащане</legend>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {([
              ["stripe", "С карта", "Сигурно плащане през Stripe."],
              ["cod", "Наложен платеж", "Плащате на куриера при получаване."],
            ] as const).map(([value, label, hint]) => (
              <label key={value} className={cn("flex cursor-pointer items-start gap-3 rounded-md border p-4",
                payment === value ? "border-terracotta bg-sand/60" : "border-line hover:border-clay")}>
                <input type="radio" name="payment" className="mt-1 size-4 accent-terracotta" checked={payment === value}
                  onChange={() => setPayment(value)} />
                <span>
                  <span className="block font-medium">{label}</span>
                  <span className="block text-sm text-espresso-soft">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <aside className="lg:col-span-5" aria-label="Вашата поръчка">
        <div className="rounded-lg bg-sand p-6 pattern pattern-grid lg:sticky lg:top-24">
          <h2 className="font-sans text-sm font-semibold">Вашата поръчка</h2>
          <ul className="mt-4 space-y-2 text-[15px]">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4">
                <span>
                  {i.name} <span className="text-espresso-soft">× {i.quantity}</span>
                </span>
                <span className="shrink-0 tabular-nums">{formatEUR(i.total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-espresso/10 pt-4 text-[15px]">
            <div className="flex justify-between"><dt>Продукти</dt><dd className="tabular-nums">{formatEUR(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Доставка</dt><dd className="tabular-nums">{shipping == null ? "—" : shipping === 0 ? "Безплатна" : formatEUR(shipping)}</dd></div>
            <div className="flex justify-between text-lg font-semibold"><dt>Общо</dt><dd className="tabular-nums">{formatEUR(total)}</dd></div>
          </dl>
          <Checkbox className="mt-6 text-sm" checked={f.terms}
            onChange={(e) => setF({ ...f, terms: e.target.checked })} aria-invalid={!!errors.terms}>
            Приемам <Link href="/terms" target="_blank" className="link-underline">общите условия</Link> и{" "}
            <Link href="/shipping-returns" target="_blank" className="link-underline">условията за доставка и връщане</Link>.
          </Checkbox>
          {errors.terms && <p className="mt-1 text-sm text-danger" role="alert">{errors.terms}</p>}
          {error && <p role="alert" className="mt-4 rounded-md border border-danger/30 bg-cream p-3 text-sm text-danger">{error}</p>}
          <p className="mt-6 text-sm text-espresso-soft">
            {payment === "stripe" ? `След поръчката ще платите ${formatEUR(total)} с карта през Stripe.` : `Ще платите ${formatEUR(total)} на куриера при получаване.`}
          </p>
          <Button type="submit" size="lg" className="mt-3 w-full" disabled={pending || !shippingReady}>
            {pending ? "Обработваме…" : "Поръчка с задължение за плащане"}
          </Button>
        </div>
      </aside>
    </form>
  );
}
