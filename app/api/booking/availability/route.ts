import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { DOG_SIZES } from "@/lib/types";
import { getAvailability } from "@/lib/booking/availability";
import { resolveServices, quote } from "@/lib/booking/services";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const query = z.object({
  size: z.enum(DOG_SIZES),
  main: z.uuid(),
  addons: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const parsed = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Невалидна заявка" }, { status: 400 });
  const addonIds = (parsed.data.addons ?? "")
    .split(",")
    .filter((id) => z.uuid().safeParse(id).success)
    .slice(0, 12);

  try {
    const resolved = await resolveServices(parsed.data.size, parsed.data.main, addonIds);
    if (!resolved) return NextResponse.json({ error: "Невалидни услуги" }, { status: 400 });
    const settings = await getSettings();
    const q = quote(resolved.main, resolved.addons, Number(settings.deposit_percent) || 50);
    const availability = await getAvailability(q.durationMin);
    return NextResponse.json(
      { ...availability, durationMin: q.durationMin },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("availability", e);
    return NextResponse.json({ error: "Календарът не е достъпен в момента" }, { status: 500 });
  }
}
