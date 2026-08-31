import { z } from "zod";

export const externalResearchLimits = Object.freeze({
  articleChunksPerStory: 3,
  articleNormalizedCharacters: 4_500,
  articleRequestsPerRun: 2,
  articleResponseBytes: 512 * 1024,
  commentsPerRun: 10,
  completionReserveMs: 5_000,
  concurrentRequests: 3,
  enrichmentConcurrency: 2,
  enrichedItemCharacters: 12_000,
  enrichedHackerNewsStories: 2,
  evidenceExcerptCharacters: 1_500,
  evidenceItems: 20,
  hackerNewsCommentCharacters: 1_500,
  hackerNewsCommentDepth: 1,
  hackerNewsTopLevelComments: 5,
  maxRedirects: 3,
  modelOutputTokens: 1_600,
  normalizedItemCharacters: 1_500,
  normalizedTextCharacters: 24_000,
  queryTermCharacters: 80,
  queryTerms: 5,
  questionCharacters: 500,
  responseBytes: 1024 * 1024,
  retainedItemsPerSource: 10,
  retainedItemsPerRun: 20,
  retrievalTimeoutMs: 20_000,
  rssFeeds: 2,
  sourceRequests: 3,
  sourceObservations: 30,
  sourceTimeoutMs: 8_000,
  synthesisContextCharacters: 40_000,
  synthesisEvidenceCharacters: 18_000,
  synthesisTimeoutMs: 35_000,
  totalFetchedBytes: 4 * 1024 * 1024,
  workflowTimeoutMs: 55_000,
});

export const externalResearchSynthesisLimits = Object.freeze({
  disagreementItems: 1,
  findingItems: 4,
  freshnessCharacters: 140,
  inferenceItems: 2,
  listItemCharacters: 100,
  listItems: 3,
  patternItems: 2,
  recommendationItems: 2,
  statementCharacters: 140,
  statementEvidenceReferences: 3,
  summaryCharacters: 350,
});

export const externalResearchObjectives = [
  "AUDIENCE_PAINS",
  "AUDIENCE_LANGUAGE",
  "RECURRING_QUESTIONS",
  "OBJECTIONS",
  "TREND_EVIDENCE",
  "CONTENT_OBSERVATIONS",
  "COMPETITOR_PUBLIC",
] as const;
export const externalResearchObjectiveSchema = z.enum(
  externalResearchObjectives,
);

export const hackerNewsStreams = ["top", "new", "ask"] as const;
export const hackerNewsStreamSchema = z.enum(hackerNewsStreams);

const rssFeedUrlSchema = z
  .url()
  .max(500)
  .refine((value) => value.startsWith("https://"), "Use a public HTTPS feed.");

export const externalResearchRequestSchema = z
  .object({
    hackerNewsStream: hackerNewsStreamSchema.nullable(),
    objective: externalResearchObjectiveSchema,
    queryTerms: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(externalResearchLimits.queryTermCharacters),
      )
      .min(1)
      .max(externalResearchLimits.queryTerms)
      .transform((terms) => [
        ...new Set(terms.map((term) => term.toLowerCase())),
      ]),
    question: z
      .string()
      .trim()
      .min(10)
      .max(externalResearchLimits.questionCharacters),
    rssFeedUrls: z
      .array(rssFeedUrlSchema)
      .max(externalResearchLimits.rssFeeds)
      .transform((urls) => [...new Set(urls)]),
  })
  .strict()
  .superRefine((request, context) => {
    if (!request.hackerNewsStream && request.rssFeedUrls.length === 0)
      context.addIssue({
        code: "custom",
        message: "Select Hacker News or provide an RSS/Atom feed.",
        path: ["hackerNewsStream"],
      });
    if (
      Number(Boolean(request.hackerNewsStream)) + request.rssFeedUrls.length >
      externalResearchLimits.sourceRequests
    )
      context.addIssue({
        code: "custom",
        message: "A research run supports at most three source requests.",
        path: ["rssFeedUrls"],
      });
  });

export type ExternalResearchRequest = z.infer<
  typeof externalResearchRequestSchema
>;

export const externalResearchJobInputSchema = z
  .object({ runId: z.uuid() })
  .strict();

const confidenceSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
const evidenceReferenceSchema = z.string().regex(/^EVID-(?:[1-9]|1\d|20)$/);
const supportedStatementSchema = z
  .object({
    confidence: confidenceSchema,
    statement: z.string().trim().min(1).max(1_000),
    supportedBy: z.array(evidenceReferenceSchema).min(1).max(10),
  })
  .strict();

export const externalResearchReportSchema = z
  .object({
    confidence: confidenceSchema,
    disagreements: z.array(supportedStatementSchema).max(5),
    findings: z
      .array(
        supportedStatementSchema.extend({
          id: z.string().regex(/^F-(?:[1-9]|1\d|20)$/),
        }),
      )
      .max(20),
    freshnessAssessment: z.string().trim().min(1).max(1_000),
    inferences: z
      .array(
        z
          .object({
            confidence: confidenceSchema,
            statement: z.string().trim().min(1).max(1_000),
          })
          .strict(),
      )
      .max(8),
    limitations: z.array(z.string().trim().min(1).max(500)).max(10),
    partialFailureWarnings: z.array(z.string().trim().min(1).max(500)).max(10),
    patterns: z.array(supportedStatementSchema).max(10),
    recommendations: z.array(supportedStatementSchema).max(8),
    summary: z.string().trim().min(1).max(2_000),
    unresolvedQuestions: z.array(z.string().trim().min(1).max(500)).max(10),
  })
  .strict();

export function createExternalResearchSynthesisSchema(
  evidenceIds: readonly string[],
) {
  const uniqueEvidenceIds = [...new Set(evidenceIds)];
  if (
    uniqueEvidenceIds.length === 0 ||
    uniqueEvidenceIds.length !== evidenceIds.length ||
    uniqueEvidenceIds.length > externalResearchLimits.evidenceItems ||
    uniqueEvidenceIds.some(
      (evidenceId) => !evidenceReferenceSchema.safeParse(evidenceId).success,
    )
  )
    throw new Error("Synthesis evidence identifiers are invalid.");

  const firstEvidenceId = uniqueEvidenceIds[0]!;
  const exactEvidenceReferenceSchema = z.enum([
    firstEvidenceId,
    ...uniqueEvidenceIds.slice(1),
  ]);
  const conciseSupportedStatementSchema = z
    .object({
      confidence: confidenceSchema,
      statement: z
        .string()
        .trim()
        .min(1)
        .max(externalResearchSynthesisLimits.statementCharacters),
      supportedBy: z
        .array(exactEvidenceReferenceSchema)
        .min(1)
        .max(
          Math.min(
            externalResearchSynthesisLimits.statementEvidenceReferences,
            uniqueEvidenceIds.length,
          ),
        ),
    })
    .strict();
  const conciseText = (maximum: number) =>
    z.string().trim().min(1).max(maximum);

  return z
    .object({
      confidence: confidenceSchema,
      disagreements: z
        .array(conciseSupportedStatementSchema)
        .max(externalResearchSynthesisLimits.disagreementItems),
      findings: z
        .array(
          conciseSupportedStatementSchema.extend({
            id: z.string().regex(/^F-(?:[1-9]|1\d|20)$/),
          }),
        )
        .max(externalResearchSynthesisLimits.findingItems),
      freshnessAssessment: conciseText(
        externalResearchSynthesisLimits.freshnessCharacters,
      ),
      inferences: z
        .array(
          z
            .object({
              confidence: confidenceSchema,
              statement: conciseText(
                externalResearchSynthesisLimits.statementCharacters,
              ),
            })
            .strict(),
        )
        .max(externalResearchSynthesisLimits.inferenceItems),
      limitations: z
        .array(conciseText(externalResearchSynthesisLimits.listItemCharacters))
        .max(externalResearchSynthesisLimits.listItems),
      partialFailureWarnings: z
        .array(conciseText(externalResearchSynthesisLimits.listItemCharacters))
        .max(externalResearchSynthesisLimits.listItems),
      patterns: z
        .array(conciseSupportedStatementSchema)
        .max(externalResearchSynthesisLimits.patternItems),
      recommendations: z
        .array(conciseSupportedStatementSchema)
        .max(externalResearchSynthesisLimits.recommendationItems),
      summary: conciseText(externalResearchSynthesisLimits.summaryCharacters),
      unresolvedQuestions: z
        .array(conciseText(externalResearchSynthesisLimits.listItemCharacters))
        .max(externalResearchSynthesisLimits.listItems),
    })
    .strict();
}

export type ExternalResearchReport = z.infer<
  typeof externalResearchReportSchema
>;

export type ExternalResearchActionState = {
  message?: string;
  runId?: string;
  status: "idle" | "error" | "success";
};

export const initialExternalResearchActionState: ExternalResearchActionState = {
  status: "idle",
};

export function validateEvidenceReferences(
  report: ExternalResearchReport,
  evidenceIds: Iterable<string>,
) {
  const available = new Set(evidenceIds);
  const supported = [
    ...report.findings,
    ...report.patterns,
    ...report.disagreements,
    ...report.recommendations,
  ];
  if (
    supported.some((item) =>
      item.supportedBy.some((evidenceId) => !available.has(evidenceId)),
    )
  )
    throw new Error("Research report contains an invalid evidence reference.");
}

export function projectExternalResearchEvidence(input: {
  evidence: Array<{ evidenceId: string; excerpt: string; sourceId: string }>;
  selectedEvidenceIds: string[];
}) {
  const selected = new Set(input.selectedEvidenceIds);
  if (selected.size !== input.selectedEvidenceIds.length || selected.size > 10)
    throw new Error("Research evidence selection is invalid.");
  const projected = input.evidence.filter((item) =>
    selected.has(item.evidenceId),
  );
  if (projected.length !== selected.size)
    throw new Error("Research evidence selection is invalid.");
  return projected.map((item) => ({
    evidenceId: item.evidenceId,
    excerpt: item.excerpt.slice(
      0,
      externalResearchLimits.evidenceExcerptCharacters,
    ),
    sourceId: item.sourceId,
  }));
}
