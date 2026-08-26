import "server-only";

import type { AIExecutionContext } from "@/core/ai/public";
import type { PluginMemoryDomain } from "@/core/plugins/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEnabledOrganizationPluginIds } from "@/modules/plugins/server/data";
import { builtInPluginRegistry } from "@/plugins";

import {
  authorizeRequestedMemoryDomains,
  MemoryAccessDeniedError,
} from "../authorization";
import {
  AI_MEMORY_RESULT_LIMIT,
  normalizeMemoryRetrievalRequest,
} from "../retrieval";
import { getCompanyKnowledge, retrieveMemoriesForContext } from "./data";

export interface AIKnowledgeContextRequest {
  domains: readonly PluginMemoryDomain[];
  limit?: number;
  search?: string;
}

interface AIKnowledgeContextDependencies {
  getCompanyKnowledge: typeof getCompanyKnowledge;
  getEnabledPluginIds(organizationId: string): Promise<string[]>;
  isActiveMember(input: {
    actorId: string;
    organizationId: string;
  }): Promise<boolean>;
  retrieveMemories: typeof retrieveMemoriesForContext;
}

const defaultDependencies: AIKnowledgeContextDependencies = {
  getCompanyKnowledge,
  getEnabledPluginIds: getEnabledOrganizationPluginIds,
  async isActiveMember({ actorId, organizationId }) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("user_id", actorId)
      .is("removed_at", null)
      .maybeSingle();
    return !error && Boolean(data);
  },
  retrieveMemories: retrieveMemoriesForContext,
};

export async function buildAIKnowledgeContext(
  context: AIExecutionContext,
  request: AIKnowledgeContextRequest,
  dependencies: AIKnowledgeContextDependencies = defaultDependencies,
) {
  if (
    !(await dependencies.isActiveMember({
      actorId: context.actorId,
      organizationId: context.organizationId,
    }))
  )
    throw new MemoryAccessDeniedError();

  const enabledPluginIds = await dependencies.getEnabledPluginIds(
    context.organizationId,
  );
  const plugin = context.pluginId
    ? builtInPluginRegistry.get(context.pluginId)
    : undefined;
  if (
    context.pluginId &&
    (!plugin || !plugin.manifest.capabilities.includes(context.capability))
  )
    throw new MemoryAccessDeniedError();
  const declaredDomains = plugin?.manifest.memoryDomains ?? [];
  if (
    context.pluginId &&
    (context.memoryDomains.length !== declaredDomains.length ||
      context.memoryDomains.some((domain) => !declaredDomains.includes(domain)))
  )
    throw new MemoryAccessDeniedError();
  const domains = authorizeRequestedMemoryDomains({
    capability: context.capability,
    declaredDomains,
    enabled:
      context.pluginId === null || enabledPluginIds.includes(context.pluginId),
    pluginId: context.pluginId,
    requestedDomains: request.domains,
  });
  const normalized = normalizeMemoryRetrievalRequest(
    {
      domains,
      limit: request.limit,
      search: request.search,
    },
    AI_MEMORY_RESULT_LIMIT,
  );
  const [company, memories] = await Promise.all([
    domains.includes("company")
      ? dependencies.getCompanyKnowledge(context.organizationId)
      : Promise.resolve(null),
    dependencies.retrieveMemories({
      domains,
      limit: normalized.limit,
      organizationId: context.organizationId,
      search: normalized.search,
    }),
  ]);
  return {
    company,
    domains,
    memories,
  };
}
