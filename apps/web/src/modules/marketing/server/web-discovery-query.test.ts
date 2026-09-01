import { describe, expect, it } from "vitest";

import { buildWebDiscoveryQueries } from "./web-discovery-query";

describe("bounded web discovery query planning", () => {
  it("builds deterministic intent-aware queries from explicit concepts", () => {
    const input = {
      intent: "PURCHASE_OBJECTION" as const,
      queryTerms: ["inclusive sizing", "fit frustration", "inclusive sizing"],
      question: "Why do shoppers hesitate over clothing fit?",
    };
    const queries = buildWebDiscoveryQueries(input);
    expect(queries).toEqual(buildWebDiscoveryQueries(input));
    expect(queries).toEqual([
      "inclusive sizing purchase objections reviews",
      "fit frustration buying problems",
    ]);
    expect(queries).toHaveLength(2);
  });

  it("falls back to bounded meaningful question concepts", () => {
    expect(
      buildWebDiscoveryQueries({
        intent: "QUESTION_DEMAND",
        queryTerms: ["fashion"],
        question: "What questions recur about petite trouser alterations?",
      }),
    ).toEqual(["questions recur petite trouser alterations questions advice"]);
  });

  it("does not discover the open web from generic fashion-only input", () => {
    expect(
      buildWebDiscoveryQueries({
        intent: "TREND_SIGNAL",
        queryTerms: ["fashion", "clothing"],
        question: "What fashion trends show interest?",
      }),
    ).toEqual([]);
  });

  it("never exceeds three normalized query variants", () => {
    const queries = buildWebDiscoveryQueries({
      intent: "AUDIENCE_PAIN",
      queryTerms: ["petite fit", "plus size", "inseam", "returns", "tailoring"],
      question: "What clothing fit frustrations recur?",
    });
    expect(queries).toHaveLength(3);
    expect(queries.every((query) => query.length <= 120)).toBe(true);
  });
});
