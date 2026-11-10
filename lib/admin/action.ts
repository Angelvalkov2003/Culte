import "server-only";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";

export type ActionState = { ok: boolean; message: string; ts?: number } | null;

/** Обвива admin action: проверка на сесията, грешки → съобщение, revalidate. */
export function adminAction<T>(
  schema: z.ZodType<T>,
  fn: (data: T) => Promise<string | void>,
  revalidate: string[] = [],
) {
  return async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
    await requireAdmin();
    const raw: Record<string, unknown> = {};
    for (const [k, v] of formData.entries()) {
      if (k.startsWith("$ACTION")) continue;
      if (k.endsWith("[]")) ((raw[k.slice(0, -2)] ??= []) as unknown[]).push(v);
      else raw[k] = v;
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues.map((i) => i.message).join(" "), ts: Date.now() };
    }
    try {
      const msg = await fn(parsed.data);
      for (const p of revalidate) revalidatePath(p, "layout");
      return { ok: true, message: msg || "Запазено.", ts: Date.now() };
    } catch (e) {
      unstable_rethrow(e);
      console.error("[admin]", e);
      return { ok: false, message: e instanceof Error ? e.message : "Грешка при запис.", ts: Date.now() };
    }
  };
}

/** Общи Zod помощници за FormData */
export const f = {
  text: (max = 500) => z.string().trim().max(max).default(""),
  req: (label: string, max = 200) => z.string().trim().min(1, `${label}: задължително поле.`).max(max),
  money: (label: string) =>
    z.preprocess(
      (v) => (typeof v === "string" ? Number(v.replace(",", ".")) : v),
      z.number({ error: `${label}: невалидна сума.` }).min(0, `${label}: невалидна сума.`).max(100000),
    ),
  optMoney: () =>
    z.preprocess(
      (v) => (v === "" || v == null ? null : Number(String(v).replace(",", "."))),
      z.number().min(0).max(100000).nullable(),
    ),
  int: (label: string, min = 0, max = 100000) =>
    z.preprocess((v) => Number(v), z.number({ error: `${label}: невалидно число.` }).int(`${label}: цяло число.`).min(min, `${label}: минимум ${min}.`).max(max)),
  bool: () => z.preprocess((v) => v === "on" || v === "true" || v === "1" || v === true, z.boolean()),
  uuid: () => z.uuid("Невалиден идентификатор."),
};
