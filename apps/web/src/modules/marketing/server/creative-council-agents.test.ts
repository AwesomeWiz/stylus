import { describe, expect, it } from "vitest";

import {
  creativeCouncilAgents,
  registeredCreativeCouncilSpecialists,
  registeredTask016Specialists,
  strategicReviewAgents,
} from "./creative-council-agents";

describe("Creative Council specialist registry", () => {
  it("registers every TASK-016 specialist with stable unique IDs", () => {
    expect(
      registeredTask016Specialists.map(({ displayName, id }) => ({
        displayName,
        id,
      })),
    ).toEqual([
      {
        displayName: "Audience Researcher",
        id: "marketing.audience-researcher",
      },
      { displayName: "Trend Researcher", id: "marketing.trend-researcher" },
      {
        displayName: "Competitor Analyst",
        id: "marketing.competitor-analyst",
      },
      {
        displayName: "Content Strategist",
        id: "marketing.content-strategist",
      },
      {
        displayName: "Retention Editor",
        id: "marketing.retention-editor",
      },
      { displayName: "Visual Director", id: "marketing.visual-director" },
      { displayName: "Brand Director", id: "marketing.brand-director" },
      { displayName: "Creative Judge", id: "marketing.creative-judge" },
      {
        displayName: "Challenge Reviewer",
        id: "marketing.challenge-reviewer",
      },
    ]);
    const ids = registeredCreativeCouncilSpecialists.map((agent) => agent.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps every definition static, schema-bounded, tool-free, and provider-neutral", () => {
    for (const agent of registeredCreativeCouncilSpecialists) {
      expect(agent.inputSchema.safeParse(undefined)).toHaveProperty("success");
      expect(agent.schema.safeParse(undefined)).toHaveProperty("success");
      expect(agent.tools).toEqual([]);
      expect(agent.allowedMemoryDomains).toEqual([]);
      expect(["fast", "balanced", "reasoning"]).toContain(agent.tier);
      expect(agent).not.toHaveProperty("modelId");
      expect(agent).not.toHaveProperty("providerId");
      expect(agent).not.toHaveProperty("providerUrl");
      expect(agent.failureSemantics).toBe("STOP_WORKFLOW");
    }
  });

  it("uses only the approved five specialists in strategic-review-v1", () => {
    const invoked = Object.values(strategicReviewAgents).map(
      (agent) => agent.id,
    );
    expect(invoked).toEqual([
      "marketing.audience-researcher",
      "marketing.brand-director",
      "marketing.challenge-reviewer",
      "marketing.creative-judge",
      "marketing.content-strategist",
    ]);
    for (const id of [
      "marketing.trend-researcher",
      "marketing.competitor-analyst",
      "marketing.retention-editor",
      "marketing.visual-director",
    ]) {
      expect(invoked).not.toContain(id);
    }
  });

  it("preserves TASK-015 identities, tiers, and 90-second timeouts", () => {
    expect(
      [
        creativeCouncilAgents.HOOK,
        creativeCouncilAgents.SCRIPT,
        creativeCouncilAgents.CRITIQUE,
      ].map((agent) => [agent.id, agent.tier, agent.timeoutMs]),
    ).toEqual([
      ["marketing.hook-strategist", "balanced", 90_000],
      ["marketing.script-writer", "balanced", 90_000],
      ["marketing.creative-critic", "reasoning", 90_000],
    ]);
  });

  it("prevents Trend and Competitor specialists from claiming independent access", () => {
    const trend = registeredTask016Specialists.find(
      (agent) => agent.id === "marketing.trend-researcher",
    );
    const competitor = registeredTask016Specialists.find(
      (agent) => agent.id === "marketing.competitor-analyst",
    );
    expect(trend?.systemInstruction).toMatch(/explicitly supplied/i);
    expect(trend?.systemInstruction).toMatch(/never claim.*searched/i);
    expect(competitor?.systemInstruction).toMatch(/explicitly authorized/i);
    expect(competitor?.systemInstruction).toMatch(/never fetch/i);
  });
});
