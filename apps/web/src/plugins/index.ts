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
