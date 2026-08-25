import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { WhiteboardWorkspace } from "@/components/whiteboards/whiteboard-workspace";
import { logoutAction } from "@/modules/auth/actions";
import { getNotificationSummary } from "@/modules/notifications/server/data";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getOnboardingData } from "@/modules/onboarding/server/data";
import { getWorkspaceRouteDecision } from "@/modules/onboarding/routing";
import { canMutateWhiteboards } from "@/modules/whiteboards/authorization";
import { boardIdSchema } from "@/modules/whiteboards/schemas";
import { getBoardEditorData } from "@/modules/whiteboards/server/data";

export default async function WhiteboardEditorPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/organization/new");
  const onboarding = await getOnboardingData(context.organization.id);
  const decision = getWorkspaceRouteDecision({
    completedAt: onboarding.progress?.completed_at ?? null,
    currentStep: onboarding.progress?.current_step ?? 1,
    role: context.membership.role,
  });
  if (decision) redirect(decision as Route);
  const parsedId = boardIdSchema.safeParse((await params).boardId);
  if (!parsedId.success) notFound();
  const [workspace, notifications] = await Promise.all([
    getBoardEditorData(context.organization.id, parsedId.data),
    getNotificationSummary(context.organization.id, context.user.id),
  ]);
  if (!workspace) notFound();
  return (
    <AppShell
      activePath="/whiteboards"
      identity={{
        displayName: context.user.displayName,
        email: context.user.email,
      }}
      logoutAction={logoutAction}
      mainClassName="max-w-none p-0 sm:p-0 lg:p-0"
      notifications={notifications}
      organization={{
        name: context.organization.name,
        role: context.membership.role,
      }}
    >
      <WhiteboardWorkspace
        {...workspace}
        canMutate={canMutateWhiteboards(context.membership.role)}
        currentUser={{
          displayName: context.user.displayName,
          id: context.user.id,
        }}
      />
    </AppShell>
  );
}
