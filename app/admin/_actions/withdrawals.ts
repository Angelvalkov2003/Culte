"use server";

import { z } from "zod";
import { adminAction, f } from "@/lib/admin/action";
import { db } from "@/lib/supabase/admin";

export const updateWithdrawal = adminAction(
  z.object({ id: f.uuid(), status: z.enum(["received", "processed", "rejected"]), admin_note: f.text(1000) }),
  async ({ id, ...row }) => {
    const { error } = await db().from("withdrawal_requests").update(row).eq("id", id);
    if (error) throw new Error(error.message);
    return "Запазено.";
  },
);
