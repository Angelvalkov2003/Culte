import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let client: SupabaseClient | null = null;

/** Publishable ключ — само четене на публични данни (RLS). */
export function publicDb(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl(), env.supabasePublicKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
