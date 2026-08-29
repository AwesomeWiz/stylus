import { z } from "zod";

import {
  companyCreativeContextSchema,
  creativeCritiqueSchema,
  reelScriptSchema,
} from "./creative-council";

export const STRATEGIC_REVIEW_WORKFLOW_VERSION = "strategic-review-v1";
export const STRATEGIC_REVIEW_SCHEMA_VERSION = "strategic-council-review-v1";
export const STRATEGIC_REVIEW_MAX_CALLS = 5;
export const STRATEGIC_REVIEW_CALL_TIMEOUT_MS = 60_000;
export const STRATEGIC_REVIEW_DEADLINE_MS = 285_000;
export const MAX_STRATEGIC_REVIEW_CONTEXT_CHARS = 48_000;

export const confidenceSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const evidenceStatusSchema = z.enum([
  "SUPPORTED",
  "WEAKLY_SUPPORTED",
  "UNSUPPORTED_BY_SUPPLIED_EVIDENCE",
  "CONTRADICTED_BY_SUPPLIED_EVIDENCE",
  "REQUIRES_EXTERNAL_VERIFICATION",
]);
export const reasoningBasisSchema = z.enum([
  "EVIDENCE",
  "INFERENCE",
  "ASSUMPTION",
]);

const boundedText = (max: number) => z.string().trim().min(1).max(max);
const boundedList = (maxItems: number, maxLength = 400) =>
  z.array(boundedText(maxLength)).max(maxItems);

export const evidenceReferenceSchema = z
  .object({
    basis: reasoningBasisSchema,
    referenceId: boundedText(80),
    summary: boundedText(400),
  })
  .strict();

export const audienceFindingSchema = z
  .object({
    basis: reasoningBasisSchema,
    confidence: confidenceSchema,
    evidenceReferences: z.array(evidenceReferenceSchema).max(4),
    finding: boundedText(600),
    id: boundedText(40),
  })
  .strict();

export const audienceResearchSchema = z
  .object({
    assumptions: boundedList(6, 400),
    audienceFit: z.enum(["STRONG", "MIXED", "WEAK", "UNCERTAIN"]),
    confidence: confidenceSchema,
    evidenceStatus: evidenceStatusSchema,
    findings: z.array(audienceFindingSchema).max(8),
    likelyFriction: boundedList(6, 500),
    likelyResonance: boundedList(6, 500),
    recommendations: boundedList(6, 500),
    summary: boundedText(900),
  })
  .strict();

export const brandFindingSchema = z
  .object({
    basis: reasoningBasisSchema,
    confidence: confidenceSchema,
    evidenceReferences: z.array(evidenceReferenceSchema).max(4),
    finding: boundedText(600),
    id: boundedText(40),
  })
  .strict();

export const brandReviewSchema = z
  .object({
    alignedElements: boundedList(6, 500),
    brandAlignment: z.enum(["STRONG", "MIXED", "WEAK", "UNCERTAIN"]),
    confidence: confidenceSchema,
    conflicts: boundedList(6, 500),
    evidenceStatus: evidenceStatusSchema,
    findings: z.array(brandFindingSchema).max(8),
    recommendedCorrections: boundedList(6, 500),
    summary: boundedText(900),
    unsupportedOrOverstatedClaims: boundedList(6, 500),
  })
  .strict();

export const strategicRecommendationSchema = z
  .object({
    assumptions: boundedList(4, 300),
    confidence: confidenceSchema,
    evidenceReferences: z.array(evidenceReferenceSchema).max(5),
    evidenceStatus: evidenceStatusSchema,
    id: z.string().regex(/^REC-[1-9][0-9]?$/),
    recommendation: boundedText(700),
    risk: boundedText(400).nullable(),
  })
  .strict();

export const contentStrategySchema = z
  .object({
    confidence: confidenceSchema,
    overallRecommendation: boundedText(1200),
    positioningAndAngle: boundedList(6, 600),
    priorityChanges: z.array(strategicRecommendationSchema).min(1).max(8),
    risks: boundedList(6, 500),
    unchanged: boundedList(6, 500),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.priorityChanges.map((item) => item.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        message: "Recommendation identifiers must be unique.",
        path: ["priorityChanges"],
      });
    }
  });

export const challengeCategorySchema = z.enum([
  "UNSUPPORTED_CLAIM",
  "EVIDENCE_INFERENCE_CONFUSION",
  "CONTRADICTION",
  "GROUPTHINK",
  "MISSING_EVIDENCE",
  "OVERCONFIDENCE",
  "HALLUCINATION_RISK",
  "COMPETITOR_IMITATION_RISK",
  "AUDIENCE_BRAND_CONFLICT",
  "COUNTER_HYPOTHESIS",
]);

export const strategicChallengeSchema = z
  .object({
    category: challengeCategorySchema,
    challenge: boundedText(650),
    confidenceCalibration: boundedText(400),
    contradictionReferences: boundedList(4, 120),
    counterHypothesis: boundedText(500).nullable(),
    evidenceStatus: evidenceStatusSchema,
    missingEvidence: boundedList(4, 400),
    reconsideration: z.enum(["REQUIRED", "RECOMMENDED", "NOT_REQUIRED"]),
    referenceId: boundedText(80),
    riskFlags: boundedList(5, 120),
    verificationRecommendation: boundedText(500).nullable(),
  })
  .strict();

export const challengeReviewSchema = z
  .object({
    challenges: z.array(strategicChallengeSchema).max(10),
    confidence: confidenceSchema,
    overallSeverity: z.enum(["NONE", "LOW", "MEDIUM", "HIGH"]),
    summary: boundedText(1000),
  })
  .strict();

export const challengeDispositionSchema = z
  .object({
    challengeReferenceId: boundedText(80),
    disposition: z.enum(["ACCEPTED", "PARTIALLY_ACCEPTED", "REJECTED"]),
    rationale: boundedText(500),
  })
  .strict();

const strategicCouncilReviewBaseSchema = z
  .object({
    approvedRecommendations: z
      .array(
        z
          .object({
            evidenceStatus: evidenceStatusSchema,
            recommendation: boundedText(700),
            recommendationId: z.string().regex(/^REC-[1-9][0-9]?$/),
          })
          .strict(),
      )
      .max(8),
    challengeDispositions: z.array(challengeDispositionSchema).max(10),
    confidence: confidenceSchema,
    finalAssessment: boundedText(1400),
    rejectedOrRevisedRecommendations: z
      .array(
        z
          .object({
            action: z.enum(["REJECTED", "REVISED"]),
            rationale: boundedText(500),
            recommendationId: z.string().regex(/^REC-[1-9][0-9]?$/),
          })
          .strict(),
      )
      .max(8),
    risks: boundedList(8, 500),
    unresolvedUnknowns: boundedList(8, 500),
    verificationNeeds: boundedList(8, 500),
  })
  .strict();

function requireUniqueChallengeDispositions(
  value: z.infer<typeof strategicCouncilReviewBaseSchema>,
  context: z.RefinementCtx,
) {
  const ids = value.challengeDispositions.map(
    (item) => item.challengeReferenceId,
  );
  if (new Set(ids).size !== ids.length) {
    context.addIssue({
      code: "custom",
      message: "Challenge dispositions must be unique.",
      path: ["challengeDispositions"],
    });
  }
}

export const strategicCouncilReviewSchema =
  strategicCouncilReviewBaseSchema.superRefine(
    requireUniqueChallengeDispositions,
  );

export function createStrategicCouncilReviewSchema(
  challengeReferenceIds: readonly string[],
) {
  const uniqueReferenceIds = [...new Set(challengeReferenceIds)];
  if (uniqueReferenceIds.length !== challengeReferenceIds.length)
    throw new Error("Challenge reference identifiers must be unique.");

  const firstReferenceId = uniqueReferenceIds[0];
  const dispositionSchema = firstReferenceId
    ? challengeDispositionSchema
        .extend({
          challengeReferenceId: z.enum([
            firstReferenceId,
            ...uniqueReferenceIds.slice(1),
          ]),
        })
        .strict()
    : challengeDispositionSchema;

  return strategicCouncilReviewBaseSchema
    .extend({
      challengeDispositions: z
        .array(dispositionSchema)
        .length(uniqueReferenceIds.length),
    })
    .strict()
    .superRefine((value, context) => {
      requireUniqueChallengeDispositions(value, context);
      const actualReferenceIds = new Set(
        value.challengeDispositions.map(
          (disposition) => disposition.challengeReferenceId,
        ),
      );
      if (
        actualReferenceIds.size !== uniqueReferenceIds.length ||
        !uniqueReferenceIds.every((referenceId) =>
          actualReferenceIds.has(referenceId),
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "Every challenge must be dispositioned exactly once.",
          path: ["challengeDispositions"],
        });
      }
    });
}

export const reelBriefProjectionSchema = z
  .object({
    callToAction: boundedText(500),
    caption: boundedText(1800),
    critique: creativeCritiqueSchema,
    primaryHook: boundedText(500),
    schemaVersion: z.literal("reel-brief-v1"),
    scriptSections: reelScriptSchema.shape.sections,
    sourceReelBriefVersionId: z.string().uuid(),
    sourceReelIdeaId: z.string().uuid(),
    spokenScript: boundedText(5000),
    title: boundedText(240),
    versionNumber: z.number().int().min(1).max(10_000),
    visualDirections: reelScriptSchema.shape.visualDirections,
  })
  .strict();

export const strategicReviewContextSchema = z
  .object({
    company: companyCreativeContextSchema,
    reelBrief: reelBriefProjectionSchema,
  })
  .strict();

export const audienceResearchInputSchema = strategicReviewContextSchema;
export const brandReviewInputSchema = strategicReviewContextSchema;
export const contentStrategyInputSchema = z
  .object({
    audienceResearch: audienceResearchSchema,
    brandReview: brandReviewSchema,
    company: companyCreativeContextSchema,
    reelBrief: reelBriefProjectionSchema,
  })
  .strict();
export const challengeReviewInputSchema = z
  .object({
    audienceResearch: audienceResearchSchema,
    brandReview: brandReviewSchema,
    candidateStrategy: contentStrategySchema,
    reelBrief: reelBriefProjectionSchema,
  })
  .strict();
export const creativeJudgeInputSchema = challengeReviewInputSchema
  .extend({
    challengeReview: challengeReviewSchema,
    company: companyCreativeContextSchema,
  })
  .strict();

export const trendResearchInputSchema = z
  .object({
    company: companyCreativeContextSchema,
    trendEvidence: z
      .array(
        z
          .object({
            evidenceId: boundedText(80),
            observedAt: z.string().datetime().nullable(),
            summary: boundedText(800),
          })
          .strict(),
      )
      .max(20),
  })
  .strict();
export const competitorAnalysisInputSchema = z
  .object({
    company: companyCreativeContextSchema,
    competitorEvidence: z
      .array(
        z
          .object({ evidenceId: boundedText(80), summary: boundedText(800) })
          .strict(),
      )
      .max(20),
  })
  .strict();
export const specialistAssessmentSchema = z
  .object({
    confidence: confidenceSchema,
    evidenceStatus: evidenceStatusSchema,
    findings: boundedList(8, 600),
    recommendations: boundedList(8, 600),
    summary: boundedText(1000),
  })
  .strict();
export const retentionReviewInputSchema = strategicReviewContextSchema;
export const visualDirectionInputSchema = strategicReviewContextSchema;

export const strategicReviewRequestSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    sourceReelBriefVersionId: z.string().uuid(),
  })
  .strict();

export const strategicReviewRunStartSchema = z
  .object({
    runId: z.string().uuid(),
    shouldExecute: z.boolean(),
    status: z.enum(["RUNNING", "SUCCEEDED", "FAILED"]),
  })
  .strict();

export interface StrategicReviewActionState {
  message?: string;
  runId?: string;
  status: "idle" | "error" | "success";
}

export const initialStrategicReviewActionState: StrategicReviewActionState = {
  status: "idle",
};

export function projectReelBrief(input: {
  call_to_action: string;
  caption: string;
  critique: unknown;
  id: string;
  primary_hook: string;
  schema_version: string;
  script_sections: unknown;
  source_reel_idea_id: string;
  spoken_script: string;
  title: string;
  version_number: number;
  visual_directions: unknown;
}) {
  return reelBriefProjectionSchema.parse({
    callToAction: input.call_to_action,
    caption: input.caption,
    critique: input.critique,
    primaryHook: input.primary_hook,
    schemaVersion: input.schema_version,
    scriptSections: input.script_sections,
    sourceReelBriefVersionId: input.id,
    sourceReelIdeaId: input.source_reel_idea_id,
    spokenScript: input.spoken_script,
    title: input.title,
    versionNumber: input.version_number,
    visualDirections: input.visual_directions,
  });
}

export function judgeAddressesEveryChallenge(
  challenge: ChallengeReview,
  review: StrategicCouncilReview,
) {
  const challenged = new Set(
    challenge.challenges.map((item) => item.referenceId),
  );
  const dispositions = new Set(
    review.challengeDispositions.map((item) => item.challengeReferenceId),
  );
  return (
    challenged.size === dispositions.size &&
    [...challenged].every((referenceId) => dispositions.has(referenceId))
  );
}

export type AudienceResearch = z.infer<typeof audienceResearchSchema>;
export type BrandReview = z.infer<typeof brandReviewSchema>;
export type ContentStrategy = z.infer<typeof contentStrategySchema>;
export type ChallengeReview = z.infer<typeof challengeReviewSchema>;
export type StrategicCouncilReview = z.infer<
  typeof strategicCouncilReviewSchema
>;
export type StrategicReviewContext = z.infer<
  typeof strategicReviewContextSchema
>;
