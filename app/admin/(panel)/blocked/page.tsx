import { db } from "@/lib/supabase/admin";
import { daysAgoISO, fmt, formatDateTime, todaySofia } from "@/lib/time";
import type { BlockedPeriod } from "@/lib/types";
import { deleteBlocked, saveBlocked } from "@/app/admin/_actions/schedule";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";
import { Field, Input } from "@/components/ui/field";

export const metadata = { title: "Блокирани периоди" };

function Fields({ p }: { p?: BlockedPeriod }) {
  const k = p?.id ?? "new";
  const today = todaySofia();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {p && <input type="hidden" name="id" value={p.id} />}
      <Field label="От дата" htmlFor={`sd-${k}`}>
        <Input id={`sd-${k}`} type="date" name="start_date" required defaultValue={p ? fmt(p.start_at, "yyyy-MM-dd") : today} />
      </Field>
      <Field label="От час" htmlFor={`st-${k}`}>
        <Input id={`st-${k}`} type="time" name="start_time" defaultValue={p ? fmt(p.start_at, "HH:mm") : "00:00"} />
      </Field>
      <Field label="До дата" htmlFor={`ed-${k}`}>
        <Input id={`ed-${k}`} type="date" name="end_date" required defaultValue={p ? fmt(p.end_at, "yyyy-MM-dd") : today} />
      </Field>
      <Field label="До час" htmlFor={`et-${k}`}>
        <Input id={`et-${k}`} type="time" name="end_time" defaultValue={p ? fmt(p.end_at, "HH:mm") : "23:59"} />
      </Field>
      <Field label="Причина" htmlFor={`r-${k}`}>
        <Input id={`r-${k}`} name="reason" defaultValue={p?.reason} placeholder="Отпуск, обучение…" />
      </Field>
    </div>
  );
}

export default async function BlockedPage() {
  const { data } = await db()
    .from("blocked_periods")
    .select("*")
    .gte("end_at", daysAgoISO(30))
    .order("start_at");
  const periods = (data ?? []) as BlockedPeriod[];
  return (
    <>
      <PageHeader title="Блокирани периоди">В тези периоди не се показват свободни часове за онлайн записване.</PageHeader>
      <Panel title="Блокирай период" className="mb-6">
        <ActionForm action={saveBlocked} resetOnSuccess className="space-y-4">
          <Fields />
          <SubmitButton>Блокирай</SubmitButton>
        </ActionForm>
      </Panel>
      {!periods.length ? (
        <Empty>Няма блокирани периоди.</Empty>
      ) : (
        <div className="space-y-3">
          {periods.map((p) => (
            <Panel key={p.id} title={`${formatDateTime(p.start_at)} – ${formatDateTime(p.end_at)}${p.reason ? ` · ${p.reason}` : ""}`}>
              <ActionForm action={saveBlocked} className="space-y-4">
                <Fields p={p} />
                <SubmitButton variant="secondary">Запази</SubmitButton>
              </ActionForm>
              <ActionForm action={deleteBlocked} confirm="Премахване на блокирането?" className="mt-2">
                <input type="hidden" name="id" value={p.id} />
                <SubmitButton variant="ghost" className="text-danger">Премахни</SubmitButton>
              </ActionForm>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
