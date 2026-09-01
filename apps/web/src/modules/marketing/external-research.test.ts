import { z } from "zod";
import { describe, expect, it } from "vitest";

import {
  createFashionResearchSynthesisSchema,
  externalResearchLimits,
  externalResearchRequestSchema,
  externalResearchSubmissionSchema,
  fashionResearchSynthesisLimits,
  projectExternalResearchEvidence,
  validateFashionEvidenceReferences,
  validateSocialEvidenceClaims,
} from "./external-research";
import {
  deduplicateResearchItems,
  normalizedContentHash,
  RequestConcurrencyGate,
  type NormalizedResearchItem,
} from "./server/research-sources";

describe("fashion external research contracts", () => {
  it("accepts a bounded intent submission and rejects HN outside fashion tech", () => {
    expect(
      externalResearchSubmissionSchema.parse({
        hackerNewsStream: null,
        intent: "AUDIENCE_PAIN",
        queryTerms: ["Sizing", "sizing"],
        question: "What sizing frustrations recur for fashion shoppers?",
      }).queryTerms,
    ).toEqual(["sizing"]);
    expect(() =>
      externalResearchSubmissionSchema.parse({
        hackerNewsStream: "top",
        intent: "AUDIENCE_PAIN",
        queryTerms: ["sizing"],
        question: "What sizing frustrations recur for fashion shoppers?",
      }),
    ).toThrow("Hacker News");
  });

  it("requires the persisted intent and deterministic plan intent to match", () => {
    expect(() =>
      externalResearchRequestSchema.parse({
        intent: "AUDIENCE_PAIN",
        plan: {
          editorial: { includeSearchDiscovery: false, sourceIds: [] },
          hackerNews: null,
          intent: "TREND_SIGNAL",
          reasonCodes: ["EDITORIAL_TREND_SOURCE"],
          reddit: { communityIds: [], queryVariants: [] },
          selectedSourceFamilies: ["EDITORIAL"],
          version: "marketing-fashion-source-plan-v1",
        },
        queryTerms: ["sizing"],
        question: "What sizing frustrations recur for fashion shoppers?",
      }),
    ).toThrow("must match");
  });

  it("constrains every marketing claim to the exact current EVID set", () => {
    const schema = createFashionResearchSynthesisSchema(["EVID-1", "EVID-2"]);
    expect(schema.safeParse(interpretation("EVID-2")).success).toBe(true);
    expect(schema.safeParse(interpretation("EVID-3")).success).toBe(false);
    expect(() =>
      validateFashionEvidenceReferences(interpretation("EVID-2"), ["EVID-1"]),
    ).toThrow("invalid evidence reference");
    expect(() =>
      createFashionResearchSynthesisSchema(["EVID-1", "EVID-1"]),
    ).toThrow("identifiers are invalid");
  });

  it("emits closed structured objects and an exact evidence enum", () => {
    const schema = createFashionResearchSynthesisSchema(["EVID-1", "EVID-2"]);
    const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
    const objectNodes: Array<Record<string, unknown>> = [];
    const visit = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      const record = node as Record<string, unknown>;
      if (record.type === "object") objectNodes.push(record);
      if (record.properties && typeof record.properties === "object")
        Object.values(record.properties).forEach(visit);
      visit(record.items);
    };
    visit(jsonSchema);
    expect(objectNodes.length).toBeGreaterThan(0);
    objectNodes.forEach((node) => {
      expect(node.additionalProperties).toBe(false);
      expect(node.required).toEqual(
        Object.keys(node.properties as Record<string, unknown>),
      );
    });
    const audience = (
      jsonSchema.properties as Record<
        string,
        { items: { properties: Record<string, unknown> } }
      >
    ).audienceSignals;
    const references = audience!.items.properties.evidenceRefs as {
      items: { enum: string[] };
    };
    expect(references.items.enum).toEqual(["EVID-1", "EVID-2"]);
  });

  it("prevents unsupported visual and competitor claims in the provider schema", () => {
    const base = interpretation("EVID-1");
    const schema = createFashionResearchSynthesisSchema(["EVID-1"], {
      competitor: false,
      visual: false,
    });

    expect(schema.safeParse(base).success).toBe(true);
    expect(
      schema.safeParse({
        ...base,
        competitorSignals: [
          {
            confidence: "MEDIUM",
            evidenceRefs: ["EVID-1"],
            statement: "A competitor repeats this pattern.",
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...base,
        visualPatterns: [
          {
            confidence: "MEDIUM",
            evidenceRefs: ["EVID-1"],
            pattern: "A visual treatment recurs.",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("keeps the worst legal fashion output comfortably bounded", () => {
    const reference = ["EVID-1", "EVID-2", "EVID-3"];
    const statement = "x".repeat(
      fashionResearchSynthesisLimits.statementCharacters,
    );
    const supported = {
      confidence: "MEDIUM",
      evidenceRefs: reference,
      statement,
    };
    const maximum = {
      audienceSignals: Array.from(
        { length: fashionResearchSynthesisLimits.audienceSignals },
        () => ({ ...supported, signalType: "PAIN" }),
      ),
      contentOpportunities: Array.from(
        { length: fashionResearchSynthesisLimits.contentOpportunities },
        () => ({
          audienceTension: statement,
          caveats: Array.from(
            { length: fashionResearchSynthesisLimits.caveats },
            () => "x".repeat(fashionResearchSynthesisLimits.caveatCharacters),
          ),
          confidence: "MEDIUM",
          evidenceRefs: reference,
          freshness: "x".repeat(
            fashionResearchSynthesisLimits.freshnessCharacters,
          ),
          opportunityType: "RELATABLE_PAIN",
          suggestedAngle: statement,
          title: "x".repeat(fashionResearchSynthesisLimits.titleCharacters),
          whyItMatters: statement,
        }),
      ),
      contentPatterns: Array.from(
        { length: fashionResearchSynthesisLimits.contentPatterns },
        () => ({
          confidence: "MEDIUM",
          evidenceRefs: reference,
          pattern: statement,
        }),
      ),
      competitorSignals: Array.from(
        { length: fashionResearchSynthesisLimits.competitorSignals },
        () => supported,
      ),
      debates: [{ evidenceRefs: reference, positionSummary: statement }],
      languageSignals: Array.from(
        { length: fashionResearchSynthesisLimits.languageSignals },
        () => ({
          evidenceRefs: reference,
          interpretation: statement,
          phraseOrPattern: "x".repeat(
            fashionResearchSynthesisLimits.phraseCharacters,
          ),
        }),
      ),
      limitations: Array.from(
        { length: fashionResearchSynthesisLimits.limitations },
        () => statement,
      ),
      objections: Array.from(
        { length: fashionResearchSynthesisLimits.objections },
        () => ({ evidenceRefs: reference, objection: statement }),
      ),
      summary: "x".repeat(fashionResearchSynthesisLimits.summaryCharacters),
      trendSignals: Array.from(
        { length: fashionResearchSynthesisLimits.trendSignals },
        () => supported,
      ),
      visualPatterns: Array.from(
        { length: fashionResearchSynthesisLimits.visualPatterns },
        () => ({
          confidence: "MEDIUM",
          evidenceRefs: reference,
          pattern: statement,
        }),
      ),
    };
    const schema = createFashionResearchSynthesisSchema(reference);
    expect(schema.safeParse(maximum).success).toBe(true);
    expect(JSON.stringify(maximum).length).toBeLessThan(10_000);
    expect(externalResearchLimits.modelOutputTokens).toBeGreaterThanOrEqual(
      3_000,
    );
  });

  it("rejects social claims unsupported by evidence modality or competitor provenance", () => {
    const base = interpretation("EVID-1");
    expect(() =>
      validateSocialEvidenceClaims(
        {
          ...base,
          visualPatterns: [
            {
              confidence: "MEDIUM",
              evidenceRefs: ["EVID-1"],
              pattern: "Fast visual cuts recur.",
            },
          ],
        },
        [
          {
            evidenceId: "EVID-1",
            safeMetadata: { modality: "CAPTION", platform: "YOUTUBE" },
          },
        ],
      ),
    ).toThrow("visual evidence");
    expect(() =>
      validateSocialEvidenceClaims(
        {
          ...base,
          competitorSignals: [
            {
              confidence: "MEDIUM",
              evidenceRefs: ["EVID-1"],
              statement: "A competitor repeats this pattern.",
            },
          ],
        },
        [
          {
            evidenceId: "EVID-1",
            safeMetadata: { modality: "CAPTION", platform: "YOUTUBE" },
          },
        ],
      ),
    ).toThrow("competitor evidence");
    expect(() =>
      validateSocialEvidenceClaims(
        {
          ...base,
          competitorSignals: [
            {
              confidence: "MEDIUM",
              evidenceRefs: ["EVID-1"],
              statement: "A configured competitor repeats this pattern.",
            },
          ],
          visualPatterns: [
            {
              confidence: "MEDIUM",
              evidenceRefs: ["EVID-1"],
              pattern: "A product demonstration is visible.",
            },
          ],
        },
        [
          {
            evidenceId: "EVID-1",
            safeMetadata: {
              competitorId: "00000000-0000-4000-8000-000000000010",
              modality: "VIDEO",
              platform: "YOUTUBE",
            },
          },
        ],
      ),
    ).not.toThrow();
  });

  it("deduplicates and caps retained evidence deterministically", () => {
    const base = item({ nativeId: "1", normalizedText: "same evidence" });
    const duplicate = deduplicateResearchItems([
      base,
      item({ nativeId: "1", normalizedText: "different" }),
      item({ canonicalUrl: base.canonicalUrl, nativeId: "2" }),
    ]);
    expect(duplicate.items).toHaveLength(1);
    expect(duplicate.duplicateCount).toBe(2);
    const bounded = deduplicateResearchItems(
      Array.from({ length: 25 }, (_, index) =>
        item({
          canonicalUrl: `https://example.test/${index}`,
          nativeId: String(index),
          normalizedText: `evidence ${index}`,
        }),
      ),
    );
    expect(bounded.items).toHaveLength(20);
    expect(bounded.truncatedCount).toBe(5);
  });

  it("keeps future Council projection explicit and source selection bounded", () => {
    expect(
      projectExternalResearchEvidence({
        evidence: [
          {
            evidenceId: "EVID-1",
            excerpt: "public evidence",
            sourceId: "source",
          },
        ],
        selectedEvidenceIds: ["EVID-1"],
      }),
    ).toEqual([
      { evidenceId: "EVID-1", excerpt: "public evidence", sourceId: "source" },
    ]);
    expect(() =>
      projectExternalResearchEvidence({
        evidence: [],
        selectedEvidenceIds: ["EVID-1"],
      }),
    ).toThrow();
  });

  it("never runs more than three source requests concurrently", async () => {
    const gate = new RequestConcurrencyGate(3);
    let active = 0;
    let maximum = 0;
    let release: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const operations = Array.from({ length: 6 }, () =>
      gate.run(async () => {
        active += 1;
        maximum = Math.max(maximum, active);
        await blocked;
        active -= 1;
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(maximum).toBe(3);
    release?.();
    await Promise.all(operations);
  });
});

function interpretation(reference: string) {
  return {
    audienceSignals: [
      {
        confidence: "MEDIUM" as const,
        evidenceRefs: [reference],
        signalType: "PAIN" as const,
        statement: "Sizing inconsistency creates friction.",
      },
    ],
    contentOpportunities: [
      {
        audienceTension: "Shoppers cannot predict fit.",
        caveats: ["Small sample."],
        confidence: "MEDIUM" as const,
        evidenceRefs: [reference],
        freshness: "Current at retrieval.",
        opportunityType: "RELATABLE_PAIN" as const,
        suggestedAngle: "Explain why size labels vary.",
        title: "The sizing trust gap",
        whyItMatters: "Uncertainty can block a purchase.",
      },
    ],
    debates: [],
    languageSignals: [],
    limitations: ["Small bounded sample."],
    objections: [],
    summary: "Fit uncertainty is a recurring audience tension.",
    trendSignals: [],
  };
}

function item(
  overrides: Partial<NormalizedResearchItem> = {},
): NormalizedResearchItem {
  const normalizedText = overrides.normalizedText ?? "evidence";
  return {
    adapterId: "hacker-news",
    author: null,
    canonicalUrl: "https://news.ycombinator.com/item?id=1",
    contentHash: normalizedContentHash(normalizedText),
    evidence: [
      {
        author: null,
        canonicalUrl: "https://news.ycombinator.com/item?id=1",
        evidenceType: "HN_STORY",
        excerpt: normalizedText,
        fetchedAt: "2026-08-31T00:00:00.000Z",
        metadata: {},
        nativeId: "1",
        parentNativeId: null,
        publishedAt: null,
        title: "Evidence",
      },
    ],
    fetchedAt: "2026-08-31T00:00:00.000Z",
    metadata: { stream: "top" },
    nativeId: "1",
    normalizedText,
    publishedAt: null,
    title: "Evidence",
    ...overrides,
  };
}
