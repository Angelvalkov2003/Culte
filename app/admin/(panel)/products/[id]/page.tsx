import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/supabase/admin";
import { cloudinaryConfig } from "@/lib/env";
import type { Category, Product } from "@/lib/types";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Продукт" };

export default async function ProductEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !z.uuid().safeParse(id).success) notFound();

  const [{ data: cats }, product] = await Promise.all([
    db().from("categories").select("*").order("sort_order"),
    isNew ? Promise.resolve(null) : db().from("products").select("*").eq("id", id).maybeSingle().then((r) => r.data as Product | null),
  ]);
  if (!isNew && !product) notFound();

  const cfg = cloudinaryConfig();
  return (
    <>
      <PageHeader title={isNew ? "Нов продукт" : product!.name} />
      <ProductForm
        product={product}
        categories={(cats ?? []) as Category[]}
        cloudinary={cfg ? { cloudName: cfg.cloudName, apiKey: cfg.apiKey } : null}
      />
    </>
  );
}
