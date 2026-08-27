import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getOrganizationWorkers(organizationId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("list_organization_workers", {
    p_organization_id: organizationId,
  });
  if (error) throw new Error("Workers could not be loaded");
  return data ?? [];
}
