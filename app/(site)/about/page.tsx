import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { ButtonLink } from "@/components/ui/button";
import { PopOut } from "@/components/site/dog-figure";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "За нас",
  description: "Culte — груминг салон в Пловдив, в който работим с едно куче наведнъж, и магазин за козметика за кучета.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <div className="container-page pt-12">
      <div className="grid gap-12 md:grid-cols-12">
        <h1 className="animate-rise text-[clamp(2.6rem,6vw,4.6rem)] md:col-span-8">{s.slogan}</h1>
        <div className="prose-culte md:col-span-6 md:col-start-2">
          <p>
            Culte започна от едно просто правило: кучето в салона трябва да се чувства спокойно. Затова работим с едно куче
            наведнъж, без бързане и без чакане в клетка. Така имаме време да го опознаем, да видим кожата и козината и да
            направим точно това, от което има нужда.
          </p>
          <p>
            В салона ще срещнете {s.team.join(" и ")}. Работим с козметика {s.cosmetics.join(" и ")} и с продуктите, които
            виждате в магазина ни. Всеки от тях сме изпробвали първо в салона, преди да го предложим за домашна грижа.
          </p>
          <h2>Как работим</h2>
          <ul>
            <li>Преди първото подстригване питаме за навиците, страховете и здравето на кучето.</li>
            <li>Подбираме шампоан и балсам според типа козина и чувствителността на кожата.</li>
            <li>Ако кучето се напрегне, правим почивка и продължаваме, когато е готово.</li>
            <li>След груминга ви казваме какво видяхме и как да поддържате козината у дома.</li>
          </ul>
        </div>
        <aside className="group animate-rise self-start [animation-delay:150ms] md:col-span-4 md:col-start-9 md:row-span-2 md:row-start-1">
          <PopOut dog="puppy" tone="sand" priority className="mx-auto max-w-[320px] md:max-w-none" blockClassName="rounded-b-none" sizes="(min-width: 768px) 380px, 320px" />
          <div className="mx-auto max-w-[320px] rounded-b-lg bg-sand p-6 pt-2 md:max-w-none">
          <p className="font-serif text-2xl">Елате да се запознаем</p>
          <p className="mt-2 text-[15px] text-espresso-soft">{s.address}</p>
          <ButtonLink href="/booking" className="mt-6">Запази час</ButtonLink>
          </div>
        </aside>
      </div>
    </div>
  );
}
