import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Вход за администратор", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-sand px-5">
      <div className="w-full max-w-sm rounded-lg bg-cream p-8">
        <Image src="/logo-nobg.png" alt="Culte" width={610} height={410} className="mx-auto h-16 w-auto" priority />
        <h1 className="mt-6 text-center text-3xl">Админ панел</h1>
        <LoginForm />
      </div>
    </main>
  );
}
