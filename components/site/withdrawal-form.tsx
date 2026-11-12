"use client";

import { useState, useTransition } from "react";
import { submitWithdrawal, type WithdrawalResult } from "@/app/(site)/withdrawal/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/format";

export function WithdrawalForm() {
  const [kind, setKind] = useState<"order" | "booking">("order");
  const [f, setF] = useState({ reference: "", name: "", email: "", items: "", reason: "" });
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [res, setRes] = useState<WithdrawalResult | null>(null);
  const [pending, start] = useTransition();
  const errors = res && !res.ok ? (res.fieldErrors ?? {}) : {};
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  if (res?.ok) {
    return (
      <div role="status" className="rounded-lg bg-sand p-6">
        <p className="font-serif text-2xl">Отказът е получен</p>
        <p className="mt-2 text-[15px] text-espresso-soft">
          Заявление О-{res.number}, получено на {new Date(res.at).toLocaleString("bg-BG", { timeZone: "Europe/Sofia" })}. Запазете
          този номер — това е потвърждението, че сме получили отказа.
        </p>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (step === "form") {
          setRes(null);
          setStep("confirm");
          return;
        }
        start(async () => {
          const r = await submitWithdrawal({ kind, ...f });
          setRes(r);
          if (!r.ok) setStep("form");
        });
      }}
      className="space-y-5"
    >
      <fieldset>
        <legend className="text-sm font-medium">Отказвам се от</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {([["order", "Поръчка от магазина"], ["booking", "Резервация за груминг"]] as const).map(([v, l]) => (
            <label key={v} className={cn("flex cursor-pointer items-center gap-3 rounded-md border p-3.5 text-[15px]",
              kind === v ? "border-terracotta bg-sand/60" : "border-line")}>
              <input type="radio" name="kind" checked={kind === v} onChange={() => { setKind(v); setStep("form"); }} className="size-4 accent-terracotta" disabled={step === "confirm"} />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={kind === "order" ? "Номер на поръчката" : "Номер на резервацията"} htmlFor="reference" error={errors.reference}
          hint="Показва се на екрана след поръчката или резервацията.">
          <Input id="reference" inputMode="numeric" value={f.reference} onChange={set("reference")} readOnly={step === "confirm"} aria-invalid={!!errors.reference} />
        </Field>
        <Field label="Имейл, с който сте поръчали" htmlFor="w-email" error={errors.email}>
          <Input id="w-email" type="email" autoComplete="email" value={f.email} onChange={set("email")} readOnly={step === "confirm"} aria-invalid={!!errors.email} />
        </Field>
        <Field label="Име и фамилия" htmlFor="w-name" error={errors.name} className="sm:col-span-2">
          <Input id="w-name" autoComplete="name" value={f.name} onChange={set("name")} readOnly={step === "confirm"} aria-invalid={!!errors.name} />
        </Field>
        {kind === "order" && (
          <Field label="Кои продукти връщате (по желание)" htmlFor="w-items" hint="Празно означава цялата поръчка." className="sm:col-span-2">
            <Textarea id="w-items" rows={2} value={f.items} onChange={set("items")} readOnly={step === "confirm"} />
          </Field>
        )}
        <Field label="Причина (не е задължително)" htmlFor="w-reason" className="sm:col-span-2">
          <Textarea id="w-reason" rows={2} value={f.reason} onChange={set("reason")} readOnly={step === "confirm"} />
        </Field>
      </div>

      {res && !res.ok && <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{res.error}</p>}

      {step === "form" ? (
        <Button type="submit" size="lg">Отказ от договора тук</Button>
      ) : (
        <div className="space-y-3 rounded-lg border border-terracotta/40 bg-sand/60 p-5">
          <p className="text-[15px]">Проверете данните. С натискане на бутона изпращате изявление за отказ от договора.</p>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" disabled={pending}>{pending ? "Изпращаме…" : "Потвърдете отказа"}</Button>
            <Button type="button" variant="ghost" onClick={() => setStep("form")} disabled={pending}>Редактирай</Button>
          </div>
        </div>
      )}
    </form>
  );
}
