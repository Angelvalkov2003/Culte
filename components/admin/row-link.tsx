"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Ред от таблица, който отваря href при клик където и да е.
 * Вътрешните линкове/бутони работят нормално; Ctrl/⌘/среден клик → нов таб.
 * За клавиатура в реда трябва да има и обикновен <Link>.
 */
export function RowLink({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-sand/70"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button, input, select, textarea, label")) return;
        if (window.getSelection()?.toString()) return;
        if (e.ctrlKey || e.metaKey) window.open(href, "_blank");
        else router.push(href);
      }}
      onAuxClick={(e) => {
        if (e.button === 1 && !(e.target as HTMLElement).closest("a")) window.open(href, "_blank");
      }}
    >
      {children}
    </tr>
  );
}
