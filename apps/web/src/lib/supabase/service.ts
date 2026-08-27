import "server-only";

import { createClient } from "@supabase/supabase-js";

import { serverEnv } from "@/lib/env/server";

import type { Database } from "./database.types";

export function createServiceSupabaseClient() {
  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error("Worker broker is not configured");
  return createClient<Database>(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
