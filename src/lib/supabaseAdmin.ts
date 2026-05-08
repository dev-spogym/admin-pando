import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

let cachedAdmin: SupabaseClient | null = null;

function assertServerEnvironment() {
  if (typeof window !== "undefined") {
    throw new Error("supabaseAdmin must not be imported into client bundles.");
  }
}

export function getSupabaseAdmin(): SupabaseClient | null {
  assertServerEnvironment();
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  if (!cachedAdmin) {
    cachedAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return cachedAdmin;
}

export function requireSupabaseAdmin(): SupabaseClient {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. Server-side staff account sync requires it."
    );
  }
  return admin;
}
