import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, SESSION_HOURS, passwordMatches, signSession, verifySession } from "@/lib/admin/token";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

const MAX_FAILS = 5;
const WINDOW_MIN = 15;

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifySession(process.env.ADMIN_SESSION_SECRET, token);
}

/** Повторна проверка във всяко admin server action / страница. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown").trim().slice(0, 64);
}

export async function login(password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ip = await clientIp();
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const { count } = await db()
    .from("admin_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("success", false)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_FAILS) {
    return { ok: false, error: `Твърде много неуспешни опита. Опитайте след ${WINDOW_MIN} минути.` };
  }

  const secret = env.adminSecret();
  const ok = await passwordMatches(secret, password, env.adminPassword());
  await db().from("admin_login_attempts").insert({ ip, success: ok });
  if (!ok) return { ok: false, error: "Грешна парола." };

  (await cookies()).set(ADMIN_COOKIE, await signSession(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return { ok: true };
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
}
