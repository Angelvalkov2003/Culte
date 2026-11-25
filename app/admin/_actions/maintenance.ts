"use server";

import { z } from "zod";
import { adminAction } from "@/lib/admin/action";
import { runDailyMaintenance } from "@/lib/maintenance";

export const runMaintenance = adminAction(z.object({}), async () => {
  const r = await runDailyMaintenance();
  return r.sent ? `Изпратени напомняния за утре: ${r.sent}. Почистването е направено.` : "Няма нови напомняния за утре. Почистването е направено.";
}, ["/admin"]);
