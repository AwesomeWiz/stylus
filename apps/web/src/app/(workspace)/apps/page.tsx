import { getWorkspaceContext } from "@/modules/onboarding/server/workspace";
import { AppsManagement } from "@/components/plugins/apps-management";
import { PageHeader } from "@/components/ui/page-header";
import { getOrganizationPluginStates } from "@/modules/plugins/server/data";
import { builtInPluginRegistry } from "@/plugins";

export default async function AppsPage() {
  const context = await getWorkspaceContext();

  const states = await getOrganizationPluginStates(context.organization.id);
  const stateById = new Map(states.map((state) => [state.plugin_id, state]));
  return (
    <>
      <PageHeader
        description="Control the trusted business modules available to this organization."
        title="Apps"
      />
      <AppsManagement
        currentRole={context.membership.role}
        plugins={builtInPluginRegistry.list().map(({ manifest }) => ({
          enabled: stateById.get(manifest.id)?.enabled ?? false,
          manifest,
        }))}
      />
      <p className="text-muted-foreground mt-5 max-w-3xl text-sm">
        Disabling an app removes access and navigation without deleting its data
        or historical activity. Credentials are never stored in app metadata.
      </p>
    </>
  );
}
