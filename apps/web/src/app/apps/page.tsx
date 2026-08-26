import type { Route } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { AppsManagement } from "@/components/plugins/apps-management";
import { PageHeader } from "@/components/ui/page-header";
import { logoutAction } from "@/modules/auth/actions";
import { getNotificationSummary } from "@/modules/notifications/server/data";
import { getOnboardingData } from "@/modules/onboarding/server/data";
import { getWorkspaceRouteDecision } from "@/modules/onboarding/routing";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getOrganizationPluginStates } from "@/modules/plugins/server/data";
import { builtInPluginRegistry } from "@/plugins";

export default async function AppsPage() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/organization/new");
  const onboarding = await getOnboardingData(context.organization.id);
  const decision = getWorkspaceRouteDecision({
    completedAt: onboarding.progress?.completed_at ?? null,
    currentStep: onboarding.progress?.current_step ?? 1,
    role: context.membership.role,
  });
  if (decision) redirect(decision as Route);
  const [states, notifications] = await Promise.all([
    getOrganizationPluginStates(context.organization.id),
    getNotificationSummary(context.organization.id, context.user.id),
  ]);
  const stateById = new Map(states.map((state) => [state.plugin_id, state]));
  return (
    <AppShell
      activePath="/apps"
      identity={{
        displayName: context.user.displayName,
        email: context.user.email,
      }}
      logoutAction={logoutAction}
      notifications={notifications}
      organization={{
        id: context.organization.id,
        name: context.organization.name,
        role: context.membership.role,
      }}
    >
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
    </AppShell>
  );
}
