import { describe, expect, it } from "vitest";
import {
  campaignSchema,
  competitorSchema,
  reelIdeaSchema,
  researchSchema,
} from "./schemas";

describe("Marketing forms", () => {
  it("accepts a minimal fast-capture Reel idea", () => {
    expect(
      reelIdeaSchema.parse({
        recordId: "",
        title: "Why websites fail",
        hook: "Five seconds",
        concept: "",
        contentAngle: "",
        callToAction: "",
        notes: "",
        status: "IDEA",
        campaignId: "",
      }),
    ).toMatchObject({ title: "Why websites fail", campaignId: null });
  });
  it("rejects unsafe URLs without fetching them", () => {
    expect(() =>
      researchSchema.parse({
        recordId: "",
        title: "Note",
        content: "Manual",
        sourceLabel: "",
        sourceUrl: "javascript:alert(1)",
        category: "OTHER",
      }),
    ).toThrow();
    expect(() =>
      competitorSchema.parse({
        recordId: "",
        name: "Acme",
        websiteUrl: "not-a-url",
        instagramHandle: "",
        instagramProfileUrl: "",
        notes: "",
        coreCompetitorId: "",
      }),
    ).toThrow();
  });
  it("rejects campaign end dates before start dates", () => {
    expect(() =>
      campaignSchema.parse({
        recordId: "",
        name: "Launch",
        objective: "Grow",
        notes: "",
        startsOn: "2026-09-02",
        endsOn: "2026-09-01",
        status: "PLANNING",
      }),
    ).toThrow("End date cannot precede start date");
  });
});
