import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import { getOrder } from "@/lib/shop/orders";
import { printLabel, SpeedyError } from "@/lib/shipping/speedy";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const o = await getOrder(id);
  if (!o?.speedy_parcel_id) return NextResponse.json({ error: "Няма Speedy пратка" }, { status: 404 });
  try {
    const pdf = await printLabel(o.speedy_parcel_id);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="speedy-${o.number}-${o.speedy_parcel_id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof SpeedyError ? e.message : "Грешка при етикета" }, { status: 502 });
  }
}
