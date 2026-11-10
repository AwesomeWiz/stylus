import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getWorkspaceRouteDecision } from "@/modules/onboarding/routing";
import { MemoryWorkspace } from "@/components/memory/memory-workspace";
import { canMutateCompanyMemory } from "@/modules/memory/authorization";
import { composeCompanyKnowledge } from "@/modules/memory/company-knowledge";
import { memoryFilterSchema } from "@/modules/memory/schemas";
import {
  getCompanyMemories,
  getCompanyMemory,
} from "@/modules/memory/server/data";
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
  const selected = first(raw.memory);
  const memories = selected
    ? await getCompanyMemory(context.organization.id, selected)
    : await getCompanyMemories(context.organization.id, filters);
  if (selected && !memories.length)
    return (
      <section className="max-w-[1200px] space-y-4">
        <h1 className="text-2xl font-semibold">Company Memory</h1>
        <p role="status" className="text-sm">
          This Memory is unavailable in the current organization.
        </p>
        <Link
          href="/memory"
          className="inline-block min-h-11 py-2 text-sm underline"
        >
          View all Company Memory
        </Link>
      </section>
    );
  const companyKnowledge = composeCompanyKnowledge({
    audience: onboarding.audience,
    brand: onboarding.brand,
    company: onboarding.company,
    competitors: onboarding.competitors,
    marketing: onboarding.marketing,
    organizationId: context.organization.id,
  });
  return (
    <>
      {selected ? (
        <nav
          aria-label="Selected Company Memory"
          className="mb-4 flex flex-wrap items-center gap-3 border-b pb-3 text-sm"
        >
          <span>
            Viewing selected Company Memory
            {memories[0]?.archived_at ? " · Archived" : ""}
          </span>
          <Link href="/memory" className="inline-block min-h-11 py-2 underline">
            View all Company Memory
          </Link>
        </nav>
      ) : null}
      <MemoryWorkspace
        canMutate={canMutateCompanyMemory(context.membership.role)}
        companyKnowledge={companyKnowledge}
        filters={filters}
        memories={memories}
      />
    </>
  );
}

export const metadata = { title: "Knowledge / Memory" };
