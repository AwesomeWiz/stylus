import { createPluginRegistry, definePlugin } from "@/core/plugins/public";
import {
  coreNavigationGroups,
  type NavigationGroup,
} from "@/components/layout/navigation";

import { examplePlugin } from "./example";
import { marketingPlugin } from "./marketing";
import { externalResearchJob } from "@/modules/marketing/external-research-job";

const marketingPluginWithServerlessJobs = definePlugin({
  ...marketingPlugin,
  jobDefinitions: [
    ...(marketingPlugin.jobDefinitions ?? []),
    externalResearchJob,
  ],
});

export const builtInPluginRegistry = createPluginRegistry([
  examplePlugin,
  marketingPluginWithServerlessJobs,
]);

/** Server-only provider composition is loaded only at authorized data boundaries. */
export async function getWorkspaceAttention(
  organizationId: string,
  now: string,
) {
  const { workspacePluginAttention } = await import("./attention");
  return workspacePluginAttention(organizationId, now);
}
export async function getEntityProvenance(input: unknown) {
  return (await import("./entity-provenance")).readEntityProvenance(input);
}
export async function getBoardEntityRegistry() {
  return (await import("./board-entities")).boardEntityRegistry;
}

/** Shared canonical authority for external references, without Board execution. */
export async function getIntegrationEntityRegistry() {
  return (await import("./board-entities")).boardEntityRegistry;
}

export function getApplicationNavigation(
  enabledPluginIds: Iterable<string>,
): NavigationGroup[] {
  const pluginItems = builtInPluginRegistry
    .getNavigation(enabledPluginIds)
    .filter(
      (item) =>
        item.route === `/apps/${item.pluginId}` &&
        builtInPluginRegistry.get(item.pluginId)?.manifest.category !==
          "development",
    )
    .map((item) => ({
      href: item.route,
      icon: item.icon,
      label: builtInPluginRegistry.get(item.pluginId)!.manifest.name,
    }));
  return [
    {
      ...coreNavigationGroups[0]!,
      items: [...coreNavigationGroups[0]!.items, ...pluginItems],
    },
    ...coreNavigationGroups.slice(1),
  ];
}
