import "server-only";

import { cache } from "react";

import type { OrganizationPluginRow } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const getOrganizationPluginStates = cache(
  async (organizationId: string): Promise<OrganizationPluginRow[]> => {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("organization_plugins")
      .select(
        "created_at, disabled_at, enabled, enabled_at, enabled_by, organization_id, plugin_id, updated_at, updated_by",
      )
      .eq("organization_id", organizationId)
      .order("plugin_id", { ascending: true });
    if (error) throw new Error("Plugin state could not be loaded");
    return data ?? [];
  },
);

export async function getEnabledOrganizationPluginIds(organizationId: string) {
  return (await getOrganizationPluginStates(organizationId))
    .filter((state) => state.enabled)
    .map((state) => state.plugin_id);
}
