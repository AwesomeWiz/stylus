import type { Route } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { BoardList } from "@/components/whiteboards/board-list";
import { logoutAction } from "@/modules/auth/actions";
import { getNotificationSummary } from "@/modules/notifications/server/data";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getOnboardingData } from "@/modules/onboarding/server/data";
import { getWorkspaceRouteDecision } from "@/modules/onboarding/routing";
import { canMutateWhiteboards } from "@/modules/whiteboards/authorization";
import { getBoards } from "@/modules/whiteboards/server/data";

export default async function WhiteboardsPage() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/organization/new");
  const onboarding = await getOnboardingData(context.organization.id);
  const decision = getWorkspaceRouteDecision({
    completedAt: onboarding.progress?.completed_at ?? null,
    currentStep: onboarding.progress?.current_step ?? 1,
    role: context.membership.role,
  });
  if (decision) redirect(decision as Route);
  const [boards, notifications] = await Promise.all([
    getBoards(context.organization.id),
    getNotificationSummary(context.organization.id, context.user.id),
  ]);
  return (
    <AppShell
      activePath="/whiteboards"
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
      <BoardList
        boards={boards}
        canMutate={canMutateWhiteboards(context.membership.role)}
        currentUserId={context.user.id}
      />
    </AppShell>
  );
}
