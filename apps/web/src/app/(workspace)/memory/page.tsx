import type { Route } from "next";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getWorkspaceRouteDecision } from "@/modules/onboarding/routing";
import { MemoryWorkspace } from "@/components/memory/memory-workspace";
import { canMutateCompanyMemory } from "@/modules/memory/authorization";
import { composeCompanyKnowledge } from "@/modules/memory/company-knowledge";
import { memoryFilterSchema } from "@/modules/memory/schemas";
import { getCompanyMemories } from "@/modules/memory/server/data";
import { getOnboardingData } from "@/modules/onboarding/server/data";

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
  // This page consumes the full profile; reuse its progress instead of making
  // an additional narrow setup query.
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
  const memories = await getCompanyMemories(context.organization.id, filters);
  const companyKnowledge = composeCompanyKnowledge({
    audience: onboarding.audience,
    brand: onboarding.brand,
    company: onboarding.company,
    competitors: onboarding.competitors,
    marketing: onboarding.marketing,
    organizationId: context.organization.id,
  });
  return (
    <MemoryWorkspace
      canMutate={canMutateCompanyMemory(context.membership.role)}
      companyKnowledge={companyKnowledge}
      filters={filters}
      memories={memories}
    />
  );
}
