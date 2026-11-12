import { NextResponse, type NextRequest } from "next/server";
import { boxnowConfigured, searchBoxnowLockers } from "@/lib/shipping/boxnow";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!boxnowConfigured()) return NextResponse.json({ error: "BoxNow не е достъпен" }, { status: 503 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 60);
  try {
    return NextResponse.json({ lockers: await searchBoxnowLockers(q) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Грешка" }, { status: 502 });
  }
}
