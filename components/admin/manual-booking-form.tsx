"use client";

import { useState } from "react";
import { createManualBooking } from "@/app/admin/_actions/bookings";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Panel } from "@/components/admin/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { formatRange } from "@/lib/format";
import { SIZE_LABEL, type DogSize, type Service } from "@/lib/types";

export function ManualBookingForm({ services, defaultDate, defaultTime }: { services: Service[]; defaultDate: string; defaultTime: string }) {
  const [size, setSize] = useState<DogSize>("small");
  const [mainId, setMainId] = useState("");
  const [addons, setAddons] = useState<string[]>([]);
  const sized = services.filter((s) => s.size === size);
  const chosen = sized.filter((s) => s.id === mainId || addons.includes(s.id));
  const duration = chosen.reduce((a, s) => a + s.duration_max, 0);

  return (
    <ActionForm action={createManualBooking} className="grid max-w-4xl gap-6 lg:grid-cols-2">
      <Panel title="Услуги">
        <div className="space-y-4">
          <Field label="Размер" htmlFor="size">
            <Select id="size" name="size" value={size} onChange={(e) => { setSize(e.target.value as DogSize); setMainId(""); setAddons([]); }}>
              {(["small", "medium", "large"] as DogSize[]).map((s) => <option key={s} value={s}>{SIZE_LABEL[s]}</option>)}
            </Select>
          </Field>
          <Field label="Основна услуга" htmlFor="main_id">
            <Select id="main_id" name="main_id" value={mainId} required onChange={(e) => { setMainId(e.target.value); setAddons((a) => a.filter((x) => x !== e.target.value)); }}>
              <option value="">Изберете</option>
              {sized.filter((s) => !s.is_addon).map((s) => <option key={s.id} value={s.id}>{s.name} ({formatRange(s.price_from, s.price_to)})</option>)}
            </Select>
          </Field>
          {mainId && (
            <fieldset>
              <legend className="text-sm font-medium">Допълнителни</legend>
              <div className="mt-2 space-y-1.5">
                {sized.filter((s) => s.id !== mainId).map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="addon_ids[]" value={s.id} checked={addons.includes(s.id)} className="size-4 accent-terracotta"
                      onChange={() => setAddons((a) => (a.includes(s.id) ? a.filter((x) => x !== s.id) : [...a, s.id]))} />
                    {s.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      </Panel>
      <Panel title="Кога">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Дата" htmlFor="date"><Input id="date" name="date" type="date" defaultValue={defaultDate} required /></Field>
          <Field label="Час" htmlFor="time"><Input id="time" name="time" type="time" step={300} defaultValue={defaultTime} required /></Field>
          <Field label="Минути" htmlFor="duration" hint={duration ? `По услуги: ${duration}` : undefined}>
            <Input id="duration" name="duration" type="number" min={5} step={5} placeholder={duration ? String(duration) : "авт."} />
          </Field>
        </div>
      </Panel>
      <Panel title="Клиент" className="lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Име" htmlFor="customer_name"><Input id="customer_name" name="customer_name" required /></Field>
          <Field label="Телефон" htmlFor="customer_phone"><Input id="customer_phone" name="customer_phone" type="tel" required /></Field>
          <Field label="Имейл (по желание)" htmlFor="customer_email"><Input id="customer_email" name="customer_email" type="email" /></Field>
          <Field label="Име на кучето" htmlFor="dog_name"><Input id="dog_name" name="dog_name" /></Field>
          <Field label="Порода" htmlFor="dog_breed"><Input id="dog_breed" name="dog_breed" /></Field>
          <Field label="Бележка" htmlFor="admin_note"><Input id="admin_note" name="admin_note" /></Field>
          <Field label="Съобщение" htmlFor="message" className="sm:col-span-2 lg:col-span-3"><Textarea id="message" name="message" rows={2} /></Field>
        </div>
      </Panel>
      <div className="lg:col-span-2">
        <SubmitButton size="md">Създай резервацията</SubmitButton>
      </div>
    </ActionForm>
  );
}
