"use client";

import { useState } from "react";

/** Картата се зарежда след клик — без бисквитки от Google преди съгласие. */
export function MapEmbed({ query }: { query: string }) {
  const [show, setShow] = useState(false);
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-sand">
      {show ? (
        <iframe src={src} title="Карта до салона" className="absolute inset-0 h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-start justify-end p-6 sm:p-8">
          <p className="font-serif text-3xl">ж.к. Оазис 3, Пловдив</p>
          <p className="mt-2 max-w-sm text-sm text-espresso-soft">
            Картата се зарежда от Google Maps, който може да запише бисквитки.
          </p>
          <button type="button" onClick={() => setShow(true)}
            className="mt-4 rounded-md border border-espresso/25 px-4 py-2 text-sm hover:border-espresso hover:bg-cream">
            Покажи картата
          </button>
        </div>
      )}
    </div>
  );
}
