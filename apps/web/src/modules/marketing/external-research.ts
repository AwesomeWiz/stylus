import { z } from "zod";

export const externalResearchLimits = Object.freeze({
  articleChunksPerStory: 3,
  articleNormalizedCharacters: 4_500,
  articleRequestsPerRun: 2,
  articleResponseBytes: 512 * 1024,
  commentsPerRun: 10,
  completionReserveMs: 5_000,
  concurrentRequests: 3,
  editorialFeedsPerRun: 2,
  editorialItemsPerFeed: 2,
  enrichmentConcurrency: 2,
  enrichedItemCharacters: 12_000,
  enrichedHackerNewsStories: 2,
  evidenceExcerptCharacters: 1_500,
  evidenceItems: 20,
  hackerNewsCommentCharacters: 1_500,
  hackerNewsCommentDepth: 1,
  hackerNewsTopLevelComments: 5,
  maxRedirects: 3,
  modelOutputTokens: 3_200,
  normalizedItemCharacters: 1_500,
  normalizedTextCharacters: 24_000,
  queryTermCharacters: 80,
  queryTerms: 5,
  questionCharacters: 500,
  redditCandidatePostsPerQuery: 8,
  redditCommentCharacters: 1_500,
  redditCommentDepth: 1,
  redditCommentsPerPost: 2,
  redditCommentsPerRun: 8,
  redditCommunitiesPerRun: 2,
  redditPostsPerRun: 4,
  redditQueryVariants: 2,
  socialCommentsPerItem: 5,
  socialCommentCharacters: 1_500,
  socialCommentsPerRun: 12,
  socialItemsForComments: 3,
  socialPlatformsPerRun: 2,
  socialVideosPerRun: 6,
  webCandidateUrlsPerRun: 12,
  webEvidenceItemsPerRun: 8,
  webPagesPerRun: 4,
  webQueriesPerRun: 3,
  webResultsPerQuery: 8,
  webRobotsResponseBytes: 64 * 1024,
  webSearchResponseBytes: 256 * 1024,
  webUrlsFetchedPerRun: 6,
  youtubeChannelIdsPerRun: 3,
  youtubeRequestsPerRun: 5,
  responseBytes: 1024 * 1024,
  retainedItemsPerSource: 10,
  retainedItemsPerRun: 20,
  retrievalTimeoutMs: 20_000,
  rssFeeds: 2,
  sourceFamilies: 4,
  sourceObservations: 30,
  sourceTimeoutMs: 8_000,
  synthesisContextCharacters: 40_000,
  synthesisEvidenceCharacters: 18_000,
  synthesisTimeoutMs: 35_000,
  totalFetchedBytes: 4 * 1024 * 1024,
  workflowTimeoutMs: 55_000,
});

export const marketingResearchIntents = [
  "AUDIENCE_PAIN",
  "AUDIENCE_DESIRE",
  "AUDIENCE_LANGUAGE",
  "PURCHASE_OBJECTION",
  "QUESTION_DEMAND",
  "BELIEF_OR_MISCONCEPTION",
  "CONTROVERSY_OR_DEBATE",
  "TREND_SIGNAL",
  "COMPETITOR_SIGNAL",
  "FASHION_TECH",
] as const;
export const marketingResearchIntentSchema = z.enum(marketingResearchIntents);
export type MarketingResearchIntent = z.infer<
  typeof marketingResearchIntentSchema
>;

export const researchSourceFamilies = [
  "REDDIT",
  "EDITORIAL",
  "HACKER_NEWS",
  "SOCIAL",
  "WEB",
] as const;
export const researchSourceFamilySchema = z.enum(researchSourceFamilies);
export type ResearchSourceFamily = z.infer<typeof researchSourceFamilySchema>;
export type FashionResearchPlanPreview = {
  intent: MarketingResearchIntent;
  reasonCodes: string[];
  sources: Array<{
    available: boolean;
    family: ResearchSourceFamily;
    labels: string[];
    providerStatus?: "AVAILABLE" | "UNCONFIGURED";
    statuses?: Array<{
      platform: SocialPlatform;
      status: SocialPlatformStatus;
    }>;
  }>;
};

export const socialPlatforms = [
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "PINTEREST",
] as const;
export const socialPlatformSchema = z.enum(socialPlatforms);
export type SocialPlatform = z.infer<typeof socialPlatformSchema>;

export const socialPlatformStatuses = [
  "AVAILABLE",
  "UNCONFIGURED",
  "APPROVAL_REQUIRED",
  "UNSUPPORTED_FOR_DISCOVERY",
  "POLICY_DENIED",
  "RATE_LIMITED",
  "TEMPORARILY_UNAVAILABLE",
] as const;
export const socialPlatformStatusSchema = z.enum(socialPlatformStatuses);
export type SocialPlatformStatus = z.infer<typeof socialPlatformStatusSchema>;

export const researchPlanReasonCodes = [
  "CONSUMER_LANGUAGE_SOURCE",
  "CONSUMER_DISCUSSION_SOURCE",
  "EDITORIAL_TREND_SOURCE",
  "EDITORIAL_CONTEXT_SOURCE",
  "PUBLIC_COMPETITOR_SOURCE",
  "TECHNICAL_DISCUSSION_SOURCE",
  "EXISTING_FEED_SOURCE",
  "OFFICIAL_SOCIAL_DISCOVERY_SOURCE",
  "COMPETITOR_SOCIAL_SOURCE",
  "BOUNDED_WEB_DISCOVERY_SOURCE",
  "CONSUMER_WEB_SOURCE",
] as const;
export const researchPlanReasonCodeSchema = z.enum(researchPlanReasonCodes);

export const hackerNewsStreams = ["top", "new", "ask"] as const;
export const hackerNewsStreamSchema = z.enum(hackerNewsStreams);

export const fashionResearchSourcePlanSchema = z
  .object({
    editorial: z
      .object({
        includeSearchDiscovery: z.boolean(),
        sourceIds: z
          .array(z.string().regex(/^[a-z0-9-]{2,64}$/))
          .max(externalResearchLimits.editorialFeedsPerRun),
      })
      .strict(),
    hackerNews: z
      .object({ stream: hackerNewsStreamSchema })
      .strict()
      .nullable(),
    intent: marketingResearchIntentSchema,
    reasonCodes: z.array(researchPlanReasonCodeSchema).min(1).max(7),
    reddit: z
      .object({
        communityIds: z
          .array(z.string().regex(/^[a-z0-9-]{2,64}$/))
          .max(externalResearchLimits.redditCommunitiesPerRun),
        queryVariants: z
          .array(
            z
              .string()
              .trim()
              .min(1)
              .max(externalResearchLimits.queryTermCharacters),
          )
          .max(externalResearchLimits.redditQueryVariants),
      })
      .strict(),
    social: z
      .object({
        selectedPlatforms: z
          .array(socialPlatformSchema)
          .max(externalResearchLimits.socialPlatformsPerRun),
        youtubeChannelIds: z
          .array(z.string().regex(/^UC[A-Za-z0-9_-]{20,30}$/))
          .max(externalResearchLimits.youtubeChannelIdsPerRun),
      })
      .strict()
      .optional()
      .default({ selectedPlatforms: [], youtubeChannelIds: [] }),
    web: z
      .object({
        queryVariants: z
          .array(z.string().trim().min(1).max(160))
          .max(externalResearchLimits.webQueriesPerRun),
      })
      .strict()
      .optional()
      .default({ queryVariants: [] }),
    selectedSourceFamilies: z
      .array(researchSourceFamilySchema)
      .min(1)
      .max(externalResearchLimits.sourceFamilies),
    version: z.enum([
      "marketing-fashion-source-plan-v1",
      "marketing-fashion-social-source-plan-v1",
      "marketing-fashion-web-source-plan-v1",
    ]),
  })
  .strict();
export type FashionResearchSourcePlan = z.infer<
  typeof fashionResearchSourcePlanSchema
>;

const queryTermsSchema = z
  .array(
    z.string().trim().min(1).max(externalResearchLimits.queryTermCharacters),
  )
  .min(1)
  .max(externalResearchLimits.queryTerms)
  .transform((terms) => [
    ...new Set(terms.map((term) => term.toLocaleLowerCase("en-US"))),
  ]);

export const externalResearchSubmissionSchema = z
  .object({
    hackerNewsStream: hackerNewsStreamSchema.nullable(),
    intent: marketingResearchIntentSchema,
    queryTerms: queryTermsSchema,
    question: z
      .string()
      .trim()
      .min(10)
      .max(externalResearchLimits.questionCharacters),
  })
  .strict()
  .superRefine((request, context) => {
    if (request.intent !== "FASHION_TECH" && request.hackerNewsStream)
      context.addIssue({
        code: "custom",
        message:
          "Hacker News is available only for fashion technology research.",
        path: ["hackerNewsStream"],
      });
  });

export const externalResearchRequestSchema = z
  .object({
    intent: marketingResearchIntentSchema,
    plan: fashionResearchSourcePlanSchema,
    queryTerms: queryTermsSchema,
    question: z
      .string()
      .trim()
      .min(10)
      .max(externalResearchLimits.questionCharacters),
  })
  .strict()
  .superRefine((request, context) => {
    if (request.intent !== request.plan.intent)
      context.addIssue({
        code: "custom",
        message: "Research intent and source plan must match.",
        path: ["plan", "intent"],
      });
  });
export type ExternalResearchRequest = z.infer<
  typeof externalResearchRequestSchema
>;

export const legacyExternalResearchObjectives = [
  "AUDIENCE_PAINS",
  "AUDIENCE_LANGUAGE",
  "RECURRING_QUESTIONS",
  "OBJECTIONS",
  "TREND_EVIDENCE",
  "CONTENT_OBSERVATIONS",
  "COMPETITOR_PUBLIC",
] as const;
const legacyRequestSchema = z
  .object({
    hackerNewsStream: hackerNewsStreamSchema.nullable(),
    objective: z.enum(legacyExternalResearchObjectives),
    queryTerms: queryTermsSchema,
    question: z
      .string()
      .trim()
      .min(10)
      .max(externalResearchLimits.questionCharacters),
    rssFeedUrls: z.array(z.url().max(500)).max(2),
  })
  .strict();

export const externalResearchRequestSnapshotSchema = z.union([
  externalResearchRequestSchema,
  legacyRequestSchema,
]);
export type ExternalResearchRequestSnapshot = z.infer<
  typeof externalResearchRequestSnapshotSchema
>;

export const externalResearchJobInputSchema = z
  .object({ runId: z.uuid() })
  .strict();

export const fashionSignalTypes = [
  "PAIN",
  "DESIRE",
  "QUESTION",
  "OBJECTION",
  "LANGUAGE",
  "MISCONCEPTION",
  "DEBATE",
  "TREND",
  "COMPETITOR",
  "TECH",
  "CONTENT_PATTERN",
  "VISUAL_PATTERN",
] as const;
export const fashionSignalTypeSchema = z.enum(fashionSignalTypes);

export const contentOpportunityTypes = [
  "RELATABLE_PAIN",
  "EDUCATIONAL",
  "MYTH_BUSTING",
  "DEBATE",
  "TREND_EXPLAINER",
  "BUYING_OBJECTION",
  "IDENTITY_ASPIRATION",
  "QUESTION_ANSWER",
  "BRAND_TRUST",
  "PRODUCT_CONTEXT",
] as const;
export const contentOpportunityTypeSchema = z.enum(contentOpportunityTypes);

const confidenceSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
const evidenceReferenceSchema = z.string().regex(/^EVID-(?:[1-9]|1\d|20)$/);

export const fashionResearchSynthesisLimits = Object.freeze({
  audienceSignals: 4,
  caveatCharacters: 90,
  caveats: 2,
  contentOpportunities: 4,
  contentPatterns: 3,
  competitorSignals: 3,
  debates: 1,
  evidenceReferences: 3,
  freshnessCharacters: 90,
  languageSignals: 3,
  limitations: 3,
  objections: 2,
  phraseCharacters: 80,
  statementCharacters: 130,
  summaryCharacters: 320,
  titleCharacters: 80,
  trendSignals: 2,
  visualPatterns: 3,
});

function createFashionInterpretationSchema(
  referenceSchema: z.ZodType<string> = evidenceReferenceSchema,
) {
  const references = z
    .array(referenceSchema)
    .min(1)
    .max(fashionResearchSynthesisLimits.evidenceReferences);
  const statement = z
    .string()
    .trim()
    .min(1)
    .max(fashionResearchSynthesisLimits.statementCharacters);
  return z
    .object({
      audienceSignals: z
        .array(
          z
            .object({
              confidence: confidenceSchema,
              evidenceRefs: references,
              signalType: fashionSignalTypeSchema,
              statement,
            })
            .strict(),
        )
        .max(fashionResearchSynthesisLimits.audienceSignals),
      contentOpportunities: z
        .array(
          z
            .object({
              audienceTension: statement,
              caveats: z
                .array(
                  z
                    .string()
                    .trim()
                    .min(1)
                    .max(fashionResearchSynthesisLimits.caveatCharacters),
                )
                .max(fashionResearchSynthesisLimits.caveats),
              confidence: confidenceSchema,
              evidenceRefs: references,
              freshness: z
                .string()
                .trim()
                .min(1)
                .max(fashionResearchSynthesisLimits.freshnessCharacters),
              opportunityType: contentOpportunityTypeSchema,
              suggestedAngle: statement,
              title: z
                .string()
                .trim()
                .min(1)
                .max(fashionResearchSynthesisLimits.titleCharacters),
              whyItMatters: statement,
            })
            .strict(),
        )
        .max(fashionResearchSynthesisLimits.contentOpportunities),
      contentPatterns: z
        .array(
          z
            .object({
              confidence: confidenceSchema,
              evidenceRefs: references,
              pattern: statement,
            })
            .strict(),
        )
        .max(fashionResearchSynthesisLimits.contentPatterns)
        .default([]),
      competitorSignals: z
        .array(
          z
            .object({
              confidence: confidenceSchema,
              evidenceRefs: references,
              statement,
            })
            .strict(),
        )
        .max(fashionResearchSynthesisLimits.competitorSignals)
        .default([]),
      debates: z
        .array(
          z
            .object({ evidenceRefs: references, positionSummary: statement })
            .strict(),
        )
        .max(fashionResearchSynthesisLimits.debates),
      languageSignals: z
        .array(
          z
            .object({
              evidenceRefs: references,
              interpretation: statement,
              phraseOrPattern: z
                .string()
                .trim()
                .min(1)
                .max(fashionResearchSynthesisLimits.phraseCharacters),
            })
            .strict(),
        )
        .max(fashionResearchSynthesisLimits.languageSignals),
      limitations: z
        .array(
          z
            .string()
            .trim()
            .min(1)
            .max(fashionResearchSynthesisLimits.statementCharacters),
        )
        .max(fashionResearchSynthesisLimits.limitations),
      objections: z
        .array(
          z.object({ evidenceRefs: references, objection: statement }).strict(),
        )
        .max(fashionResearchSynthesisLimits.objections),
      summary: z
        .string()
        .trim()
        .min(1)
        .max(fashionResearchSynthesisLimits.summaryCharacters),
      trendSignals: z
        .array(
          z
            .object({
              confidence: confidenceSchema,
              evidenceRefs: references,
              statement,
            })
            .strict(),
        )
        .max(fashionResearchSynthesisLimits.trendSignals),
      visualPatterns: z
        .array(
          z
            .object({
              confidence: confidenceSchema,
              evidenceRefs: references,
              pattern: statement,
            })
            .strict(),
        )
        .max(fashionResearchSynthesisLimits.visualPatterns)
        .default([]),
    })
    .strict();
}

export const fashionResearchInterpretationSchema =
  createFashionInterpretationSchema();
export type FashionResearchInterpretation = z.infer<
  typeof fashionResearchInterpretationSchema
>;
type VerifiableFashionInterpretation = Omit<
  FashionResearchInterpretation,
  "contentPatterns" | "competitorSignals" | "visualPatterns"
> &
  Partial<
    Pick<
      FashionResearchInterpretation,
      "contentPatterns" | "competitorSignals" | "visualPatterns"
    >
  >;

const sourceCoverageSchema = z
  .object({
    evidenceCount: z.number().int().min(0).max(20),
    failedRequestCount: z.number().int().min(0).max(30),
    family: researchSourceFamilySchema,
    sourceLabels: z.array(z.string().trim().min(1).max(80)).max(4),
    status: z.enum(["SUCCEEDED", "PARTIAL", "FAILED", "UNAVAILABLE"]),
  })
  .strict();

export const fashionResearchReportSchema = fashionResearchInterpretationSchema
  .extend({
    schemaVersion: z.enum([
      "marketing-fashion-research-report-v1",
      "marketing-fashion-social-research-report-v1",
      "marketing-fashion-web-research-report-v1",
    ]),
    sourceCoverage: z.array(sourceCoverageSchema).min(1).max(4),
    sourceDiversity: z
      .object({
        evidenceByType: z.record(z.string(), z.number().int().min(0).max(20)),
        socialAccountCount: z.number().int().min(0).max(20).default(0),
        socialCommentThreadCount: z.number().int().min(0).max(20).default(0),
        socialIndependentContentCount: z
          .number()
          .int()
          .min(0)
          .max(20)
          .default(0),
        socialPlatformCount: z.number().int().min(0).max(4).default(0),
        snippetEvidenceCount: z.number().int().min(0).max(20).default(0),
        sourceClassCount: z.number().int().min(0).max(9).default(0),
        sourceFamilyCount: z.number().int().min(1).max(4),
        sourcesRepresented: z.array(z.string().min(1).max(80)).max(12),
        uniqueSourceCount: z.number().int().min(1).max(20).default(1),
      })
      .strict(),
  })
  .strict();
export type FashionResearchReport = z.infer<typeof fashionResearchReportSchema>;

export function createFashionResearchSynthesisSchema(
  evidenceIds: readonly string[],
) {
  const uniqueEvidenceIds = validateSynthesisEvidenceIds(evidenceIds);
  return createFashionInterpretationSchema(
    z.enum([uniqueEvidenceIds[0]!, ...uniqueEvidenceIds.slice(1)]),
  );
}

const legacySupportedStatementSchema = z
  .object({
    confidence: confidenceSchema,
    statement: z.string().trim().min(1).max(1_000),
    supportedBy: z.array(evidenceReferenceSchema).min(1).max(10),
  })
  .strict();
export const legacyExternalResearchReportSchema = z
  .object({
    confidence: confidenceSchema,
    disagreements: z.array(legacySupportedStatementSchema).max(5),
    findings: z
      .array(
        legacySupportedStatementSchema.extend({
          id: z.string().min(1).max(20),
        }),
      )
      .max(20),
    freshnessAssessment: z.string().trim().min(1).max(1_000),
    inferences: z
      .array(
        z
          .object({ confidence: confidenceSchema, statement: z.string() })
          .strict(),
      )
      .max(8),
    limitations: z.array(z.string()).max(10),
    partialFailureWarnings: z.array(z.string()).max(10),
    patterns: z.array(legacySupportedStatementSchema).max(10),
    recommendations: z.array(legacySupportedStatementSchema).max(8),
    summary: z.string().trim().min(1).max(2_000),
    unresolvedQuestions: z.array(z.string()).max(10),
  })
  .strict();
export const externalResearchReportSchema = z.union([
  fashionResearchReportSchema,
  legacyExternalResearchReportSchema,
]);
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

export function validateFashionEvidenceReferences(
  report: VerifiableFashionInterpretation,
  evidenceIds: Iterable<string>,
) {
  const available = new Set(evidenceIds);
  const referenced = [
    ...report.audienceSignals,
    ...report.languageSignals,
    ...report.trendSignals,
    ...report.objections,
    ...report.debates,
    ...report.contentOpportunities,
    ...(report.contentPatterns ?? []),
    ...(report.competitorSignals ?? []),
    ...(report.visualPatterns ?? []),
  ];
  if (
    referenced.some((item) =>
      item.evidenceRefs.some((evidenceId) => !available.has(evidenceId)),
    )
  )
    throw new Error("Research report contains an invalid evidence reference.");
}

export function validateSocialEvidenceClaims(
  report: VerifiableFashionInterpretation,
  evidence: Array<{
    evidenceId: string;
    safeMetadata: Record<string, unknown>;
  }>,
) {
  const byId = new Map(evidence.map((item) => [item.evidenceId, item]));
  const supportsVisual = (evidenceId: string) => {
    const modality = byId.get(evidenceId)?.safeMetadata.modality;
    return (
      modality === "IMAGE" || modality === "VIDEO" || modality === "TRANSCRIPT"
    );
  };
  if (
    (report.visualPatterns ?? []).some((pattern) =>
      pattern.evidenceRefs.some((reference) => !supportsVisual(reference)),
    )
  )
    throw new Error("Visual pattern is not supported by visual evidence.");
  if (
    (report.competitorSignals ?? []).some((signal) =>
      signal.evidenceRefs.some(
        (reference) =>
          typeof byId.get(reference)?.safeMetadata.competitorId !== "string",
      ),
    )
  )
    throw new Error(
      "Competitor signal is not supported by competitor evidence.",
    );
}

function validateSynthesisEvidenceIds(evidenceIds: readonly string[]) {
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
  return uniqueEvidenceIds;
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
