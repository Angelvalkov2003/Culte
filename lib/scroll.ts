"use client";

/** Височина на залепения хедър + малко въздух. */
const HEADER_OFFSET = 88;

/** Плавно скролва до елемента, ако горният му край не се вижда (над хедъра или под екрана). */
export function scrollToTop(el: HTMLElement | null, force = false) {
  if (!el) return;
  const top = el.getBoundingClientRect().top;
  if (!force && top >= HEADER_OFFSET - 4 && top < window.innerHeight * 0.35) return;
  window.scrollTo({ top: window.scrollY + top - HEADER_OFFSET, behavior: "smooth" });
}

/**
 * След рендер: намира първото невалидно поле или съобщение за грешка в root,
 * скролва до него и (ако е поле) го фокусира — на телефон иначе грешката остава извън екрана.
 */
export function revealFirstError(root: HTMLElement | null) {
  requestAnimationFrame(() => {
    const el = root?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el.matches("input, textarea, select")) el.focus({ preventScroll: true });
  });
}
