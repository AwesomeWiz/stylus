import type {
  KnowledgeMemoryRow,
  MemoryDomain,
  MemoryKind,
  MemoryProvenance,
} from "@/lib/supabase/database.types";

export const MEMORY_RESULT_LIMIT = 50;
export const AI_MEMORY_RESULT_LIMIT = 20;

export interface MemoryRetrievalRequest {
  domains: readonly MemoryDomain[];
  includeArchived?: boolean;
  kinds?: readonly MemoryKind[];
  limit?: number;
  provenance?: readonly MemoryProvenance[];
  search?: string;
}

export function normalizeMemoryRetrievalRequest(
  input: MemoryRetrievalRequest,
  maximum = MEMORY_RESULT_LIMIT,
) {
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 25), 1), maximum);
  return {
    domains: [...new Set(input.domains)],
    includeArchived: input.includeArchived ?? false,
    kinds: input.kinds ? [...new Set(input.kinds)] : undefined,
    limit,
    provenance: input.provenance ? [...new Set(input.provenance)] : undefined,
    search: input.search?.trim().slice(0, 100) || undefined,
  };
}

export function orderAndBoundMemories(
  memories: readonly KnowledgeMemoryRow[],
  request: MemoryRetrievalRequest,
) {
  const normalized = normalizeMemoryRetrievalRequest(request);
  const domains = new Set(normalized.domains);
  const kinds = normalized.kinds ? new Set(normalized.kinds) : null;
  const provenance = normalized.provenance
    ? new Set(normalized.provenance)
    : null;
  const search = normalized.search?.toLocaleLowerCase("en-US");
  return memories
    .filter(
      (memory) =>
        domains.has(memory.domain) &&
        (normalized.includeArchived || memory.archived_at === null) &&
        (!kinds || kinds.has(memory.kind)) &&
        (!provenance || provenance.has(memory.provenance)) &&
        (!search ||
          `${memory.title}\n${memory.content}`
            .toLocaleLowerCase("en-US")
            .includes(search)),
    )
    .sort(
      (left, right) =>
        right.updated_at.localeCompare(left.updated_at) ||
        right.id.localeCompare(left.id),
    )
    .slice(0, normalized.limit);
}
