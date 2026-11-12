import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { calculate, SpeedyError } from "@/lib/shipping/speedy";

export const dynamic = "force-dynamic";

const schema = z.object({
  method: z.enum(["speedy_office", "speedy_apt", "speedy_address"]),
  siteId: z.number().int().positive(),
  officeId: z.number().int().positive().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Невалидна заявка" }, { status: 400 });
  try {
    return NextResponse.json(await calculate(parsed.data));
  } catch (e) {
    return NextResponse.json({ error: e instanceof SpeedyError ? e.message : "Цената не може да бъде изчислена" }, { status: 502 });
  }
}
