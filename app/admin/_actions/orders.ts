"use server";

import { z } from "zod";
import { adminAction, f } from "@/lib/admin/action";
import { db } from "@/lib/supabase/admin";
import { changeOrderStatus } from "@/lib/shop/orders";

const STATUSES = ["pending_payment", "new", "processing", "shipped", "delivered", "cancelled", "expired", "stock_issue"] as const;

export const updateOrderStatus = adminAction(
  z.object({ id: f.uuid(), status: z.enum(STATUSES), tracking_number: f.text(100) }),
  async ({ id, status, tracking_number }) => {
    await changeOrderStatus(id, status, tracking_number);
    return status === "shipped"
      ? "Статусът е сменен и клиентът е уведомен."
      : status === "cancelled"
        ? "Поръчката е отказана и бройките са върнати."
        : "Статусът е сменен.";
  },
  ["/"],
);

export const saveOrderDetails = adminAction(
  z.object({
    id: f.uuid(),
    customer_name: f.req("Име", 100),
    customer_phone: f.req("Телефон", 30),
    customer_email: z.email("Невалиден имейл."),
    city: f.text(80),
    address: f.text(300),
    admin_note: f.text(1000),
  }),
  async ({ id, ...row }) => {
    const { error } = await db().from("orders").update(row).eq("id", id);
    if (error) throw new Error(error.message);
    return "Данните са запазени.";
  },
);
