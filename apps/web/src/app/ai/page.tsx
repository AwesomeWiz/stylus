import type { Route } from "next";
import { redirect } from "next/navigation";

import { AIManagement } from "@/components/ai/ai-management";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { getConfiguredAIProviderIds } from "@/modules/ai/server/configured";
import {
  getOrganizationAIPolicy,
  getOrganizationAIRuns,
} from "@/modules/ai/server/data";
import { logoutAction } from "@/modules/auth/actions";
import { getNotificationSummary } from "@/modules/notifications/server/data";
import { getOnboardingData } from "@/modules/onboarding/server/data";
import { getWorkspaceRouteDecision } from "@/modules/onboarding/routing";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

export default async function AIPage() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/organization/new");
  const onboarding = await getOnboardingData(context.organization.id);
  const decision = getWorkspaceRouteDecision({
    completedAt: onboarding.progress?.completed_at ?? null,
    currentStep: onboarding.progress?.current_step ?? 1,
    role: context.membership.role,
  });
  if (decision) redirect(decision as Route);
  const [policy, runs, notifications] = await Promise.all([
    getOrganizationAIPolicy(context.organization.id),
    getOrganizationAIRuns(context.organization.id),
    getNotificationSummary(context.organization.id, context.user.id),
  ]);
  return (
    <AppShell
      activePath="/ai"
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
        description="Set organization AI boundaries and inspect safe execution metadata. Core work remains available when AI is disabled or offline."
        title="AI"
      />
      <AIManagement
        configuredProviderIds={getConfiguredAIProviderIds()}
        currentRole={context.membership.role}
        policy={policy}
        runs={runs}
      />
    </AppShell>
  );
}
