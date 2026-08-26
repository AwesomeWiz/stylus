import "server-only";

import { notFound, redirect } from "next/navigation";

import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { authorizePluginAvailability } from "@/modules/plugins/authorization";
import { builtInPluginRegistry } from "@/plugins";

import { getEnabledOrganizationPluginIds } from "./data";

export async function requireEnabledPlugin(pluginId: string) {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/organization/new");
  try {
    authorizePluginAvailability({
      enabledPluginIds: await getEnabledOrganizationPluginIds(
        context.organization.id,
      ),
      pluginId,
      registeredPluginIds: builtInPluginRegistry
        .list()
        .map((definition) => definition.manifest.id),
    });
  } catch {
    notFound();
  }
  return {
    context,
    plugin: builtInPluginRegistry.get(pluginId)!,
  };
}
