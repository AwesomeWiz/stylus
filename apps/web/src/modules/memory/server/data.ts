import "server-only";

import type {
  KnowledgeMemoryRow,
  MemoryDomain,
} from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOnboardingData } from "@/modules/onboarding/server/data";

import {
  composeCompanyKnowledge,
  type CompanyKnowledge,
} from "../company-knowledge";
import type { MemoryFilters } from "../schemas";

const memoryColumns =
  "archived_at, archived_by, content, created_at, created_by, domain, effective_at, id, kind, metadata, organization_id, plugin_id, provenance, search_vector, source_reference, title, updated_at, updated_by";

export async function getCompanyKnowledge(
  organizationId: string,
): Promise<CompanyKnowledge> {
  const onboarding = await getOnboardingData(organizationId);
  return composeCompanyKnowledge({
    audience: onboarding.audience,
    brand: onboarding.brand,
    company: onboarding.company,
    competitors: onboarding.competitors,
    marketing: onboarding.marketing,
    organizationId,
  });
}

export async function getCompanyMemories(
  organizationId: string,
  filters: MemoryFilters,
) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("search_company_memories", {
    p_include_archived: filters.archived,
    p_kinds: filters.kind ? [filters.kind] : null,
    p_limit: 50,
    p_organization_id: organizationId,
    p_provenance: filters.provenance ? [filters.provenance] : null,
    p_search: filters.search || null,
  });
  if (error) throw new Error("Company memory could not be loaded.");
  return data ?? [];
}

export async function retrieveMemoriesForContext(input: {
  domains: readonly MemoryDomain[];
  limit: number;
  organizationId: string;
  search?: string;
}): Promise<KnowledgeMemoryRow[]> {
  if (!input.domains.length) return [];
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("knowledge_memories")
    .select(memoryColumns)
    .eq("organization_id", input.organizationId)
    .in("domain", [...input.domains])
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(input.limit);
  if (input.search)
    query = query.textSearch("search_vector", input.search, {
      config: "simple",
      type: "websearch",
    });
  const { data, error } = await query;
  if (error) throw new Error("Authorized memory context could not be loaded.");
  return (data ?? []) as KnowledgeMemoryRow[];
}
