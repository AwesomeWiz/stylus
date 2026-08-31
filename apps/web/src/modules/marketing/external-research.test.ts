import { describe, expect, it } from "vitest";

import {
  createExternalResearchSynthesisSchema,
  externalResearchReportSchema,
  externalResearchRequestSchema,
  externalResearchSynthesisLimits,
  projectExternalResearchEvidence,
  validateEvidenceReferences,
} from "./external-research";
import {
  deduplicateResearchItems,
  normalizedContentHash,
  RequestConcurrencyGate,
  type NormalizedResearchItem,
} from "./server/research-sources";

describe("external research contracts", () => {
  it("accepts only the bounded source and question contract", () => {
    expect(
      externalResearchRequestSchema.parse({
        hackerNewsStream: "ask",
        objective: "AUDIENCE_PAINS",
        queryTerms: ["Startups", "startups"],
        question: "What pain points recur for founders?",
        rssFeedUrls: ["https://example.test/feed.xml"],
      }).queryTerms,
    ).toEqual(["startups"]);
    expect(() =>
      externalResearchRequestSchema.parse({
        hackerNewsStream: null,
        objective: "AUDIENCE_PAINS",
        queryTerms: ["startups"],
        question: "What pain points recur for founders?",
        rssFeedUrls: ["http://localhost/feed.xml"],
      }),
    ).toThrow();
  });

  it("deduplicates deterministically by native id, canonical URL, and hash", () => {
    const base = item({ nativeId: "1", normalizedText: "same evidence" });
    const result = deduplicateResearchItems([
      base,
      item({ nativeId: "1", normalizedText: "different" }),
      item({ canonicalUrl: base.canonicalUrl, nativeId: "2" }),
      item({ canonicalUrl: "https://example.test/other", nativeId: "3" }),
    ]);
    expect(result.items).toHaveLength(2);
    expect(result.duplicateCount).toBe(2);
  });

  it("enforces the 20-item and 24k normalized-text ceilings deterministically", () => {
    const small = Array.from({ length: 25 }, (_, index) =>
      item({
        canonicalUrl: `https://example.test/${index}`,
        nativeId: String(index),
        normalizedText: `evidence ${index}`,
      }),
    );
    const boundedByItems = deduplicateResearchItems(small);
    expect(boundedByItems.items).toHaveLength(20);
    expect(boundedByItems.truncatedCount).toBe(5);
    expect(boundedByItems.duplicateCount).toBe(0);

    const large = Array.from({ length: 20 }, (_, index) =>
      item({
        canonicalUrl: `https://example.test/large-${index}`,
        contentHash: String(index).padStart(64, "a").slice(-64),
        nativeId: `large-${index}`,
        normalizedText: `${index}`.padEnd(1_500, "x"),
      }),
    );
    const boundedByText = deduplicateResearchItems(large);
    expect(boundedByText.normalizedCharacters).toBeLessThanOrEqual(24_000);
    expect(boundedByText.items).toHaveLength(16);
  });

  it("rejects synthesis references outside the persisted evidence set", () => {
    const report = reportWithReference("EVID-2");
    expect(() => validateEvidenceReferences(report, ["EVID-1"])).toThrow(
      "invalid evidence reference",
    );
  });

  it("constrains structured synthesis references to the exact evidence set", () => {
    const evidenceIds = Array.from(
      { length: 12 },
      (_, index) => `EVID-${index + 1}`,
    );
    const schema = createExternalResearchSynthesisSchema(evidenceIds);

    expect(schema.safeParse(reportWithReference("EVID-12")).success).toBe(true);
    expect(schema.safeParse(reportWithReference("EVID-13")).success).toBe(
      false,
    );
    expect(
      schema.safeParse({
        ...reportWithReference("EVID-1"),
        findings: Array.from({ length: 5 }, (_, index) => ({
          confidence: "MEDIUM",
          id: `F-${index + 1}`,
          statement: `Finding ${index + 1}`,
          supportedBy: ["EVID-1"],
        })),
      }).success,
    ).toBe(false);
    expect(() =>
      createExternalResearchSynthesisSchema(["EVID-1", "EVID-1"]),
    ).toThrow("identifiers are invalid");
  });

  it("keeps the maximum synthesis response bounded below the provider output ceiling", () => {
    const schema = createExternalResearchSynthesisSchema([
      "EVID-1",
      "EVID-2",
      "EVID-3",
    ]);
    const statement = () => ({
      confidence: "MEDIUM",
      statement: "x".repeat(
        externalResearchSynthesisLimits.statementCharacters,
      ),
      supportedBy: ["EVID-1", "EVID-2", "EVID-3"],
    });
    const list = Array.from(
      { length: externalResearchSynthesisLimits.listItems },
      () => "x".repeat(externalResearchSynthesisLimits.listItemCharacters),
    );
    const maximumReport = {
      confidence: "MEDIUM",
      disagreements: Array.from(
        { length: externalResearchSynthesisLimits.disagreementItems },
        statement,
      ),
      findings: Array.from(
        { length: externalResearchSynthesisLimits.findingItems },
        (_, index) => ({ ...statement(), id: `F-${index + 1}` }),
      ),
      freshnessAssessment: "x".repeat(
        externalResearchSynthesisLimits.freshnessCharacters,
      ),
      inferences: Array.from(
        { length: externalResearchSynthesisLimits.inferenceItems },
        () => ({
          confidence: "MEDIUM",
          statement: "x".repeat(
            externalResearchSynthesisLimits.statementCharacters,
          ),
        }),
      ),
      limitations: list,
      partialFailureWarnings: list,
      patterns: Array.from(
        { length: externalResearchSynthesisLimits.patternItems },
        statement,
      ),
      recommendations: Array.from(
        { length: externalResearchSynthesisLimits.recommendationItems },
        statement,
      ),
      summary: "x".repeat(externalResearchSynthesisLimits.summaryCharacters),
      unresolvedQuestions: list,
    };

    expect(schema.safeParse(maximumReport).success).toBe(true);
    expect(JSON.stringify(maximumReport).length).toBeLessThan(4_500);
    expect(
      schema.safeParse({
        ...maximumReport,
        findings: [...maximumReport.findings, { ...statement(), id: "F-5" }],
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...maximumReport,
        summary: "x".repeat(
          externalResearchSynthesisLimits.summaryCharacters + 1,
        ),
      }).success,
    ).toBe(false);
  });

  it("keeps future Council projection explicit, selected, and bounded", () => {
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
        fetchedAt: "2026-08-29T00:00:00.000Z",
        metadata: {},
        nativeId: "1",
        parentNativeId: null,
        publishedAt: null,
        title: "Evidence",
      },
    ],
    fetchedAt: "2026-08-29T00:00:00.000Z",
    metadata: { stream: "top" },
    nativeId: "1",
    normalizedText,
    publishedAt: null,
    title: "Evidence",
    ...overrides,
  };
}

function reportWithReference(reference: string) {
  return externalResearchReportSchema.parse({
    confidence: "MEDIUM",
    disagreements: [],
    findings: [
      {
        confidence: "MEDIUM",
        id: "F-1",
        statement: "Finding",
        supportedBy: [reference],
      },
    ],
    freshnessAssessment: "Current as of retrieval.",
    inferences: [],
    limitations: [],
    partialFailureWarnings: [],
    patterns: [],
    recommendations: [],
    summary: "Summary",
    unresolvedQuestions: [],
  });
}
