import { db } from "@/lib/supabase/admin";
import { DEFAULT_HOURS, WEEKDAY_LABEL } from "@/lib/settings";
import type { BusinessHours } from "@/lib/types";
import { saveHours } from "@/app/admin/_actions/schedule";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Input } from "@/components/ui/field";
import { CheckboxBox } from "@/components/ui/checkbox";

export const metadata = { title: "Работно време" };

export default async function HoursPage() {
  const { data } = await db().from("business_hours").select("*").order("weekday");
  const hours = ((data?.length ? data : DEFAULT_HOURS) as BusinessHours[]).map((h) => ({
    ...h,
    open_time: h.open_time.slice(0, 5),
    close_time: h.close_time.slice(0, 5),
  }));
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <>
      <PageHeader title="Работно време">Последният час за запис е такъв, че услугата да приключи до затварянето.</PageHeader>
      <Panel className="max-w-2xl">
        <ActionForm action={saveHours} className="space-y-3">
          {order.map((d) => {
            const h = hours.find((x) => x.weekday === d) ?? DEFAULT_HOURS[d];
            return (
              <div
                key={d}
                className="grid grid-cols-2 items-center gap-x-3 gap-y-2 border-b border-line/70 pb-3 last:border-0 sm:grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)_auto] sm:border-0 sm:pb-0"
              >
                <span className="text-sm font-medium">{WEEKDAY_LABEL[d]}</span>
                <label className="flex items-center gap-2 justify-self-end text-sm sm:order-last">
                  <CheckboxBox name={`closed_${d}`} defaultChecked={h.is_closed} /> Почивен
                </label>
                <label className="min-w-0 text-xs text-espresso-soft">
                  <span className="mb-1 block sm:sr-only">Отваря</span>
                  <Input type="time" name={`open_${d}`} defaultValue={h.open_time} step={1800} className="min-w-0" aria-label={`${WEEKDAY_LABEL[d]} отваря`} />
                </label>
                <label className="min-w-0 text-xs text-espresso-soft">
                  <span className="mb-1 block sm:sr-only">Затваря</span>
                  <Input type="time" name={`close_${d}`} defaultValue={h.close_time} step={1800} className="min-w-0" aria-label={`${WEEKDAY_LABEL[d]} затваря`} />
                </label>
              </div>
            );
          })}
          <div className="pt-3">
            <SubmitButton size="md">Запази</SubmitButton>
          </div>
        </ActionForm>
      </Panel>
    </>
  );
}
