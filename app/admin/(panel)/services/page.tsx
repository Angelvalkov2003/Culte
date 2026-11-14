import Link from "next/link";
import { db } from "@/lib/supabase/admin";
import { formatDuration, formatEUR, formatRange } from "@/lib/format";
import { serviceDeposit } from "@/lib/booking/deposit";
import { DOG_SIZES, SERVICE_GROUP_LABEL, SIZE_HINT, SIZE_LABEL, type Service } from "@/lib/types";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, Table, Td, Th } from "@/components/admin/ui";

export const metadata = { title: "Услуги" };

export default async function ServicesPage() {
  const { data } = await db().from("services").select("*").order("size").order("sort_order");
  const services = (data ?? []) as Service[];
  return (
    <>
      <PageHeader title="Услуги" actions={<ButtonLink href="/admin/services/new" size="sm">Нова услуга</ButtonLink>}>
        Продължителността на резервацията е сумата от максималните времена; капарото е сумата от капарата на услугите.
      </PageHeader>
      <div className="space-y-10">
        {DOG_SIZES.map((size) => (
          <section key={size}>
            <h2 className="mb-3 text-2xl">{SIZE_LABEL[size]} <span className="font-sans text-sm text-espresso-soft">{SIZE_HINT[size]}</span></h2>
            <Table>
              <thead>
                <tr><Th>Услуга</Th><Th>Група</Th><Th>Време</Th><Th className="text-right">Цена</Th><Th className="text-right">Капаро</Th><Th>Статус</Th></tr>
              </thead>
              <tbody>
                {services.filter((s) => s.size === size).map((s) => (
                  <tr key={s.id} className={s.is_active ? "" : "text-espresso/50"}>
                    <Td><Link href={`/admin/services/${s.id}`} className="font-medium hover:text-terracotta">{s.name}</Link></Td>
                    <Td>{SERVICE_GROUP_LABEL[s.group_name]}{s.is_addon ? ", само добавка" : s.addon_allowed ? ", и като добавка" : ""}</Td>
                    <Td>{formatDuration(s.duration_min, s.duration_max)}</Td>
                    <Td className="text-right tabular-nums">{formatRange(s.price_from, s.price_to)}</Td>
                    <Td className="text-right tabular-nums">{formatEUR(serviceDeposit(s, 50))}</Td>
                    <Td>{s.is_active ? "Активна" : "Скрита"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </section>
        ))}
      </div>
    </>
  );
}
