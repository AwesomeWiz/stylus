"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canManageOrganization } from "@/modules/organizations/authorization";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { builtInPluginRegistry } from "@/plugins";

import { pluginEnablementSchema } from "./schemas";

export interface PluginActionState {
  message?: string;
  status: "idle" | "error" | "success";
}

export const initialPluginActionState: PluginActionState = { status: "idle" };

export async function setPluginEnabledAction(
  _state: PluginActionState = initialPluginActionState,
  formData: FormData,
): Promise<PluginActionState> {
  void _state;
  const parsed = pluginEnablementSchema.safeParse({
    enabled: formData.get("enabled"),
    pluginId: formData.get("pluginId"),
  });
  if (!parsed.success || !builtInPluginRegistry.get(parsed.data.pluginId))
    return { message: "The plugin selection is invalid.", status: "error" };
  try {
    const context = await getCurrentOrganizationContext();
    if (!context || !canManageOrganization(context.membership.role))
      return {
        message: "You do not have permission to manage plugins.",
        status: "error",
      };
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("set_organization_plugin_enabled", {
      p_enabled: parsed.data.enabled,
      p_organization_id: context.organization.id,
      p_plugin_id: parsed.data.pluginId,
    });
    if (error)
      return {
        message: "The plugin state could not be saved.",
        status: "error",
      };
    revalidatePath("/", "layout");
    return {
      message: parsed.data.enabled ? "Plugin enabled." : "Plugin disabled.",
      status: "success",
    };
  } catch {
    return { message: "The plugin state could not be saved.", status: "error" };
  }
}
