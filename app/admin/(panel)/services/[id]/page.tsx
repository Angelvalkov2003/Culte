import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/supabase/admin";
import { DOG_SIZES, SERVICE_GROUPS, SERVICE_GROUP_LABEL, SIZE_HINT, SIZE_LABEL, type Service } from "@/lib/types";
import { deleteService, saveService } from "@/app/admin/_actions/services";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { PageHeader } from "@/components/admin/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

export const metadata = { title: "Услуга" };

export default async function ServiceEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !z.uuid().safeParse(id).success) notFound();
  const s = isNew ? null : ((await db().from("services").select("*").eq("id", id).maybeSingle()).data as Service | null);
  if (!isNew && !s) notFound();

  return (
    <>
      <PageHeader title={s ? s.name : "Нова услуга"} back={{ href: "/admin/services", label: "Всички услуги" }} />
      <ActionForm action={saveService} className="max-w-2xl space-y-5">
        {s && <input type="hidden" name="id" value={s.id} />}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Име" htmlFor="name" className="sm:col-span-2">
            <Input id="name" name="name" defaultValue={s?.name} required />
          </Field>
          <Field label="Размер" htmlFor="size">
            <Select id="size" name="size" defaultValue={s?.size ?? "small"}>
              {DOG_SIZES.map((sz) => <option key={sz} value={sz}>{SIZE_LABEL[sz]} ({SIZE_HINT[sz].toLowerCase()})</option>)}
            </Select>
          </Field>
          <Field label="Ред" htmlFor="sort_order">
            <Input id="sort_order" name="sort_order" type="number" defaultValue={s?.sort_order ?? 0} />
          </Field>
          <Field label="Продължителност от, мин" htmlFor="duration_min">
            <Input id="duration_min" name="duration_min" type="number" min={5} step={5} defaultValue={s?.duration_min ?? 30} required />
          </Field>
          <Field label="Продължителност до, мин" htmlFor="duration_max">
            <Input id="duration_max" name="duration_max" type="number" min={5} step={5} defaultValue={s?.duration_max ?? 30} required />
          </Field>
          <Field label="Цена от, €" htmlFor="price_from">
            <Input id="price_from" name="price_from" type="number" step="0.01" min={0} defaultValue={s?.price_from ?? ""} required />
          </Field>
          <Field label="Цена до, €" htmlFor="price_to">
            <Input id="price_to" name="price_to" type="number" step="0.01" min={0} defaultValue={s?.price_to ?? ""} required />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Група" htmlFor="group_name">
            <Select id="group_name" name="group_name" defaultValue={s?.group_name ?? "weight"}>
              {SERVICE_GROUPS.map((g) => <option key={g} value={g}>{SERVICE_GROUP_LABEL[g]}</option>)}
            </Select>
          </Field>
          <Field label="Капаро, €" htmlFor="deposit" hint="Празно = 50% от „Цена от“, закръглено до 10 € при диапазон.">
            <Input id="deposit" name="deposit" type="number" step="0.01" min={0} defaultValue={s?.deposit ?? ""} />
          </Field>
        </div>
        <Field label="Кратко описание" htmlFor="description">
          <Textarea id="description" name="description" rows={2} defaultValue={s?.description} />
        </Field>
        <Field label="Включва" htmlFor="includes" hint="Какво точно е включено — показва се на клиента.">
          <Textarea id="includes" name="includes" rows={3} defaultValue={s?.includes} />
        </Field>
        <Field label="Подходящо за породи" htmlFor="breeds">
          <Input id="breeds" name="breeds" defaultValue={s?.breeds} />
        </Field>
        <div className="flex flex-wrap gap-6 text-[15px]">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_addon" defaultChecked={s?.is_addon ?? false} className="size-4 accent-terracotta" />
            Само като допълнителна услуга
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="addon_allowed" defaultChecked={s?.addon_allowed ?? false} className="size-4 accent-terracotta" />
            Може да се добави към друга услуга
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_active" defaultChecked={s?.is_active ?? true} className="size-4 accent-terracotta" />
            Активна
          </label>
        </div>
        <div className="flex items-center gap-3">
          <SubmitButton size="md">{s ? "Запази" : "Добави"}</SubmitButton>
          <Link href="/admin/services" className="text-sm link-underline">Назад</Link>
        </div>
      </ActionForm>
      {s && (
        <ActionForm action={deleteService} confirm="Изтриване на услугата? Старите резервации запазват името ѝ." className="mt-10">
          <input type="hidden" name="id" value={s.id} />
          <SubmitButton variant="danger">Изтрий услугата</SubmitButton>
        </ActionForm>
      )}
    </>
  );
}
