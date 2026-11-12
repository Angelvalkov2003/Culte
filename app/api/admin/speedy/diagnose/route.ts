import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { calculate, listOffices, searchSites, speedyConfigured, SPEEDY_WEIGHT_KG } from "@/lib/shipping/speedy";

export const dynamic = "force-dynamic";

// Само за админ (proxy + проверка тук). Никога не връща паролата.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const out: Record<string, unknown> = {
    hasUsername: Boolean(process.env.SPEEDY_USERNAME?.trim()),
    hasPassword: Boolean(process.env.SPEEDY_PASSWORD?.trim()),
    weightKg: SPEEDY_WEIGHT_KG,
  };
  if (!speedyConfigured()) return NextResponse.json({ ...out, ok: false });
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      out[name] = await fn();
    } catch (e) {
      out[name] = { error: e instanceof Error ? e.message : String(e) };
    }
  };
  let siteId: number | null = null;
  await step("sites", async () => {
    const s = await searchSites("София");
    siteId = s.find((x) => x.name.toUpperCase() === "СОФИЯ")?.id ?? s[0]?.id ?? null;
    return { count: s.length, first: s.slice(0, 3).map((x) => x.label), siteId };
  });
  if (siteId) {
    const sid: number = siteId;
    let officeId: number | null = null;
    await step("offices", async () => {
      const all = await listOffices(sid);
      officeId = all.find((o) => o.type === "OFFICE")?.id ?? null;
      return { total: all.length, office: all.filter((o) => o.type === "OFFICE").length, apt: all.filter((o) => o.type === "APT").length };
    });
    await step("calculateAddress", () => calculate({ method: "speedy_address", siteId: sid }));
    if (officeId) await step("calculateOffice", () => calculate({ method: "speedy_office", siteId: sid, officeId }));
  }
  const ok = !Object.values(out).some((v) => v && typeof v === "object" && "error" in (v as object));
  return NextResponse.json({ ...out, ok });
}
