"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const KEY = "culte_cookie_notice";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function getSnapshot() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

/** Сайтът ползва само необходими бисквитки (количка, сесия), затова е информативно съобщение. */
export function CookieNotice() {
  const seen = useSyncExternalStore(subscribe, getSnapshot, () => true);
  if (seen) return null;
  return (
    <div
      role="region"
      aria-label="Бисквитки"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-lg border border-line bg-cream p-4 text-sm text-espresso-soft shadow-[0_8px_30px_rgba(18,18,18,0.1)] sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      <p>
        Използваме само необходими бисквитки, за да работят количката и плащането. Подробности в{" "}
        <Link href="/cookies" className="link-underline text-espresso">
          политиката за бисквитки
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
            window.dispatchEvent(new StorageEvent("storage"));
          } catch {}
        }}
        className="mt-3 rounded-md bg-espresso px-4 py-2 text-cream hover:bg-espresso-soft"
      >
        Разбрах
      </button>
    </div>
  );
}
