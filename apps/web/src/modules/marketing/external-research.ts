import { z } from "zod";

export const externalResearchLimits = Object.freeze({
  concurrentRequests: 3,
  evidenceExcerptCharacters: 800,
  evidenceItems: 20,
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
  rssFeeds: 2,
  sourceRequests: 3,
  sourceTimeoutMs: 8_000,
  synthesisContextCharacters: 24_000,
  totalFetchedBytes: 4 * 1024 * 1024,
  workflowTimeoutMs: 120_000,
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

const evidenceReferenceSchema = z.string().regex(/^EVID-(?:[1-9]|1\d|20)$/);
const supportedStatementSchema = z
  .object({
    confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
    statement: z.string().trim().min(1).max(1_000),
    supportedBy: z.array(evidenceReferenceSchema).min(1).max(10),
  })
  .strict();

export const externalResearchReportSchema = z
  .object({
    confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
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
            confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
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
