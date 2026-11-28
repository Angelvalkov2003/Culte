"use client";

import { useEffect, useId, useState } from "react";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/format";

export interface BoxnowLocker {
  id: string;
  name: string;
  address: string;
}

const WIDGET_ORIGIN = /^https:\/\/([a-z0-9-]+\.)*boxnow\.bg$/i;

/**
 * Избор на BoxNow автомат.
 * - С BOXNOW_PARTNER_ID: официалният map widget (iframe), изборът идва с postMessage (boxnowLockerId…).
 * - Без него: търсене по град/адрес/пощенски код в публичния списък.
 */
export function BoxnowPicker({
  partnerId,
  value,
  onChange,
  error,
}: {
  partnerId: string | null;
  value: BoxnowLocker | null;
  onChange: (l: BoxnowLocker | null) => void;
  error?: string;
}) {
  const [mode, setMode] = useState<"map" | "search">(partnerId ? "map" : "search");

  useEffect(() => {
    if (mode !== "map") return;
    const onMessage = (e: MessageEvent) => {
      if (!WIDGET_ORIGIN.test(e.origin)) return;
      const d = e.data as Record<string, string> | string;
      if (!d || typeof d !== "object" || !d.boxnowLockerId) return;
      onChange({
        id: String(d.boxnowLockerId),
        name: d.boxnowLockerName ?? `Автомат ${d.boxnowLockerId}`,
        address: [d.boxnowLockerAddressLine1, d.boxnowLockerPostalCode].filter(Boolean).join(", "),
      });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [mode, onChange]);

  return (
    <div className="space-y-3">
      {value && (
        <p className="rounded-md border border-terracotta/40 bg-sand/60 p-3 text-[15px]" role="status">
          <span className="font-medium">{value.name}</span>
          {value.address && <span className="block text-sm text-espresso-soft">{value.address}</span>}
        </p>
      )}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      {partnerId && (
        <div className="flex gap-4 text-sm">
          <button type="button" className={cn(mode === "map" ? "font-semibold" : "link-underline")} onClick={() => setMode("map")}>
            Карта
          </button>
          <button type="button" className={cn(mode === "search" ? "font-semibold" : "link-underline")} onClick={() => setMode("search")}>
            Търсене по адрес
          </button>
        </div>
      )}

      {mode === "map" && partnerId ? (
        <>
          {!value && <p className="text-sm text-espresso-soft">Натиснете автомат на картата или в списъка.</p>}
          {/*
            autoselect=yes е задължително: при autoselect=no widget-ът показва бутон „Избери“, който в режим iframe
            НЕ праща postMessage (праща само в режим popup), и изборът никога не стига до нас.
            С autoselect=yes автоматът се праща още при клик върху него.
          */}
          <iframe
            title="Избор на BoxNow автомат"
            src={`https://widget-v5.boxnow.bg/iframe.html?partnerId=${encodeURIComponent(partnerId)}&gps=yes&autoselect=yes&autoclose=no`}
            allow="geolocation"
            loading="lazy"
            className="h-[520px] w-full rounded-md border border-line"
          />
        </>
      ) : (
        <LockerSearch onPick={onChange} />
      )}
    </div>
  );
}

function LockerSearch({ onPick }: { onPick: (l: BoxnowLocker) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<BoxnowLocker[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const id = useId();

  useEffect(() => {
    if (q.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- нулиране при кратка заявка
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/boxnow/lockers?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then(async (r) => {
          const j = await r.json();
          if (!r.ok) throw new Error(j.error);
          setResults(j.lockers ?? []);
          setErr(null);
        })
        .catch((e) => e.name !== "AbortError" && setErr(e.message || "Грешка"))
        .finally(() => setLoading(false));
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  return (
    <Field label="Намерете автомат" htmlFor={id} hint={loading ? "Търсим…" : "Град, квартал, улица или пощенски код"} error={err ?? undefined}>
      <Input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder="напр. Пловдив, Тракия" autoComplete="off" />
      {results.length > 0 && (
        <ul className="mt-2 max-h-72 divide-y divide-line overflow-auto rounded-md border border-line">
          {results.map((l) => (
            <li key={l.id}>
              <button type="button" className="block w-full px-3.5 py-2.5 text-left hover:bg-sand" onClick={() => onPick(l)}>
                <span className="block text-[15px] font-medium">{l.name}</span>
                <span className="block text-sm text-espresso-soft">{l.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && !loading && !results.length && !err && (
        <p className="mt-2 text-sm text-espresso-soft">Няма автомати по това търсене.</p>
      )}
    </Field>
  );
}
