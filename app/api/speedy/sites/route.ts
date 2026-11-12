import { NextResponse, type NextRequest } from "next/server";
import { searchSites, SpeedyError } from "@/lib/shipping/speedy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 60);
  if (q.trim().length < 2) return NextResponse.json({ sites: [] });
  try {
    return NextResponse.json({ sites: await searchSites(q) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof SpeedyError ? e.message : "Грешка при търсене" }, { status: 502 });
  }
}
