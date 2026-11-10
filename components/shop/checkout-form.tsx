"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { placeOrder } from "@/app/(site)/checkout/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { cn, formatEUR, round2 } from "@/lib/format";
import { shippingQuote } from "@/lib/shipping";
import type { ShippingMethod } from "@/lib/types";

export function CheckoutForm({
  methods,
  subtotal,
  items,
}: {
  methods: ShippingMethod[];
  subtotal: number;
  items: { id: string; name: string; quantity: number; total: number }[];
}) {
  const [shippingId, setShippingId] = useState(methods[0]?.id ?? "");
  const [payment, setPayment] = useState<"stripe" | "cod">("stripe");
  const [f, setF] = useState({ name: "", email: "", phone: "", city: "", address: "", note: "", terms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const method = methods.find((m) => m.id === shippingId);
  const shipping = method ? shippingQuote(method, subtotal) : 0;
  const total = round2(subtotal + shipping);
  const needsAddress = method?.delivery !== "pickup";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await placeOrder({ ...f, terms: f.terms as true, shippingMethodId: shippingId, paymentMethod: payment });
      if (r.ok) {
        window.location.assign(r.redirect);
        return;
      }
      setError(r.error);
      setErrors(r.fieldErrors ?? {});
    });
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <form onSubmit={submit} noValidate className="mt-10 grid gap-10 lg:grid-cols-12">
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
          {methods.length === 0 ? (
            <p className="mt-3 text-sm text-danger">В момента няма активни методи на доставка.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {methods.map((m) => {
                const price = shippingQuote(m, subtotal);
                return (
                  <label key={m.id} className={cn("flex cursor-pointer items-start gap-3 rounded-md border p-4",
                    shippingId === m.id ? "border-terracotta bg-sand/60" : "border-line hover:border-clay")}>
                    <input type="radio" name="shipping" className="mt-1 size-4 accent-terracotta" checked={shippingId === m.id}
                      onChange={() => setShippingId(m.id)} />
                    <span className="flex-1">
                      <span className="block font-medium">{m.name}</span>
                      {m.description && <span className="block text-sm text-espresso-soft">{m.description}</span>}
                      {m.free_over != null && price > 0 && (
                        <span className="block text-sm text-espresso-soft">Безплатна над {formatEUR(m.free_over)}</span>
                      )}
                    </span>
                    <span className="tabular-nums">{price === 0 ? "Безплатна" : formatEUR(price)}</span>
                  </label>
                );
              })}
            </div>
          )}
          {needsAddress && (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Град" htmlFor="city" error={errors.city}>
                <Input id="city" autoComplete="address-level2" value={f.city} onChange={set("city")} aria-invalid={!!errors.city} />
              </Field>
              <Field
                label={method?.delivery === "office" ? "Офис на куриера" : "Адрес"}
                htmlFor="address"
                error={errors.address}
                hint={method?.delivery === "office" ? "Име или адрес на офиса." : "Улица, номер, блок, вход, етаж."}
              >
                <Input id="address" autoComplete={method?.delivery === "office" ? "off" : "street-address"} value={f.address}
                  onChange={set("address")} aria-invalid={!!errors.address} />
              </Field>
            </div>
          )}
          <Field label="Бележка (по желание)" htmlFor="note" className="mt-5">
            <Textarea id="note" rows={2} value={f.note} onChange={set("note")} maxLength={1000} />
          </Field>
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
        <div className="rounded-lg bg-sand p-6 lg:sticky lg:top-24">
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
            <div className="flex justify-between"><dt>Доставка</dt><dd className="tabular-nums">{shipping === 0 ? "Безплатна" : formatEUR(shipping)}</dd></div>
            <div className="flex justify-between text-lg font-semibold"><dt>Общо</dt><dd className="tabular-nums">{formatEUR(total)}</dd></div>
          </dl>
          <label className="mt-6 flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-terracotta" checked={f.terms}
              onChange={(e) => setF({ ...f, terms: e.target.checked })} aria-invalid={!!errors.terms} />
            <span>
              Приемам <Link href="/terms" target="_blank" className="link-underline">общите условия</Link> и{" "}
              <Link href="/shipping-returns" target="_blank" className="link-underline">условията за доставка и връщане</Link>.
            </span>
          </label>
          {errors.terms && <p className="mt-1 text-sm text-danger" role="alert">{errors.terms}</p>}
          {error && <p role="alert" className="mt-4 rounded-md border border-danger/30 bg-cream p-3 text-sm text-danger">{error}</p>}
          <Button type="submit" size="lg" className="mt-6 w-full" disabled={pending || !methods.length}>
            {pending ? "Обработваме…" : payment === "stripe" ? `Плати ${formatEUR(total)}` : "Потвърди поръчката"}
          </Button>
        </div>
      </aside>
    </form>
  );
}
