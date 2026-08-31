import { describe, expect, it } from "vitest";

import {
  createFashionRelevanceProfile,
  isFashionResearchCandidateRelevant,
} from "./fashion-relevance";

const sustainableProfile = () =>
  createFashionRelevanceProfile({
    explicitTerms: ["sustainable fashion", "ethical fashion"],
    question: "What evidence suggests growing interest in sustainable fashion?",
  });

describe("deterministic fashion editorial relevance", () => {
  it.each([
    "Inside the French Riviera Holiday Home of the Late Fashion Icon Jacqueline de Ribes",
    "How Fashion Made The Fusty Silk Scarf Cool Again",
  ])("rejects hosted-QA unrelated Vogue metadata: %s", (candidate) => {
    expect(
      isFashionResearchCandidateRelevant(candidate, sustainableProfile()),
    ).toBe(false);
  });

  it("accepts narrow code-owned sustainability concepts without requiring an exact phrase", () => {
    expect(
      isFashionResearchCandidateRelevant(
        "Why circular fashion and clothing resale are growing",
        sustainableProfile(),
      ),
    ).toBe(true);
    expect(
      isFashionResearchCandidateRelevant(
        "Brands invest in sustainable clothing materials",
        sustainableProfile(),
      ),
    ).toBe(true);
  });

  it("does not allow generic fashion vocabulary to establish relevance", () => {
    expect(
      isFashionResearchCandidateRelevant(
        "Fashion style and clothing trends from Vogue",
        sustainableProfile(),
      ),
    ).toBe(false);
  });

  it("gives meaningful explicit terms precedence over question vocabulary", () => {
    const profile = createFashionRelevanceProfile({
      explicitTerms: ["sustainable fashion"],
      question: "Are silk scarves a growing sustainable fashion interest?",
    });
    expect(
      isFashionResearchCandidateRelevant(
        "Silk scarves are fashionable again",
        profile,
      ),
    ).toBe(false);
  });

  it("falls back to meaningful question concepts when explicit terms are only generic", () => {
    const profile = createFashionRelevanceProfile({
      explicitTerms: ["fashion"],
      question: "What frustrations exist around inconsistent sizing?",
    });
    expect(
      isFashionResearchCandidateRelevant(
        "Brands respond to clothing size inconsistency",
        profile,
      ),
    ).toBe(true);
  });
});
