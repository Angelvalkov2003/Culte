import { db } from "@/lib/supabase/admin";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/settings";
import { saveSettings } from "@/app/admin/_actions/settings";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Field, Input } from "@/components/ui/field";

export const metadata = { title: "Настройки" };

export default async function SettingsPage() {
  const { data } = await db().from("settings").select("key, value");
  const s = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const r of data ?? []) s[r.key] = r.value;
  const v = s as unknown as SiteSettings;

  const text = (key: keyof SiteSettings, label: string, hint?: string, type = "text") => (
    <Field label={label} htmlFor={key} hint={hint}>
      <Input id={key} name={key} type={type} defaultValue={Array.isArray(v[key]) ? (v[key] as string[]).join(", ") : String(v[key] ?? "")} />
    </Field>
  );

  return (
    <>
      <PageHeader title="Настройки" />
      <ActionForm action={saveSettings} className="max-w-3xl space-y-6">
        <Panel title="Салон">
          <div className="grid gap-5 sm:grid-cols-2">
            {text("business_name", "Име")}
            {text("phone", "Телефон")}
            <div className="sm:col-span-2">{text("slogan", "Слоган")}</div>
            <div className="sm:col-span-2">{text("address", "Адрес")}</div>
            {text("team", "Екип", "Имена, разделени със запетая")}
            {text("cosmetics", "Козметика", "Марки, разделени със запетая")}
          </div>
        </Panel>
        <Panel title="Линкове">
          <div className="grid gap-5 sm:grid-cols-2">
            {text("instagram_url", "Instagram", undefined, "url")}
            {text("facebook_url", "Facebook", undefined, "url")}
            {text("tiktok_url", "TikTok", undefined, "url")}
            {text("map_url", "Google Maps", undefined, "url")}
          </div>
        </Panel>
        <Panel title="Записване">
          <div className="grid gap-5 sm:grid-cols-2">
            {text("deposit_percent", "Капаро, %", "Процент от началната цена", "number")}
            {text("slot_step_min", "Стъпка на часовете, мин", undefined, "number")}
            {text("min_lead_hours", "Минимум часове напред", undefined, "number")}
            {text("max_days_ahead", "Максимум дни напред", undefined, "number")}
            {text("hold_minutes", "Задържане за плащане, мин", "Минимум 30 (изискване на Stripe)", "number")}
          </div>
        </Panel>
        <SubmitButton size="md">Запази настройките</SubmitButton>
      </ActionForm>
    </>
  );
}
