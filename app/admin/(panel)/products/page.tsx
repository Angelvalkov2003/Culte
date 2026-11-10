import Link from "next/link";
import { db } from "@/lib/supabase/admin";
import { formatEUR } from "@/lib/format";
import type { Product } from "@/lib/types";
import { ButtonLink } from "@/components/ui/button";
import { Empty, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { InlineActive, InlineStock } from "@/components/admin/product-inline";
import { Input, Select } from "@/components/ui/field";

export const metadata = { title: "Продукти" };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; created?: string }> }) {
  const sp = await searchParams;
  let q = db().from("products").select("*, category:categories(id, name, slug)").order("sort_order").order("name");
  if (sp.q) q = q.ilike("name", `%${sp.q.replace(/[%_,]/g, " ")}%`);
  if (sp.category) q = q.eq("category_id", sp.category);
  const [{ data }, { data: cats }] = await Promise.all([q, db().from("categories").select("id, name").order("sort_order")]);
  const products = (data ?? []) as Product[];

  return (
    <>
      <PageHeader title="Продукти" actions={<ButtonLink href="/admin/products/new" size="sm">Нов продукт</ButtonLink>}>
        {products.length} продукта. Активността и бройките се сменят директно в таблицата.
      </PageHeader>
      {sp.created && <p role="status" className="mb-4 text-sm text-success">Продуктът е добавен.</p>}
      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <Input name="q" defaultValue={sp.q} placeholder="Търсене по име" className="max-w-xs" aria-label="Търсене" />
        <Select name="category" defaultValue={sp.category ?? ""} className="max-w-xs" aria-label="Категория">
          <option value="">Всички категории</option>
          {(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <button className="rounded-md border border-line px-4 text-sm hover:bg-sand">Филтрирай</button>
      </form>
      {!products.length ? (
        <Empty>Няма продукти.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Продукт</Th>
              <Th>Категория</Th>
              <Th className="text-right">Цена</Th>
              <Th>Бройки</Th>
              <Th>Активен</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={p.is_active ? "" : "text-espresso/55"}>
                <Td>
                  <Link href={`/admin/products/${p.id}`} className="font-medium hover:text-terracotta">{p.name}</Link>
                </Td>
                <Td>{p.category?.name ?? "—"}</Td>
                <Td className="text-right tabular-nums">{formatEUR(p.price)}</Td>
                <Td><InlineStock id={p.id} stock={p.stock} /></Td>
                <Td><InlineActive id={p.id} active={p.is_active} name={p.name} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
