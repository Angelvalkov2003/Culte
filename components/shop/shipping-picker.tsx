"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Field, Input, inputClass } from "@/components/ui/field";
import { BoxnowPicker, type BoxnowLocker } from "@/components/shop/boxnow-picker";
import { cn, formatEUR } from "@/lib/format";
import { shippingQuote } from "@/lib/shipping";
import type { ShippingMethod } from "@/lib/types";

export type ShippingSelection =
  | { method: "speedy_office" | "speedy_apt"; siteId: number; siteName: string; officeId: number; officeName: string }
  | { method: "speedy_address"; siteId: number; siteName: string; addressLine: string }
  | { method: "boxnow"; lockerId: string; lockerName: string; lockerAddress: string }
  | { method: "manual"; methodId: string };

export interface ShippingState {
  selection: ShippingSelection | null;
  price: number | null;
  deadline: string | null;
  loading: boolean;
  error: string | null;
}

type Tab = "speedy_office" | "speedy_apt" | "speedy_address" | "boxnow" | `manual:${string}`;

interface Site {
  id: number;
  label: string;
}
interface Office {
  id: number;
  name: string;
  address: string;
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Търсене на населено място (Speedy) с debounce 350 ms. */
function SiteSearch({ value, onChange, error }: { value: Site | null; onChange: (s: Site | null) => void; error?: string }) {
  const [q, setQ] = useState(value?.label ?? "");
  const [results, setResults] = useState<Site[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const debounced = useDebounced(q, 350);
  const listId = useId();

  useEffect(() => {
    if (value && debounced === value.label) return;
    if (debounced.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- нулиране при кратка заявка
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/speedy/sites?q=${encodeURIComponent(debounced)}`, { signal: ctrl.signal })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setResults(j.sites ?? []);
        setErr(null);
        setOpen(true);
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message || "Грешка при търсене"))
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [debounced, value]);

  return (
    <Field label="Населено място" htmlFor={`${listId}-in`} error={error ?? err ?? undefined} hint={loading ? "Търсим…" : "Въведете поне 2 букви"}>
      <div className="relative">
        <Input
          id={`${listId}-in`}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (value) onChange(null);
          }}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="напр. Пловдив"
        />
        {open && results.length > 0 && (
          <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-line bg-cream py-1 shadow-[0_8px_24px_rgba(46,35,28,0.12)]">
            {results.map((s) => (
              <li key={s.id} role="option" aria-selected={value?.id === s.id}>
                <button
                  type="button"
                  className="block w-full px-3.5 py-2 text-left text-[15px] hover:bg-sand"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(s);
                    setQ(s.label);
                    setOpen(false);
                  }}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Field>
  );
}

function OfficeSelect({
  siteId,
  type,
  value,
  onChange,
  error,
}: {
  siteId: number;
  type: "OFFICE" | "APT";
  value: Office | null;
  onChange: (o: Office | null) => void;
  error?: string;
}) {
  const [offices, setOffices] = useState<Office[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const id = useId();

  useEffect(() => {
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- нулиране при смяна на мястото
    setOffices(null);
    setErr(null);
    fetch(`/api/speedy/offices?siteId=${siteId}&type=${type}`, { signal: ctrl.signal })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setOffices(j.offices ?? []);
      })
      .catch((e) => e.name !== "AbortError" && setErr(e.message || "Грешка"));
    return () => ctrl.abort();
  }, [siteId, type]);

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return (offices ?? []).filter((o) => !f || `${o.name} ${o.address}`.toLowerCase().includes(f));
  }, [offices, filter]);

  const label = type === "APT" ? "Автомат Speedy" : "Офис Speedy";
  if (err) return <p className="text-sm text-danger" role="alert">{err}</p>;
  if (!offices) return <p className="text-sm text-espresso-soft">Зареждаме {type === "APT" ? "автоматите" : "офисите"}…</p>;
  if (!offices.length)
    return <p className="text-sm text-espresso-soft">Няма {type === "APT" ? "автомати" : "офиси"} на Speedy в това населено място.</p>;

  return (
    <Field label={label} htmlFor={id} error={error}>
      {offices.length > 8 && (
        <Input placeholder="Филтър по име или адрес" value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-2" aria-label="Филтър" />
      )}
      <select
        id={id}
        className={cn(inputClass, "pr-8")}
        value={value?.id ?? ""}
        onChange={(e) => onChange(offices.find((o) => o.id === Number(e.target.value)) ?? null)}
      >
        <option value="">Изберете…</option>
        {shown.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}{o.address ? ` — ${o.address}` : ""}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function ShippingPicker({
  subtotal,
  manualMethods,
  speedyEnabled,
  boxnow,
  errors,
  onChange,
}: {
  subtotal: number;
  manualMethods: ShippingMethod[];
  speedyEnabled: boolean;
  boxnow: { enabled: boolean; price: number; partnerId: string | null };
  errors: Record<string, string>;
  onChange: (s: ShippingState) => void;
}) {
  const tabs = useMemo(() => {
    const t: { id: Tab; label: string; hint: string }[] = [];
    if (speedyEnabled) {
      t.push({ id: "speedy_office", label: "Speedy офис", hint: "Вземате от офис на Speedy" });
      t.push({ id: "speedy_apt", label: "Speedy автомат", hint: "Вземате от автомат на Speedy" });
      t.push({ id: "speedy_address", label: "Speedy адрес", hint: "Куриер до вашия адрес" });
    }
    if (boxnow.enabled) t.push({ id: "boxnow", label: "BoxNow", hint: "Автомат BoxNow, денонощно" });
    for (const m of manualMethods) t.push({ id: `manual:${m.id}`, label: m.name, hint: m.description });
    return t;
  }, [speedyEnabled, boxnow.enabled, manualMethods]);

  const [tab, setTab] = useState<Tab | null>(tabs[0]?.id ?? null);
  const [site, setSite] = useState<Site | null>(null);
  const [office, setOffice] = useState<Office | null>(null);
  const [addressLine, setAddressLine] = useState("");
  const [locker, setLocker] = useState<BoxnowLocker | null>(null);
  const [quote, setQuote] = useState<{ key: string; price: number | null; deadline: string | null; error: string | null; loading: boolean }>({
    key: "",
    price: null,
    deadline: null,
    error: null,
    loading: false,
  });
  const debouncedAddress = useDebounced(addressLine, 500);

  // Текуща селекция според метода
  const selection: ShippingSelection | null = useMemo(() => {
    if (!tab) return null;
    if (tab.startsWith("manual:")) return { method: "manual", methodId: tab.slice(7) };
    if (tab === "boxnow") return locker ? { method: "boxnow", lockerId: locker.id, lockerName: locker.name, lockerAddress: locker.address } : null;
    if (!site) return null;
    if (tab === "speedy_address")
      return debouncedAddress.trim().length >= 5
        ? { method: "speedy_address", siteId: site.id, siteName: site.label, addressLine: debouncedAddress.trim() }
        : null;
    return office ? { method: tab as "speedy_office" | "speedy_apt", siteId: site.id, siteName: site.label, officeId: office.id, officeName: office.name } : null;
  }, [tab, site, office, debouncedAddress, locker]);

  // Цена наживо (Speedy → API; BoxNow → фиксирана; ръчна → тарифа)
  const speedyKey =
    selection && selection.method.startsWith("speedy")
      ? `${selection.method}:${"siteId" in selection ? selection.siteId : ""}:${"officeId" in selection ? selection.officeId : ""}`
      : "";
  useEffect(() => {
    if (!speedyKey || !selection || !selection.method.startsWith("speedy")) return;
    const sel = selection as Extract<ShippingSelection, { siteId: number }>;
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- зареждане на цената
    setQuote({ key: speedyKey, price: null, deadline: null, error: null, loading: true });
    fetch("/api/speedy/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: sel.method, siteId: sel.siteId, officeId: "officeId" in sel ? sel.officeId : null }),
      signal: ctrl.signal,
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setQuote({ key: speedyKey, price: j.price, deadline: j.deadline, error: null, loading: false });
      })
      .catch((e) => e.name !== "AbortError" && setQuote({ key: speedyKey, price: null, deadline: null, error: e.message || "Грешка", loading: false }));
    return () => ctrl.abort();
    // speedyKey обобщава selection за Speedy
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speedyKey]);

  const state: ShippingState = useMemo(() => {
    if (!selection) return { selection: null, price: null, deadline: null, loading: false, error: null };
    if (selection.method === "manual") {
      const m = manualMethods.find((x) => x.id === selection.methodId);
      return { selection, price: m ? shippingQuote(m, subtotal) : null, deadline: null, loading: false, error: null };
    }
    if (selection.method === "boxnow") return { selection, price: boxnow.price, deadline: null, loading: false, error: null };
    const fresh = quote.key === speedyKey;
    return {
      selection,
      price: fresh ? quote.price : null,
      deadline: fresh ? quote.deadline : null,
      loading: !fresh || quote.loading,
      error: fresh ? quote.error : null,
    };
  }, [selection, manualMethods, subtotal, boxnow.price, quote, speedyKey]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    onChangeRef.current(state);
  }, [state]);

  if (!tabs.length) return <p className="mt-3 text-sm text-danger">В момента няма активни методи на доставка.</p>;

  return (
    <div className="mt-4 space-y-5">
      <div role="radiogroup" aria-label="Начин на доставка" className="grid gap-2 sm:grid-cols-2">
        {tabs.map((t) => (
          <label
            key={t.id}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-md border p-3.5",
              tab === t.id ? "border-terracotta bg-sand/60" : "border-line hover:border-clay",
            )}
          >
            <input
              type="radio"
              name="shipping-method"
              className="mt-1 size-4 accent-terracotta"
              checked={tab === t.id}
              onChange={() => {
                setTab(t.id);
                setOffice(null);
              }}
            />
            <span>
              <span className="block font-medium">{t.label}</span>
              {t.hint && <span className="block text-sm text-espresso-soft">{t.hint}</span>}
            </span>
          </label>
        ))}
      </div>

      {tab && (tab === "speedy_office" || tab === "speedy_apt" || tab === "speedy_address") && (
        <div className="grid gap-5 sm:grid-cols-2">
          <SiteSearch
            value={site}
            onChange={(s) => {
              setSite(s);
              setOffice(null);
            }}
            error={errors.siteId}
          />
          {site && tab !== "speedy_address" && (
            <OfficeSelect key={`${site.id}-${tab}`} siteId={site.id} type={tab === "speedy_apt" ? "APT" : "OFFICE"} value={office} onChange={setOffice} error={errors.officeId} />
          )}
          {tab === "speedy_address" && (
            <Field label="Адрес" htmlFor="addressLine" error={errors.addressLine} hint="Улица, номер, блок, вход, етаж, апартамент">
              <Input id="addressLine" autoComplete="street-address" value={addressLine} maxLength={200} onChange={(e) => setAddressLine(e.target.value)} />
            </Field>
          )}
        </div>
      )}

      {tab === "boxnow" && <BoxnowPicker partnerId={boxnow.partnerId} value={locker} onChange={setLocker} error={errors.lockerId} />}

      <p className="text-sm" aria-live="polite">
        {state.error ? (
          <span className="text-danger">{state.error}</span>
        ) : state.loading ? (
          <span className="text-espresso-soft">Изчисляваме цената на доставката…</span>
        ) : state.price != null ? (
          <span>
            Доставка: <strong className="font-semibold tabular-nums">{state.price === 0 ? "безплатна" : formatEUR(state.price)}</strong>
            {state.deadline && (
              <span className="text-espresso-soft">
                {" "}
                — очаквана доставка до{" "}
                {new Intl.DateTimeFormat("bg-BG", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Sofia" }).format(new Date(state.deadline))}
              </span>
            )}
          </span>
        ) : (
          <span className="text-espresso-soft">
            {tab === "speedy_address" ? "Изберете населено място и въведете адрес, за да видите цената." : "Изберете къде да получите пратката."}
          </span>
        )}
      </p>
    </div>
  );
}
