import { describe, expect, it } from "vitest";

import { marketingResearchIntents } from "../external-research";
import {
  assertFashionResearchPlan,
  planFashionResearch,
} from "./fashion-research-planner";

describe("deterministic fashion research source planner", () => {
  it.each(marketingResearchIntents)(
    "produces a deterministic plan for %s",
    (intent) => {
      const input = {
        hackerNewsStream: intent === "FASHION_TECH" ? ("ask" as const) : null,
        intent,
        queryTerms: ["clothing sizing", "fit"],
      };
      expect(planFashionResearch(input)).toEqual(planFashionResearch(input));
    },
  );

  it.each(
    marketingResearchIntents.filter((intent) => intent !== "FASHION_TECH"),
  )("omits Hacker News from ordinary %s research", (intent) => {
    const plan = planFashionResearch({
      hackerNewsStream: null,
      intent,
      queryTerms: ["fashion"],
    });
    expect(plan.selectedSourceFamilies).not.toContain("HACKER_NEWS");
    expect(plan.hackerNews).toBeNull();
  });

  it("selects HN, editorial, Reddit, and bounded web for fashion technology", () => {
    const plan = planFashionResearch({
      hackerNewsStream: "new",
      intent: "FASHION_TECH",
      queryTerms: ["AI fashion", "shopping tools", "extra"],
    });
    expect(plan.selectedSourceFamilies).toEqual([
      "HACKER_NEWS",
      "EDITORIAL",
      "REDDIT",
      "WEB",
    ]);
    expect(plan.hackerNews).toEqual({ stream: "new" });
    expect(plan.reddit.communityIds.length).toBeLessThanOrEqual(2);
    expect(plan.reddit.queryVariants).toEqual(["AI fashion", "shopping tools"]);
    expect(plan.web.queryVariants).toHaveLength(3);
  });

  it.each([
    "TREND_SIGNAL",
    "AUDIENCE_LANGUAGE",
    "QUESTION_DEMAND",
    "PURCHASE_OBJECTION",
    "COMPETITOR_SIGNAL",
  ] as const)("selects bounded social research for %s", (intent) => {
    const plan = planFashionResearch({
      enabledYouTubeChannelIds:
        intent === "COMPETITOR_SIGNAL" ? ["UC1234567890123456789012"] : [],
      hackerNewsStream: null,
      intent,
      queryTerms: ["sizing"],
    });
    expect(plan.selectedSourceFamilies).toContain("SOCIAL");
    expect(plan.social.selectedPlatforms).toEqual(["YOUTUBE"]);
    expect(plan.social.youtubeChannelIds).toEqual(
      intent === "COMPETITOR_SIGNAL" ? ["UC1234567890123456789012"] : [],
    );
  });

  it("does not fan social platforms into fashion technology research", () => {
    const plan = planFashionResearch({
      hackerNewsStream: "new",
      intent: "FASHION_TECH",
      queryTerms: ["wearable technology"],
    });
    expect(plan.selectedSourceFamilies).not.toContain("SOCIAL");
    expect(plan.social.selectedPlatforms).toEqual([]);
    expect(plan.selectedSourceFamilies).toContain("WEB");
  });

  it.each([
    "AUDIENCE_PAIN",
    "AUDIENCE_LANGUAGE",
    "PURCHASE_OBJECTION",
    "QUESTION_DEMAND",
    "COMPETITOR_SIGNAL",
    "FASHION_TECH",
  ] as const)("adds bounded deterministic web discovery for %s", (intent) => {
    const plan = planFashionResearch({
      hackerNewsStream: intent === "FASHION_TECH" ? "new" : null,
      intent,
      queryTerms: ["inclusive sizing", "fit frustration"],
      question: "What inclusive sizing and fit frustrations recur?",
    });
    expect(plan.selectedSourceFamilies).toContain("WEB");
    expect(plan.web.queryVariants.length).toBeGreaterThan(0);
    expect(plan.web.queryVariants.length).toBeLessThanOrEqual(3);
    expect(plan.reasonCodes).toContain("BOUNDED_WEB_DISCOVERY_SOURCE");
  });

  it.each([
    "AUDIENCE_DESIRE",
    "BELIEF_OR_MISCONCEPTION",
    "CONTROVERSY_OR_DEBATE",
    "TREND_SIGNAL",
  ] as const)("does not add open-web discovery for %s", (intent) => {
    const plan = planFashionResearch({
      hackerNewsStream: null,
      intent,
      queryTerms: ["sustainable materials"],
      question: "What sustainable material evidence is available?",
    });
    expect(plan.selectedSourceFamilies).not.toContain("WEB");
    expect(plan.web.queryVariants).toEqual([]);
  });

  it("omits WEB when generic-only inputs cannot produce a meaningful query", () => {
    const plan = planFashionResearch({
      hackerNewsStream: null,
      intent: "AUDIENCE_PAIN",
      queryTerms: ["fashion", "clothing"],
      question: "What fashion trends show interest?",
    });
    expect(plan.selectedSourceFamilies).not.toContain("WEB");
    expect(plan.web.queryVariants).toEqual([]);
  });

  it("rejects persisted source selections that differ from server planning", () => {
    const plan = planFashionResearch({
      hackerNewsStream: null,
      intent: "AUDIENCE_PAIN",
      queryTerms: ["sizing"],
    });
    expect(() =>
      assertFashionResearchPlan(
        { ...plan, selectedSourceFamilies: ["HACKER_NEWS"] },
        { intent: "AUDIENCE_PAIN", queryTerms: ["sizing"] },
      ),
    ).toThrow("source plan is invalid");
  });

  it("performs no model or provider selection during planning", () => {
    const source = planFashionResearch.toString();
    expect(source).not.toMatch(/ModelGateway|generateAI|fetch\(/);
  });
});
