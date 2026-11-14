"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createBooking } from "@/app/(site)/booking/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatDuration, formatEUR, formatMinutes, formatRange } from "@/lib/format";
import { DOG_SIZES, PRICE_NOTE, SERVICE_GROUPS, SERVICE_GROUP_LABEL, SIZE_HINT, SIZE_LABEL, type DogSize, type Service } from "@/lib/types";
import { isRangePrice, serviceDeposit } from "@/lib/booking/deposit";
import { BookingCalendar } from "@/components/booking/booking-calendar";
import { revealFirstError, scrollToTop } from "@/lib/scroll";

const STEPS = ["Размер", "Услуга", "Допълнителни", "Дата и час", "Вашите данни", "Плащане"];

const SIZE_BREEDS: Record<DogSize, string> = {
  small: "Той пудел, йоркширски териер, померан, пикинес, ши тцу",
  medium: "Мини и среден пудел, малтипу, болонка, шнауцер, кокер шпаньол",
  large: "Стандартен пудел, бигъл, бордър коли, самоед",
};
const GROUPS = SERVICE_GROUPS;

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
  const rootRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Всяка смяна на стъпка → към началото на формата (на телефон бутонът „Продължи“ е долу до футъра).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    scrollToTop(rootRef.current, true);
  }, [step]);

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
    if (step !== 3 || !size || !mainId) return;
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

  function chooseMain(id: string) {
    if (id !== mainId) {
      setMainId(id);
      setAddonIds((ids) => ids.filter((x) => x !== id));
      setTime(null);
    }
    setStep(2);
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
      revealFirstError(rootRef.current);
      if (res.fieldErrors) {
        setErrors(res.fieldErrors);
        if (["name", "email", "phone", "dogName", "dogBreed", "terms"].some((k) => res.fieldErrors?.[k])) setStep(4);
      }
      if (/час/.test(res.error)) {
        setTime(null);
        setStep(3);
      }
    });
  }

  const canNext = [Boolean(size), Boolean(mainId), true, Boolean(date && time), true, true][step];

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div ref={rootRef} className={chosen.length > 0 ? "lg:col-span-8" : "lg:col-span-12"}>
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

        <div key={step} className="mt-8 animate-rise [animation-duration:450ms]">
          {step === 0 && (
            <fieldset>
              <legend className="font-serif text-3xl">Колко е голямо кучето ви?</legend>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {DOG_SIZES.map((s) => (
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
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => chooseMain(s.id)}
                          aria-pressed={mainId === s.id}
                          className={cn(
                            "flex w-full items-start gap-4 px-1 py-4 text-left transition-colors hover:bg-sand/40",
                            mainId === s.id && "bg-sand/60",
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "mt-1.5 size-4 shrink-0 rounded-full border",
                              mainId === s.id ? "border-[5px] border-terracotta" : "border-espresso/30",
                            )}
                          />
                          <ServiceInfo s={s} />
                          <span className="shrink-0 text-right text-sm">
                            <span className="block tabular-nums">{formatRange(s.price_from, s.price_to)}</span>
                            <span className="block text-espresso-soft">{formatDuration(s.duration_min, s.duration_max)}</span>
                            <span className="mt-1 block text-espresso-soft">капаро {formatEUR(serviceDeposit(s, depositPercent))}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                );
              })}
            </div>
          )}

          {step === 2 && main && (
            <div className="space-y-8">
              <div>
                <h2 className="font-serif text-3xl">Искате ли да добавите нещо?</h2>
                <p className="mt-2 text-[15px] text-espresso-soft">
                  Избрахте <span className="font-medium text-espresso">{main.name}</span>.{" "}
                  <button type="button" onClick={() => setStep(1)} className="link-underline text-espresso">
                    Смени
                  </button>
                </p>
              </div>

              {extras.length > 0 ? (
                <fieldset>
                  <legend className="font-sans text-sm font-semibold">Допълнителни услуги, по желание</legend>
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
              ) : (
                <p className="text-[15px] text-espresso-soft">Няма допълнителни услуги към тази. Продължете към избора на час.</p>
              )}
            </div>
          )}

          {step === 3 && (
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
                    // На телефон часовете са под календара — показваме ги.
                    if (window.matchMedia("(max-width: 767px)").matches) {
                      requestAnimationFrame(() => slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
                    }
                  }}
                />
                <div aria-live="polite" ref={slotsRef} className="scroll-mt-24">
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

          {step === 4 && (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (validateForm()) setStep(5);
                else revealFirstError(rootRef.current);
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

          {step === 5 && (
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

          {step < 5 && step > 0 && (
            <div className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-6">
              <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>
                Назад
              </Button>
              {step === 4 ? (
                <Button type="submit" form="details-form">Продължи към плащане</Button>
              ) : (
                <Button type="button" disabled={!canNext} onClick={() => setStep(step + 1)}>
                  Продължи
                </Button>
              )}
            </div>
          )}
          {step === 5 && (
            <Button type="button" variant="ghost" className="mt-4" onClick={() => setStep(4)}>
              Назад
            </Button>
          )}
        </div>
      </div>

      {chosen.length > 0 && size && (
      <aside className="animate-rise lg:col-span-4 [animation-duration:450ms]" aria-label="Обобщение">
        <div className="sticky top-24 rounded-lg border border-line bg-white/50 p-5 lg:top-32">
          <h2 className="font-sans text-sm font-semibold">Вашият час</h2>
          {(
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
      )}
    </div>
  );
}
