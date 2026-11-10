import Link from "next/link";
import { db } from "@/lib/supabase/admin";
import { formatDuration, formatRange } from "@/lib/format";
import { SIZE_LABEL, type DogSize, type Service } from "@/lib/types";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, Table, Td, Th } from "@/components/admin/ui";

export const metadata = { title: "Услуги" };

export default async function ServicesPage() {
  const { data } = await db().from("services").select("*").order("size").order("sort_order");
  const services = (data ?? []) as Service[];
  return (
    <>
      <PageHeader title="Услуги" actions={<ButtonLink href="/admin/services/new" size="sm">Нова услуга</ButtonLink>}>
        Продължителността на резервацията е сумата от максималните времена; капарото е от началните цени.
      </PageHeader>
      <div className="space-y-10">
        {(["small", "medium", "large"] as DogSize[]).map((size) => (
          <section key={size}>
            <h2 className="mb-3 text-2xl">{SIZE_LABEL[size]}</h2>
            <Table>
              <thead>
                <tr><Th>Услуга</Th><Th>Тип</Th><Th>Време</Th><Th className="text-right">Цена</Th><Th>Статус</Th></tr>
              </thead>
              <tbody>
                {services.filter((s) => s.size === size).map((s) => (
                  <tr key={s.id} className={s.is_active ? "" : "text-espresso/50"}>
                    <Td><Link href={`/admin/services/${s.id}`} className="font-medium hover:text-terracotta">{s.name}</Link></Td>
                    <Td>{s.is_addon ? "Допълнителна" : "Основна"}</Td>
                    <Td>{formatDuration(s.duration_min, s.duration_max)}</Td>
                    <Td className="text-right tabular-nums">{formatRange(s.price_from, s.price_to)}</Td>
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
