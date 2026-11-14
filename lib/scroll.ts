"use client";

/** Височина на залепения хедър (72px на телефон, 108px на компютър) + малко въздух. */
function headerOffset() {
  return (document.querySelector("header")?.offsetHeight ?? 72) + 16;
}

/**
 * Скролва до горния край на елемента, ако не се вижда (над хедъра или под екрана).
 * force: винаги и мигновено — при смяна на стъпка, за да не остане потребителят долу,
 * ако плавното скролване бъде прекъснато от новото съдържание.
 */
export function scrollToTop(el: HTMLElement | null, force = false) {
  if (!el) return;
  const offset = headerOffset();
  const top = el.getBoundingClientRect().top;
  if (!force && top >= offset - 20 && top < window.innerHeight * 0.35) return;
  window.scrollTo({ top: Math.max(0, window.scrollY + top - offset), behavior: force ? "instant" : "smooth" });
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
