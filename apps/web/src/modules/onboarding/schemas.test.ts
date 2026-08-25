import { describe, expect, it } from "vitest";

import {
  companyStepSchema,
  competitorsStepSchema,
  marketingStepSchema,
} from "./schemas";

describe("onboarding validation", () => {
  it("requires useful company identity context without requiring a website", () => {
    expect(
      companyStepSchema.safeParse({
        companyName: "A",
        industry: "",
        instagram: "",
        primaryMarket: "",
        shortDescription: "short",
        stage: "PRE_PRODUCT",
        website: "",
      }).success,
    ).toBe(false);
    expect(
      companyStepSchema.safeParse({
        companyName: "Acme",
        industry: "Software",
        instagram: "",
        primaryMarket: "",
        shortDescription: "A clear product concept for small teams.",
        stage: "PRE_PRODUCT",
        website: "",
      }).success,
    ).toBe(true);
  });

  it("requires at least one marketing channel", () => {
    expect(
      marketingStepSchema.safeParse({
        contentFocus: [],
        desiredAudienceAction: "",
        marketingStage: "NOT_STARTED",
        notes: "",
        primaryChannels: [],
        primaryObjective: "AWARENESS",
        secondaryObjectives: [],
      }).success,
    ).toBe(false);
  });

  it("allows zero competitors and validates supplied competitor URLs", () => {
    expect(competitorsStepSchema.safeParse({ competitors: [] }).success).toBe(
      true,
    );
    expect(
      competitorsStepSchema.safeParse({
        competitors: [
          {
            instagram: "",
            name: "Example",
            relevance: "",
            shortDescription: "",
            type: "DIRECT",
            website: "not-a-url",
          },
        ],
      }).success,
    ).toBe(false);
  });
});
