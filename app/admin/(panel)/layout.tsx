import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { logoutAction } from "@/app/admin/_actions/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: { default: "Админ", template: "%s | Админ Culte" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[230px_1fr]">
      <aside className="border-b border-line bg-sand lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block lg:py-6">
          <Link href="/admin" aria-label="Табло">
            <Image src="/logo-nobg.png" alt="Culte" width={610} height={410} className="h-10 w-auto" />
          </Link>
          <form action={logoutAction} className="lg:hidden">
            <button className="text-sm text-espresso-soft hover:text-danger">Изход</button>
          </form>
        </div>
        <AdminNav />
        <div className="hidden px-5 pt-6 lg:block">
          <Link href="/" className="block text-sm text-espresso-soft hover:text-terracotta">
            Към сайта
          </Link>
          <form action={logoutAction} className="mt-2">
            <button className="text-sm text-espresso-soft hover:text-danger">Изход</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-10">{children}</main>
    </div>
  );
}
