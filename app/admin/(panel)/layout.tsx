import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { logoutAction } from "@/app/admin/_actions/auth";
import { AdminShell } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: { default: "Админ", template: "%s | Админ Culte" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <AdminShell
      footer={
        <>
          <Link href="/" className="block text-sm text-espresso-soft hover:text-terracotta">
            Към сайта
          </Link>
          <form action={logoutAction} className="mt-2">
            <button className="text-sm text-espresso-soft hover:text-danger">Изход</button>
          </form>
        </>
      }
    >
      {children}
    </AdminShell>
  );
}
