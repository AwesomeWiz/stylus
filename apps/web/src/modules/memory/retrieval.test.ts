import { describe, expect, it } from "vitest";

import type { KnowledgeMemoryRow } from "@/lib/supabase/database.types";

import {
  MEMORY_RESULT_LIMIT,
  normalizeMemoryRetrievalRequest,
  orderAndBoundMemories,
} from "./retrieval";

function memory(
  id: string,
  updatedAt: string,
  overrides: Partial<KnowledgeMemoryRow> = {},
): KnowledgeMemoryRow {
  return {
    archived_at: null,
    archived_by: null,
    content: `Content ${id}`,
    created_at: updatedAt,
    created_by: "00000000-0000-4000-8000-000000000001",
    domain: "company",
    effective_at: null,
    id,
    kind: "FACT",
    metadata: {},
    organization_id: "10000000-0000-4000-8000-000000000001",
    plugin_id: null,
    provenance: "HUMAN",
    search_vector: "",
    source_reference: null,
    title: `Memory ${id}`,
    updated_at: updatedAt,
    updated_by: "00000000-0000-4000-8000-000000000001",
    ...overrides,
  };
}

describe("bounded memory retrieval", () => {
  it("applies a hard maximum and bounded search input", () => {
    const normalized = normalizeMemoryRetrievalRequest({
      domains: ["company", "company"],
      limit: 50_000,
      search: `  ${"a".repeat(200)}  `,
    });
    expect(normalized.domains).toEqual(["company"]);
    expect(normalized.limit).toBe(MEMORY_RESULT_LIMIT);
    expect(normalized.search).toHaveLength(100);
  });

  it("excludes archived rows by default and orders deterministically", () => {
    const memories = [
      memory("00000000-0000-4000-8000-000000000001", "2026-08-25T10:00:00Z"),
      memory("00000000-0000-4000-8000-000000000003", "2026-08-25T11:00:00Z", {
        archived_at: "2026-08-25T12:00:00Z",
      }),
      memory("00000000-0000-4000-8000-000000000002", "2026-08-25T11:00:00Z"),
    ];
    expect(
      orderAndBoundMemories(memories, { domains: ["company"], limit: 2 }).map(
        ({ id }) => id,
      ),
    ).toEqual([
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000001",
    ]);
  });

  it("filters domain, kind, provenance and text without invoking AI", () => {
    const memories = [
      memory("00000000-0000-4000-8000-000000000001", "2026-08-25T10:00:00Z", {
        content: "Customers value an offline workflow.",
        kind: "INSIGHT",
      }),
      memory("00000000-0000-4000-8000-000000000002", "2026-08-25T11:00:00Z", {
        domain: "agency",
        kind: "INSIGHT",
        provenance: "PLUGIN",
        plugin_id: "web-agency",
      }),
    ];
    expect(
      orderAndBoundMemories(memories, {
        domains: ["company"],
        kinds: ["INSIGHT"],
        provenance: ["HUMAN"],
        search: "offline",
      }).map(({ id }) => id),
    ).toEqual(["00000000-0000-4000-8000-000000000001"]);
  });
});
