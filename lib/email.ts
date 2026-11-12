import "server-only";
import type { ReactElement } from "react";
import { Resend } from "resend";
import { env } from "@/lib/env";

let client: Resend | null = null;

function resend(): Resend | null {
  const key = env.resendKey();
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

/**
 * Праща имейл; никога не хвърля — грешките се логват, за да не спират плащане/webhook.
 * Без верифициран домейн в Resend имейли получава само собственикът (CONTACT_EMAIL);
 * писмата до клиенти се пропускат, освен ако EMAIL_TO_CUSTOMERS=true.
 */
export async function sendEmail(opts: { to: string | string[]; subject: string; react: ReactElement; replyTo?: string }) {
  const r = resend();
  const owner = env.contactEmail().toLowerCase();
  const to = (Array.isArray(opts.to) ? opts.to : [opts.to])
    .filter(Boolean)
    .filter((addr) => env.emailToCustomers() || addr.trim().toLowerCase() === owner);
  if (!r || !to.length) {
    if (!r) console.warn(`[email] пропуснат (няма RESEND_API_KEY): ${opts.subject}`);
    return;
  }
  try {
    const { error } = await r.emails.send({
      from: env.emailFrom(),
      to,
      subject: opts.subject,
      react: opts.react,
      replyTo: opts.replyTo,
    });
    if (error) console.error("[email]", error.message);
  } catch (e) {
    console.error("[email]", e);
  }
}

export function adminEmail(): string {
  return env.contactEmail();
}
