import { NextResponse, type NextRequest } from "next/server";
import { listOffices, SpeedyError } from "@/lib/shipping/speedy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const siteId = Number(req.nextUrl.searchParams.get("siteId"));
  const t = req.nextUrl.searchParams.get("type");
  if (!Number.isInteger(siteId) || siteId <= 0) return NextResponse.json({ error: "Невалидно населено място" }, { status: 400 });
  const type = t === "APT" ? "APT" : t === "OFFICE" ? "OFFICE" : undefined;
  try {
    return NextResponse.json({ offices: await listOffices(siteId, type) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof SpeedyError ? e.message : "Грешка при зареждане на офисите" }, { status: 502 });
  }
}
