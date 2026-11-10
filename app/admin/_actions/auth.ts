"use server";

import { redirect } from "next/navigation";
import { login, logout } from "@/lib/admin/auth";

export async function loginAction(_prev: { error: string } | null, fd: FormData): Promise<{ error: string } | null> {
  const password = String(fd.get("password") ?? "");
  if (!password) return { error: "Въведете паролата." };
  let res;
  try {
    res = await login(password.slice(0, 200));
  } catch (e) {
    console.error("login", e);
    return { error: "Входът не е конфигуриран (проверете ADMIN_PASSWORD и ADMIN_SESSION_SECRET)." };
  }
  if (!res.ok) return { error: res.error };
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}
