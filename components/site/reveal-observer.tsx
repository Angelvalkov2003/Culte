"use client";

import { useEffect } from "react";

/**
 * Леко „изплуване“ при скрол за елементи с атрибут data-reveal.
 * Без JS всичко се вижда нормално: скриването започва чак след като html получи клас reveal-ready,
 * а елементите, които вече са на екрана, се маркират като видими преди това (без премигване).
 */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.shown = "";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    const seen = new WeakSet<Element>();
    const scan = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-shown])").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0 && !root.classList.contains("reveal-ready")) {
          el.dataset.shown = ""; // вече се вижда при първото зареждане
          return;
        }
        io.observe(el);
      });
    };

    scan();
    root.classList.add("reveal-ready");
    // Нови елементи при навигация между страници / филтри в магазина.
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}
