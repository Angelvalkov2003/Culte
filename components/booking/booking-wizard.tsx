"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createBooking } from "@/app/(site)/booking/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatDuration, formatEUR, formatMinutes, formatRange } from "@/lib/format";
import { PRICE_NOTE, SERVICE_GROUP_LABEL, SIZE_HINT, SIZE_LABEL, type DogSize, type Service, type ServiceGroup } from "@/lib/types";
import { isRangePrice, serviceDeposit } from "@/lib/booking/deposit";
import { BookingCalendar } from "@/components/booking/booking-calendar";

const STEPS = ["Размер", "Услуги", "Дата и час", "Вашите данни", "Плащане"];

const SIZE_BREEDS: Record<DogSize, string> = {
  small: "Йоркширски териер, малтезе, чихуахуа, той пудел, померан",
  medium: "Ши-тцу, бишон, малтипу, кавалер кинг чарлз, мини пудел",
  large: "Кокер шпаньол, бигъл, голдън ретривър, лабрадор, хъски",
};
const GROUPS: ServiceGroup[] = ["package", "single", "care"];

function ServiceInfo({ s }: { s: Service }) {
  return (
    <span className="flex-1">
      <span className="block font-medium">{s.name}</span>
      {s.description && <span className="mt-0.5 block text-sm text-espresso-soft">{s.description}</span>}
      {s.includes && (
        <span className="mt-1.5 block text-sm leading-6">
          <span className="text-espresso-soft">Включва: </span>
          {s.includes}
        </span>
      )}
      {s.breeds && <span className="mt-1 block text-[13px] text-espresso-soft">Подходящо за: {s.breeds}</span>}
    </span>
  );
}

interface Availability {
  days: Record<string, string[]>;
  last: string;
  durationMin: number;
}

export function BookingWizard({ services, depositPercent }: { services: Service[]; depositPercent: number }) {
  const [step, setStep] = useState(0);
  const [size, setSize] = useState<DogSize | null>(null);
  const [mainId, setMainId] = useState<string | null>(null);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", dogName: "", dogBreed: "", message: "", terms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sized = useMemo(() => services.filter((s) => s.size === size), [services, size]);
  const mains = sized.filter((s) => !s.is_addon);
  const main = sized.find((s) => s.id === mainId) ?? null;
  const extras = sized.filter((s) => s.id !== mainId && (s.is_addon || s.addon_allowed));
  const chosen = useMemo(
    () => (main ? [main, ...addonIds.map((id) => sized.find((s) => s.id === id)).filter((s): s is Service => !!s)] : []),
    [main, addonIds, sized],
  );

  const totals = useMemo(() => {
    const from = chosen.reduce((s, x) => s + Number(x.price_from), 0);
    const to = chosen.reduce((s, x) => s + Number(x.price_to), 0);
    const duration = chosen.reduce((s, x) => s + x.duration_max, 0);
    const deposit = Math.round(chosen.reduce((s, x) => s + serviceDeposit(x, depositPercent), 0) * 100) / 100;
    const range = chosen.some(isRangePrice);
    return { from, to, duration, deposit, range, restFrom: from - deposit, restTo: to - deposit };
  }, [chosen, depositPercent]);

  const servicesKey = `${size}|${mainId}|${addonIds.join(",")}`;

  useEffect(() => {
    if (step !== 2 || !size || !mainId) return;
    const ctrl = new AbortController();
    const params = new URLSearchParams({ size, main: mainId, addons: addonIds.join(",") });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- зареждане на данни при смяна на стъпката
    setLoadingSlots(true);
    setSlotsError(null);
    fetch(`/api/booking/availability?${params}`, { signal: ctrl.signal, cache: "no-store" })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Грешка");
        setAvailability(json);
        setDate((d) => (d && json.days[d] ? d : null));
      })
      .catch((e) => {
        if (e.name !== "AbortError") setSlotsError("Не успяхме да заредим свободните часове. Опитайте отново.");
      })
      .finally(() => setLoadingSlots(false));
    return () => ctrl.abort();
    // servicesKey обобщава size/mainId/addonIds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, servicesKey]);

  const slotsForDate = date && availability ? (availability.days[date] ?? []) : [];

  function chooseSize(s: DogSize) {
    if (s !== size) {
      setMainId(null);
      setAddonIds([]);
      setDate(null);
      setTime(null);
    }
    setSize(s);
    setStep(1);
  }

  function toggleAddon(id: string) {
    setAddonIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    setTime(null);
  }

  function validateForm(): boolean {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Въведете име";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Въведете валиден имейл";
    if (!/^[+\d][\d\s()-]{6,20}$/.test(form.phone.trim())) e.phone = "Въведете валиден телефон";
    if (!form.dogName.trim()) e.dogName = "Въведете името на кучето";
    if (form.dogBreed.trim().length < 2) e.dogBreed = "Въведете породата";
    if (!form.terms) e.terms = "Необходимо е съгласие с условията";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function pay() {
    if (!size || !mainId || !date || !time) return;
    setSubmitError(null);
    startTransition(async () => {
      const res = await createBooking({ size, mainId, addonIds, date, time, ...form, terms: form.terms as true });
      if (res.ok) {
        window.location.assign(res.url);
        return;
      }
      setSubmitError(res.error);
      if (res.fieldErrors) {
        setErrors(res.fieldErrors);
        if (["name", "email", "phone", "dogName", "dogBreed", "terms"].some((k) => res.fieldErrors?.[k])) setStep(3);
      }
      if (/час/.test(res.error)) {
        setTime(null);
        setStep(2);
      }
    });
  }

  const canNext = [Boolean(size), Boolean(mainId), Boolean(date && time), true, true][step];

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <ol className="flex flex-wrap gap-x-6 gap-y-2 border-b border-line pb-4 text-sm" aria-label="Стъпки">
          {STEPS.map((label, i) => (
            <li key={label} aria-current={i === step ? "step" : undefined}>
              <button
                type="button"
                disabled={i > step}
                onClick={() => setStep(i)}
                className={cn(
                  "tabular-nums transition-colors disabled:cursor-default",
                  i === step ? "font-semibold text-espresso" : i < step ? "text-terracotta hover:underline" : "text-espresso/40",
                )}
              >
                {i + 1}. {label}
              </button>
            </li>
          ))}
        </ol>

        <div className="mt-8">
          {step === 0 && (
            <fieldset>
              <legend className="font-serif text-3xl">Колко е голямо кучето ви?</legend>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {(["small", "medium", "large"] as DogSize[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => chooseSize(s)}
                    aria-pressed={size === s}
                    className={cn(
                      "flex min-h-40 flex-col justify-between rounded-lg border p-5 text-left transition-colors",
                      size === s ? "border-terracotta bg-sand" : "border-line bg-white/50 hover:border-clay",
                    )}
                  >
                    <span>
                      <span className="block font-serif text-2xl">{SIZE_LABEL[s]}</span>
                      <span className="mt-1 block text-[15px] font-medium">{SIZE_HINT[s]}</span>
                    </span>
                    <span className="text-sm leading-6 text-espresso-soft">{SIZE_BREEDS[s]}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {step === 1 && size && (
            <div className="space-y-10">
              <div>
                <h2 className="font-serif text-3xl">Изберете услуга</h2>
                <p className="mt-2 max-w-2xl text-[15px] text-espresso-soft">{PRICE_NOTE}</p>
              </div>
              {GROUPS.map((g) => {
                const list = mains.filter((s) => s.group_name === g);
                if (!list.length) return null;
                return (
                  <fieldset key={g}>
                    <legend className="font-sans text-sm font-semibold">{SERVICE_GROUP_LABEL[g]}</legend>
                    <div className="mt-3 divide-y divide-line border-y border-line">
                      {list.map((s) => (
                        <label
                          key={s.id}
                          className={cn("flex cursor-pointer items-start gap-4 px-1 py-4 transition-colors", mainId === s.id && "bg-sand/60")}
                        >
                          <input
                            type="radio"
                            name="main"
                            className="mt-1.5 size-4 accent-terracotta"
                            checked={mainId === s.id}
                            onChange={() => {
                              setMainId(s.id);
                              setAddonIds((ids) => ids.filter((x) => x !== s.id));
                              setTime(null);
                            }}
                          />
                          <ServiceInfo s={s} />
                          <span className="shrink-0 text-right text-sm">
                            <span className="block tabular-nums">{formatRange(s.price_from, s.price_to)}</span>
                            <span className="block text-espresso-soft">{formatDuration(s.duration_min, s.duration_max)}</span>
                            <span className="mt-1 block text-espresso-soft">капаро {formatEUR(serviceDeposit(s, depositPercent))}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                );
              })}

              {main && extras.length > 0 && (
                <fieldset>
                  <legend className="font-serif text-2xl">Допълнително, по желание</legend>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {extras.map((s) => (
                      <label
                        key={s.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-md border p-3.5 transition-colors",
                          addonIds.includes(s.id) ? "border-terracotta bg-sand/60" : "border-line hover:border-clay",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 size-4 accent-terracotta"
                          checked={addonIds.includes(s.id)}
                          onChange={() => toggleAddon(s.id)}
                        />
                        <span className="flex-1 text-sm">
                          <span className="block font-medium text-[15px]">{s.name}</span>
                          <span className="text-espresso-soft">
                            {formatRange(s.price_from, s.price_to)}, до {formatMinutes(s.duration_max)}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-serif text-3xl">Изберете ден и час</h2>
              <p className="mt-2 text-[15px] text-espresso-soft">
                Предвиждаме {formatMinutes(totals.duration)} за избраните услуги. Показваме само часовете, в които салонът е
                свободен през цялото това време.
              </p>
              {slotsError && (
                <p role="alert" className="mt-6 rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
                  {slotsError}
                </p>
              )}
              <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
                <BookingCalendar
                  available={availability?.days ?? {}}
                  last={availability?.last}
                  selected={date}
                  loading={loadingSlots && !availability}
                  onSelect={(d) => {
                    setDate(d);
                    setTime(null);
                  }}
                />
                <div aria-live="polite">
                  {!date ? (
                    <p className="text-[15px] text-espresso-soft">
                      {loadingSlots ? "Зареждаме свободните часове…" : "Изберете ден от календара."}
                    </p>
                  ) : slotsForDate.length === 0 ? (
                    <p className="text-[15px] text-espresso-soft">Няма свободни часове за този ден. Изберете друг.</p>
                  ) : (
                    <fieldset>
                      <legend className="text-sm font-medium">Свободни часове</legend>
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3">
                        {slotsForDate.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTime(t)}
                            aria-pressed={time === t}
                            className={cn(
                              "h-11 rounded-md border text-[15px] tabular-nums transition-colors",
                              time === t
                                ? "border-terracotta bg-terracotta text-cream"
                                : "border-line bg-white/60 hover:border-terracotta",
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (validateForm()) setStep(4);
              }}
              className="space-y-5"
              id="details-form"
            >
              <h2 className="font-serif text-3xl">Вашите данни</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Име и фамилия" htmlFor="name" error={errors.name}>
                  <Input id="name" autoComplete="name" value={form.name} aria-invalid={!!errors.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field label="Телефон" htmlFor="phone" error={errors.phone}>
                  <Input id="phone" type="tel" autoComplete="tel" value={form.phone} aria-invalid={!!errors.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Field>
                <Field label="Имейл" htmlFor="email" error={errors.email} className="sm:col-span-2">
                  <Input id="email" type="email" autoComplete="email" value={form.email} aria-invalid={!!errors.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
                <Field label="Име на кучето" htmlFor="dogName" error={errors.dogName}>
                  <Input id="dogName" value={form.dogName} aria-invalid={!!errors.dogName}
                    onChange={(e) => setForm({ ...form, dogName: e.target.value })} />
                </Field>
                <Field label="Порода" htmlFor="dogBreed" error={errors.dogBreed}>
                  <Input id="dogBreed" value={form.dogBreed} aria-invalid={!!errors.dogBreed}
                    onChange={(e) => setForm({ ...form, dogBreed: e.target.value })} />
                </Field>
                <Field label="Съобщение (по желание)" htmlFor="message" hint="Алергии, страхове, желана прическа." className="sm:col-span-2">
                  <Textarea id="message" rows={3} value={form.message} maxLength={1000}
                    onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </Field>
              </div>
              <div>
                <Checkbox checked={form.terms} aria-invalid={!!errors.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.checked })}>
                  Съгласен/на съм с{" "}
                  <Link href="/terms" target="_blank" className="link-underline">общите условия</Link> и{" "}
                  <Link href="/privacy" target="_blank" className="link-underline">политиката за поверителност</Link>.
                  Изрично желая услугата да бъде извършена в 14-дневния срок за отказ и разбирам, че след като бъде
                  изцяло извършена, губя правото си на отказ. До началото на часа мога да откажа резервацията и да получа
                  капарото обратно.
                </Checkbox>
                {errors.terms && <p className="mt-1 text-sm text-danger" role="alert">{errors.terms}</p>}
              </div>
            </form>
          )}

          {step === 4 && (
            <div>
              <h2 className="font-serif text-3xl">Преглед и капаро</h2>
              <dl className="mt-6 grid gap-x-8 gap-y-3 text-[15px] sm:grid-cols-[10rem_1fr]">
                <dt className="text-espresso-soft">Кога</dt>
                <dd>{date && new Intl.DateTimeFormat("bg-BG", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`))}, {time}</dd>
                <dt className="text-espresso-soft">Куче</dt>
                <dd>{form.dogName}, {form.dogBreed} ({size && SIZE_LABEL[size].toLowerCase()})</dd>
                <dt className="text-espresso-soft">Контакт</dt>
                <dd>{form.name}, {form.phone}, {form.email}</dd>
              </dl>
              <div className="mt-8 rounded-lg bg-sand p-5 pattern pattern-bones sm:p-6">
                <p className="text-[15px]">
                  Сега плащате капаро <strong className="font-semibold">{formatEUR(totals.deposit)}</strong>. Остатъкът от{" "}
                  <span className="tabular-nums">{formatRange(totals.restFrom, totals.restTo)}</span> се плаща в салона.
                </p>
                {totals.range && <p className="mt-2 text-sm text-espresso-soft">{PRICE_NOTE}</p>}
                <p className="mt-2 text-sm text-espresso-soft">
                  Часът се задържа за вас 30 минути, докато завършите плащането. Плащането е през Stripe — данните на картата
                  ви не минават през нас.
                </p>
              </div>
              {submitError && (
                <p role="alert" className="mt-4 rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
                  {submitError}
                </p>
              )}
              <Button type="button" size="lg" className="mt-6 w-full sm:w-auto" onClick={pay} disabled={pending}>
                {pending ? "Пренасочваме към плащане…" : `Плати капаро ${formatEUR(totals.deposit)}`}
              </Button>
            </div>
          )}

          {step < 4 && step > 0 && (
            <div className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-6">
              <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>
                Назад
              </Button>
              {step === 3 ? (
                <Button type="submit" form="details-form">Продължи към плащане</Button>
              ) : (
                <Button type="button" disabled={!canNext} onClick={() => setStep(step + 1)}>
                  Продължи
                </Button>
              )}
            </div>
          )}
          {step === 4 && (
            <Button type="button" variant="ghost" className="mt-4" onClick={() => setStep(3)}>
              Назад
            </Button>
          )}
        </div>
      </div>

      <aside className="lg:col-span-4" aria-label="Обобщение">
        <div className="sticky top-24 rounded-lg border border-line bg-white/50 p-5">
          <h2 className="font-sans text-sm font-semibold">Вашият час</h2>
          {!size ? (
            <p className="mt-3 text-sm text-espresso-soft">Изберете размер, за да видите услугите и цените.</p>
          ) : (
            <div className="mt-3 space-y-4 text-sm">
              <p>{SIZE_LABEL[size]}</p>
              {chosen.length > 0 && (
                <ul className="space-y-1.5">
                  {chosen.map((s) => (
                    <li key={s.id} className="flex justify-between gap-3">
                      <span>{s.name}</span>
                      <span className="shrink-0 tabular-nums text-espresso-soft">{formatRange(s.price_from, s.price_to)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {date && time && (
                <p>
                  {new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`))}, {time}
                </p>
              )}
              {chosen.length > 0 && (
                <dl className="space-y-1.5 border-t border-line pt-4">
                  <div className="flex justify-between"><dt className="text-espresso-soft">Продължителност</dt><dd>до {formatMinutes(totals.duration)}</dd></div>
                  <div className="flex justify-between"><dt className="text-espresso-soft">Обща цена</dt><dd className="tabular-nums">{formatRange(totals.from, totals.to)}</dd></div>
                  <div className="flex justify-between font-semibold"><dt>Капаро сега</dt><dd className="tabular-nums">{formatEUR(totals.deposit)}</dd></div>
                  <div className="flex justify-between"><dt className="text-espresso-soft">В салона</dt><dd className="tabular-nums">{formatRange(totals.restFrom, totals.restTo)}</dd></div>
                </dl>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
