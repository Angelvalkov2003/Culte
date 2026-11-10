import { db } from "@/lib/supabase/admin";
import type { ShippingMethod } from "@/lib/types";
import { PROVIDERS } from "@/lib/shipping";
import { deleteShipping, saveShipping } from "@/app/admin/_actions/catalog";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Field, Input, Select } from "@/components/ui/field";

export const metadata = { title: "Доставка" };

function Fields({ m }: { m?: ShippingMethod }) {
  const p = m?.id ?? "new";
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {m && <input type="hidden" name="id" value={m.id} />}
      <Field label="Име" htmlFor={`n-${p}`} className="lg:col-span-2">
        <Input id={`n-${p}`} name="name" defaultValue={m?.name} required />
      </Field>
      <Field label="Тип" htmlFor={`d-${p}`}>
        <Select id={`d-${p}`} name="delivery" defaultValue={m?.delivery ?? "address"}>
          <option value="address">До адрес</option>
          <option value="office">До офис</option>
          <option value="pickup">Вземане от салона</option>
        </Select>
      </Field>
      <Field label="Провайдър" htmlFor={`p-${p}`} hint="Еконт/Спиди — след интеграция">
        <Select id={`p-${p}`} name="provider" defaultValue={m?.provider ?? "manual"}>
          {Object.values(PROVIDERS).map((pr) => <option key={pr.id} value={pr.id}>{pr.label}</option>)}
        </Select>
      </Field>
      <Field label="Описание" htmlFor={`ds-${p}`} className="lg:col-span-2">
        <Input id={`ds-${p}`} name="description" defaultValue={m?.description} />
      </Field>
      <Field label="Цена, €" htmlFor={`pr-${p}`}>
        <Input id={`pr-${p}`} name="price" type="number" step="0.01" min="0" defaultValue={m?.price ?? 0} required />
      </Field>
      <Field label="Безплатна над, €" htmlFor={`f-${p}`} hint="Празно = никога">
        <Input id={`f-${p}`} name="free_over" type="number" step="0.01" min="0" defaultValue={m?.free_over ?? ""} />
      </Field>
      <Field label="Ред" htmlFor={`s-${p}`}>
        <Input id={`s-${p}`} name="sort_order" type="number" defaultValue={m?.sort_order ?? 0} />
      </Field>
      <label className="flex items-center gap-2 self-end pb-3 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={m?.is_active ?? true} className="size-4 accent-terracotta" /> Активен
      </label>
    </div>
  );
}

export default async function ShippingPage() {
  const { data } = await db().from("shipping_methods").select("*").order("sort_order");
  const methods = (data ?? []) as ShippingMethod[];
  return (
    <>
      <PageHeader title="Методи на доставка">
        Цените се прилагат при поръчка. Интеграция с куриер се добавя в lib/shipping.
      </PageHeader>
      <div className="space-y-4">
        {methods.map((m) => (
          <Panel key={m.id}>
            <ActionForm action={saveShipping} className="space-y-4">
              <Fields m={m} />
              <SubmitButton variant="secondary">Запази</SubmitButton>
            </ActionForm>
            <ActionForm action={deleteShipping} confirm={`Изтриване на „${m.name}“?`} className="mt-2">
              <input type="hidden" name="id" value={m.id} />
              <SubmitButton variant="ghost" className="text-danger">Изтрий</SubmitButton>
            </ActionForm>
          </Panel>
        ))}
        <Panel title="Нов метод">
          <ActionForm action={saveShipping} resetOnSuccess className="space-y-4">
            <Fields />
            <SubmitButton>Добави</SubmitButton>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
