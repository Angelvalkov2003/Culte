import { db } from "@/lib/supabase/admin";
import { todaySofia } from "@/lib/time";
import type { Service } from "@/lib/types";
import { PageHeader } from "@/components/admin/ui";
import { ManualBookingForm } from "@/components/admin/manual-booking-form";

export const metadata = { title: "Ръчна резервация" };

export default async function NewBooking({ searchParams }: { searchParams: Promise<{ date?: string; time?: string }> }) {
  const sp = await searchParams;
  const { data } = await db().from("services").select("*").eq("is_active", true).order("sort_order");
  return (
    <>
      <PageHeader title="Ръчна резервация">Например при записване по телефона. Без плащане, статус „Потвърдена“.</PageHeader>
      <ManualBookingForm
        services={(data ?? []) as Service[]}
        defaultDate={sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todaySofia()}
        defaultTime={sp.time && /^\d{2}:\d{2}$/.test(sp.time) ? sp.time : "10:00"}
      />
    </>
  );
}
