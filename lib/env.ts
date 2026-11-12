import "server-only";

function read(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function required(name: string): string {
  const v = read(name);
  if (!v) throw new Error(`Липсва env променлива ${name}`);
  return v;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabasePublicKey: () =>
    read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY") || required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  stripeSecret: () => required("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => required("STRIPE_WEBHOOK_SECRET"),
  resendKey: () => read("RESEND_API_KEY"),
  contactEmail: () => read("CONTACT_EMAIL"),
  /** true → имейли и до клиентите (нужен е верифициран домейн в Resend). */
  emailToCustomers: () => read("EMAIL_TO_CUSTOMERS") === "true",
  emailFrom: () => read("EMAIL_FROM") || "Culte <onboarding@resend.dev>",
  adminPassword: () => required("ADMIN_PASSWORD"),
  adminSecret: () => required("ADMIN_SESSION_SECRET"),
  cronSecret: () => read("CRON_SECRET"),
  cloudinaryUrl: () => read("CLOUDINARY_URL"),
};

export function siteUrl(): string {
  return (read("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000").replace(/\/$/, "");
}

/** Supabase е конфигуриран (позволява build без ключове). */
export function hasSupabase(): boolean {
  return Boolean(
    read("NEXT_PUBLIC_SUPABASE_URL") &&
      (read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY") || read("NEXT_PUBLIC_SUPABASE_ANON_KEY")),
  );
}

export function cloudinaryConfig() {
  const url = env.cloudinaryUrl();
  if (!url) return null;
  try {
    const u = new URL(url);
    return {
      cloudName: u.hostname,
      apiKey: decodeURIComponent(u.username),
      apiSecret: decodeURIComponent(u.password),
    };
  } catch {
    return null;
  }
}
