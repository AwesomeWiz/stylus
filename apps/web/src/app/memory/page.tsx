import type { Route } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { MemoryWorkspace } from "@/components/memory/memory-workspace";
import { logoutAction } from "@/modules/auth/actions";
import { canMutateCompanyMemory } from "@/modules/memory/authorization";
import { composeCompanyKnowledge } from "@/modules/memory/company-knowledge";
import { memoryFilterSchema } from "@/modules/memory/schemas";
import { getCompanyMemories } from "@/modules/memory/server/data";
import { getNotificationSummary } from "@/modules/notifications/server/data";
import { getOnboardingData } from "@/modules/onboarding/server/data";
import { getWorkspaceRouteDecision } from "@/modules/onboarding/routing";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MemoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
  const raw = await searchParams;
  const parsedFilters = memoryFilterSchema.safeParse({
    archived: first(raw.archived) ?? "false",
    kind: first(raw.kind) || undefined,
    provenance: first(raw.provenance) || undefined,
    search: first(raw.search) ?? "",
  });
  const filters = parsedFilters.success
    ? parsedFilters.data
    : memoryFilterSchema.parse({});
  const [memories, notifications] = await Promise.all([
    getCompanyMemories(context.organization.id, filters),
    getNotificationSummary(context.organization.id, context.user.id),
  ]);
  const companyKnowledge = composeCompanyKnowledge({
    audience: onboarding.audience,
    brand: onboarding.brand,
    company: onboarding.company,
    competitors: onboarding.competitors,
    marketing: onboarding.marketing,
    organizationId: context.organization.id,
  });
  return (
    <AppShell
      activePath="/memory"
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
      <MemoryWorkspace
        canMutate={canMutateCompanyMemory(context.membership.role)}
        companyKnowledge={companyKnowledge}
        filters={filters}
        memories={memories}
      />
    </AppShell>
  );
}
