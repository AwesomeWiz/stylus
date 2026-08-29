import { createPluginRegistry, definePlugin } from "@/core/plugins/public";
import { getPluginIcon } from "@/core/plugins/icons";
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
    .map((item) => ({
      href: item.route,
      icon: getPluginIcon(item.icon),
      label: item.label,
    }));
  return pluginItems.length
    ? [
        ...coreNavigationGroups.slice(0, 1),
        { items: pluginItems, label: "Apps" },
        ...coreNavigationGroups.slice(1),
      ]
    : coreNavigationGroups;
}
