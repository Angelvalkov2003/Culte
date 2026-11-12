import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import { getOrder } from "@/lib/shop/orders";
import { boxnowLabel } from "@/lib/shipping/boxnow";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const o = await getOrder(id);
  if (!o?.boxnow_parcel_id) return NextResponse.json({ error: "Няма BoxNow пратка" }, { status: 404 });
  try {
    const pdf = await boxnowLabel(o.boxnow_parcel_id);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="boxnow-${o.number}-${o.boxnow_parcel_id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Грешка при етикета" }, { status: 502 });
  }
}
