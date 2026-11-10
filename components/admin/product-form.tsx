"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CldImage, CldUploadWidget } from "next-cloudinary";
import { deleteProduct, saveProduct } from "@/app/admin/_actions/products";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ProductPlaceholder } from "@/components/site/product-placeholder";
import type { Category, Product } from "@/lib/types";

export function ProductForm({
  product,
  categories,
  cloudinary,
}: {
  product: Product | null;
  categories: Category[];
  cloudinary: { cloudName: string; apiKey: string } | null;
}) {
  const [image, setImage] = useState(product?.image_public_id ?? "");
  const [pending, start] = useTransition();
  const category = categories.find((c) => c.id === product?.category_id);

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
      <ActionForm action={saveProduct} className="max-w-2xl space-y-5">
        {product && <input type="hidden" name="id" value={product.id} />}
        <input type="hidden" name="image_public_id" value={image} />
        <Field label="Име" htmlFor="name">
          <Input id="name" name="name" defaultValue={product?.name} required maxLength={200} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Категория" htmlFor="category_id">
            <Select id="category_id" name="category_id" defaultValue={product?.category_id ?? ""}>
              <option value="">Без категория</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Адрес (slug)" htmlFor="slug" hint="Празно = генерира се от името.">
            <Input id="slug" name="slug" defaultValue={product?.slug} maxLength={80} />
          </Field>
          <Field label="Цена, €" htmlFor="price">
            <Input id="price" name="price" type="number" step="0.01" min="0" defaultValue={product?.price ?? ""} required />
          </Field>
          <Field label="Бройки" htmlFor="stock">
            <Input id="stock" name="stock" type="number" step="1" min="0" defaultValue={product?.stock ?? 0} required />
          </Field>
          <Field label="Ред на показване" htmlFor="sort_order">
            <Input id="sort_order" name="sort_order" type="number" step="1" defaultValue={product?.sort_order ?? 0} />
          </Field>
          <label className="flex items-center gap-3 self-end pb-3 text-[15px]">
            <input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} className="size-4 accent-terracotta" />
            Активен (видим в магазина)
          </label>
        </div>
        <Field label="Описание" htmlFor="description">
          <Textarea id="description" name="description" rows={6} defaultValue={product?.description} maxLength={4000} />
        </Field>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <SubmitButton size="md">{product ? "Запази" : "Добави продукта"}</SubmitButton>
          <Link href="/admin/products" className="text-sm link-underline">Назад към списъка</Link>
        </div>
      </ActionForm>

      <div className="space-y-4">
        <p className="text-sm font-medium">Снимка (по желание)</p>
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-line">
          {image && cloudinary ? (
            <CldImage src={image} alt="" fill sizes="320px" crop="fill" className="object-cover" config={{ cloud: { cloudName: cloudinary.cloudName } }} />
          ) : (
            <ProductPlaceholder name={product?.name ?? "Culte"} category={category?.name} />
          )}
        </div>
        {cloudinary ? (
          <div className="flex flex-wrap gap-2">
            <CldUploadWidget
              signatureEndpoint="/api/admin/cloudinary-sign"
              config={{ cloud: { cloudName: cloudinary.cloudName, apiKey: cloudinary.apiKey } }}
              options={{ folder: "culte/products", multiple: false, maxFiles: 1, resourceType: "image", clientAllowedFormats: ["jpg", "jpeg", "png", "webp"], maxFileSize: 8_000_000, language: "bg" }}
              onSuccess={(result) => {
                const info = result.info;
                if (info && typeof info === "object" && "public_id" in info) setImage(String(info.public_id));
              }}
            >
              {({ open }) => (
                <Button type="button" variant="secondary" size="sm" onClick={() => open()}>
                  {image ? "Смени снимката" : "Качи снимка"}
                </Button>
              )}
            </CldUploadWidget>
            {image && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setImage("")}>
                Премахни
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-espresso-soft">Добавете CLOUDINARY_URL в env, за да качвате снимки.</p>
        )}
        <p className="text-xs text-espresso-soft">След смяна на снимката натиснете „Запази“.</p>

        {product && (
          <div className="border-t border-line pt-4">
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() => {
                if (window.confirm(`Изтриване на „${product.name}“? Ако не искате да се вижда, по-добре го направете неактивен.`))
                  start(() => deleteProduct(product.id));
              }}
            >
              Изтрий продукта
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
