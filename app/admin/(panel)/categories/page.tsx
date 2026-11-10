import { db } from "@/lib/supabase/admin";
import type { Category } from "@/lib/types";
import { deleteCategory, saveCategory } from "@/app/admin/_actions/catalog";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Input } from "@/components/ui/field";

export const metadata = { title: "Категории" };

function CategoryFields({ c }: { c?: Category }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_2fr_80px_auto] sm:items-center">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Input name="name" defaultValue={c?.name} placeholder="Име" required aria-label="Име" />
      <Input name="slug" defaultValue={c?.slug} placeholder="slug (по избор)" aria-label="Slug" />
      <Input name="description" defaultValue={c?.description} placeholder="Кратко описание" aria-label="Описание" />
      <Input name="sort_order" type="number" defaultValue={c?.sort_order ?? 0} aria-label="Ред" />
      <label className="flex items-center gap-2 text-sm whitespace-nowrap">
        <input type="checkbox" name="is_active" defaultChecked={c?.is_active ?? true} className="size-4 accent-terracotta" /> Активна
      </label>
    </div>
  );
}

export default async function CategoriesPage() {
  const { data } = await db().from("categories").select("*").order("sort_order");
  const cats = (data ?? []) as Category[];
  return (
    <>
      <PageHeader title="Категории" />
      <Panel title="Нова категория" className="mb-6">
        <ActionForm action={saveCategory} resetOnSuccess className="space-y-3">
          <CategoryFields />
          <SubmitButton>Добави</SubmitButton>
        </ActionForm>
      </Panel>
      <div className="space-y-3">
        {cats.map((c) => (
          <Panel key={c.id}>
            <ActionForm action={saveCategory} className="space-y-3">
              <CategoryFields c={c} />
              <div className="flex gap-2">
                <SubmitButton variant="secondary">Запази</SubmitButton>
              </div>
            </ActionForm>
            <ActionForm action={deleteCategory} confirm={`Изтриване на „${c.name}“?`} className="mt-2">
              <input type="hidden" name="id" value={c.id} />
              <SubmitButton variant="ghost" className="text-danger">Изтрий</SubmitButton>
            </ActionForm>
          </Panel>
        ))}
      </div>
    </>
  );
}
