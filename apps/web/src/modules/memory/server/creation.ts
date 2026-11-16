import "server-only";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

/** Read an exact company-memory creation identity under existing member RLS. */
export async function findCompanyMemoryCreation(key: string) {
  z.string().min(1).max(160).parse(key);
  const current = await getCurrentOrganizationContext();
  if (!current) throw Error("Company memory unavailable.");
  const db = await createServerSupabaseClient();
  const result = await db
    .from("knowledge_memories")
    .select("id,title,archived_at")
    .eq("organization_id", current.organization.id)
    .eq("domain", "company")
    .eq("creation_key", key)
    .maybeSingle();
  if (result.error) throw Error("Company memory could not load.");
  return result.data;
}
