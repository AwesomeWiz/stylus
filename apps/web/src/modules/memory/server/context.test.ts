import { describe, expect, it, vi } from "vitest";

import type { AIExecutionContext } from "@/core/ai/public";

import { MemoryAccessDeniedError } from "../authorization";
import { buildAIKnowledgeContext } from "./context";

const context: AIExecutionContext = {
  actorId: "00000000-0000-4000-8000-000000000001",
  capability: "core.knowledge.preview",
  memoryDomains: [],
  organizationId: "10000000-0000-4000-8000-000000000001",
  pluginId: null,
  runId: "20000000-0000-4000-8000-000000000001",
};

function dependencies() {
  return {
    getCompanyKnowledge: vi.fn(async (organizationId: string) => ({
      incompleteSections: [],
      organizationId,
      sections: {},
      source: "canonical_company_profile" as const,
    })) as never,
    getEnabledPluginIds: vi.fn(async () => ["example"]),
    isActiveMember: vi.fn(async () => true),
    retrieveMemories: vi.fn(async () => []),
  };
}

describe("AI knowledge context boundary", () => {
  it("binds retrieval to the trusted execution organization and hard limit", async () => {
    const deps = dependencies();
    const result = await buildAIKnowledgeContext(
      context,
      { domains: ["company"], limit: 1000 },
      deps,
    );
    expect(result.domains).toEqual(["company"]);
    expect(deps.retrieveMemories).toHaveBeenCalledWith({
      domains: ["company"],
      limit: 20,
      organizationId: context.organizationId,
      search: undefined,
    });
    expect(deps.getCompanyKnowledge).toHaveBeenCalledWith(
      context.organizationId,
    );
  });

  it("does not automatically inject Company Knowledge or memory", async () => {
    const deps = dependencies();
    const result = await buildAIKnowledgeContext(
      context,
      { domains: [] },
      deps,
    );
    expect(result).toEqual({ company: null, domains: [], memories: [] });
    expect(deps.getCompanyKnowledge).not.toHaveBeenCalled();
  });

  it("denies removed members before any retrieval", async () => {
    const deps = dependencies();
    deps.isActiveMember.mockResolvedValue(false);
    await expect(
      buildAIKnowledgeContext(context, { domains: ["company"] }, deps),
    ).rejects.toBeInstanceOf(MemoryAccessDeniedError);
    expect(deps.retrieveMemories).not.toHaveBeenCalled();
  });

  it("denies disabled plugins and undeclared plugin domains", async () => {
    const deps = dependencies();
    deps.getEnabledPluginIds.mockResolvedValue([]);
    const pluginContext = {
      ...context,
      capability: "example.hello",
      pluginId: "example",
    };
    await expect(
      buildAIKnowledgeContext(pluginContext, { domains: [] }, deps),
    ).rejects.toBeInstanceOf(MemoryAccessDeniedError);
    deps.getEnabledPluginIds.mockResolvedValue(["example"]);
    await expect(
      buildAIKnowledgeContext(pluginContext, { domains: ["company"] }, deps),
    ).rejects.toBeInstanceOf(MemoryAccessDeniedError);
  });

  it("denies capabilities not declared by the trusted static plugin", async () => {
    const deps = dependencies();
    await expect(
      buildAIKnowledgeContext(
        {
          ...context,
          capability: "example.not-declared",
          pluginId: "example",
        },
        { domains: [] },
        deps,
      ),
    ).rejects.toBeInstanceOf(MemoryAccessDeniedError);
  });
});
