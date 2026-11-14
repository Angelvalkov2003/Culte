import type { Metadata } from "next";
import { getActiveServices } from "@/lib/booking/services";
import { getSettings } from "@/lib/settings";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { DogCutout } from "@/components/site/dog-figure";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Запиши своя час за груминг",
  description: "Изберете услуга, ден и свободен час в груминг салон Culte в Пловдив и потвърдете с капаро онлайн.",
  alternates: { canonical: "/booking" },
};

export default async function BookingPage() {
  const [services, settings] = await Promise.all([getActiveServices(), getSettings()]);
  return (
    <div className="container-page pt-12 pb-8">
      <header className="flex items-end justify-between gap-8">
        <div className="max-w-2xl">
          <h1 className="animate-rise text-[clamp(2.4rem,5vw,3.8rem)]">Запиши своя час за груминг 🐾</h1>
          <p className="mt-4 text-[15px] leading-7 text-espresso-soft">
            Работим с едно куче наведнъж, затова всеки час е изцяло ваш. При записване плащате капаро, остатъкът се плаща в
            салона.
          </p>
        </div>
        <DogCutout dog="peach" priority sizes="240px" className="-mb-px hidden w-[240px] shrink-0 md:block" />
      </header>
      <div className="mt-10">
        {services.length === 0 ? (
          <p className="rounded-lg bg-sand p-6 text-[15px]">
            Онлайн записването временно не е достъпно. Обадете ни се на{" "}
            <a className="link-underline" href={`tel:${settings.phone.replace(/\s+/g, "")}`}>
              {settings.phone}
            </a>
            .
          </p>
        ) : (
          <BookingWizard services={services} depositPercent={Number(settings.deposit_percent) || 50} />
        )}
      </div>
    </div>
  );
}
