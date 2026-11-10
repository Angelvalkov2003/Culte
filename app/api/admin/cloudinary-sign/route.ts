import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { cloudinaryConfig } from "@/lib/env";

// Signed upload само за админ (proxy + повторна проверка тук).
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cfg = cloudinaryConfig();
  if (!cfg) return NextResponse.json({ error: "Cloudinary не е конфигуриран" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as { paramsToSign?: Record<string, string | number> } | null;
  const params = body?.paramsToSign;
  if (!params || typeof params !== "object") return NextResponse.json({ error: "Bad request" }, { status: 400 });

  // Позволяваме качване само в папката на продуктите
  if (params.folder && params.folder !== "culte/products") {
    return NextResponse.json({ error: "Forbidden folder" }, { status: 403 });
  }

  const toSign = Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] != null)
    .sort()
    .map((k) => `${k}=${Array.isArray(params[k]) ? (params[k] as unknown as string[]).join(",") : params[k]}`)
    .join("&");
  const signature = createHash("sha1").update(toSign + cfg.apiSecret).digest("hex");
  return NextResponse.json({ signature });
}
