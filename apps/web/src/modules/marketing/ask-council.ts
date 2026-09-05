import { z } from "zod";

import { companyCreativeContextSchema } from "./creative-council";

export const ASK_COUNCIL_ROUTING_VERSION =
  "marketing-ask-council-routing-v1" as const;
export const ASK_COUNCIL_CONTEXT_VERSION =
  "marketing-ask-council-context-v1" as const;
export const ASK_COUNCIL_RESEARCH_SELECTION_VERSION =
  "marketing-ask-council-research-relevance-v2" as const;
export const ASK_COUNCIL_WORKFLOW_VERSION = "marketing-ask-council-v1" as const;
export const ASK_COUNCIL_SCHEMA_VERSION =
  "marketing-ask-council-answer-v1" as const;

export const askCouncilLimits = Object.freeze({
  companyCharacters: 12_000,
  conversationHistoryMessages: 6,
  evidenceCharacters: 1_200,
  performanceLearnings: 4,
  priorMessageCharacters: 2_000,
  questionCharacters: 2_000,
  reelBriefs: 1,
  researchEvidence: 6,
  researchReports: 2,
  specialistCalls: 3,
  specialistOutputTokens: 900,
  strategicReviews: 1,
  synthesisOutputTokens: 1_500,
  totalCalls: 4,
  totalContextCharacters: 32_000,
  workflowTimeoutMs: 55_000,
});

export const askCouncilIntents = [
  "AUDIENCE",
  "CONTENT_IDEA",
  "HOOK",
  "SCRIPT",
  "BRAND",
  "PERFORMANCE",
  "RESEARCH_EVIDENCE",
  "TREND",
  "COMPETITOR",
  "RETENTION",
  "VISUAL",
  "GENERAL_MARKETING",
] as const;
export const askCouncilIntentSchema = z.enum(askCouncilIntents);
export type AskCouncilIntent = z.infer<typeof askCouncilIntentSchema>;

export const askCouncilSpecialistIds = [
  "marketing.audience-researcher",
  "marketing.hook-strategist",
  "marketing.script-writer",
  "marketing.brand-director",
  "marketing.retention-editor",
  "marketing.visual-director",
  "marketing.competitor-analyst",
  "marketing.trend-researcher",
  "marketing.content-strategist",
  "marketing.creative-critic",
] as const;
export const askCouncilSpecialistIdSchema = z.enum(askCouncilSpecialistIds);
export type AskCouncilSpecialistId = z.infer<
  typeof askCouncilSpecialistIdSchema
>;

const specialistsByIntent = {
  AUDIENCE: ["marketing.audience-researcher", "marketing.content-strategist"],
  BRAND: ["marketing.brand-director", "marketing.creative-critic"],
  COMPETITOR: ["marketing.competitor-analyst", "marketing.content-strategist"],
  CONTENT_IDEA: [
    "marketing.content-strategist",
    "marketing.audience-researcher",
  ],
  GENERAL_MARKETING: [
    "marketing.content-strategist",
    "marketing.brand-director",
  ],
  HOOK: ["marketing.hook-strategist", "marketing.audience-researcher"],
  PERFORMANCE: ["marketing.content-strategist", "marketing.creative-critic"],
  RESEARCH_EVIDENCE: [
    "marketing.audience-researcher",
    "marketing.content-strategist",
  ],
  RETENTION: ["marketing.retention-editor", "marketing.creative-critic"],
  SCRIPT: ["marketing.script-writer", "marketing.brand-director"],
  TREND: ["marketing.trend-researcher", "marketing.content-strategist"],
  VISUAL: ["marketing.visual-director", "marketing.brand-director"],
} as const satisfies Record<
  AskCouncilIntent,
  readonly AskCouncilSpecialistId[]
>;

const intentKeywords: ReadonlyArray<
  readonly [AskCouncilIntent, readonly string[]]
> = [
  [
    "PERFORMANCE",
    ["performance", "save rate", "reach", "engagement", "learned"],
  ],
  ["RESEARCH_EVIDENCE", ["evidence", "research", "source", "shoppers", "data"]],
  [
    "AUDIENCE",
    ["audience", "customer", "shopper", "pain", "language", "desire"],
  ],
  ["HOOK", ["hook", "opening", "first line", "scroll stop"]],
  ["SCRIPT", ["script", "voiceover", "spoken", "scene"]],
  ["BRAND", ["brand", "positioning", "tone", "voice", "on-brand"]],
  ["TREND", ["trend", "growing interest", "emerging"]],
  ["COMPETITOR", ["competitor", "competitive", "rival"]],
  ["RETENTION", ["retention", "watch time", "pacing", "drop-off"]],
  ["VISUAL", ["visual", "shot", "composition", "b-roll"]],
  [
    "CONTENT_IDEA",
    ["content idea", "reel direction", "what reel", "angle", "concept"],
  ],
];

export function routeAskCouncilIntent(
  question: string,
  requestedIntent?: AskCouncilIntent | "AUTO",
) {
  if (requestedIntent && requestedIntent !== "AUTO") return requestedIntent;
  const normalized = question.toLocaleLowerCase("en-US");
  return (
    intentKeywords.find(([, keywords]) =>
      keywords.some((keyword) => normalized.includes(keyword)),
    )?.[0] ?? "GENERAL_MARKETING"
  );
}

export function selectAskCouncilSpecialists(intent: AskCouncilIntent) {
  return [...specialistsByIntent[intent]].slice(
    0,
    askCouncilLimits.specialistCalls,
  );
}

const optionalId = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.uuid().nullable(),
);

export const askCouncilRequestSchema = z
  .object({
    conversationId: optionalId,
    idempotencyKey: z.uuid(),
    intent: z.union([z.literal("AUTO"), askCouncilIntentSchema]),
    performanceLearningIds: z
      .array(z.uuid())
      .max(askCouncilLimits.performanceLearnings),
    question: z.string().trim().min(3).max(askCouncilLimits.questionCharacters),
    reelBriefVersionId: optionalId,
    researchReportId: optionalId,
    strategicReviewId: optionalId,
  })
  .strict();
export type AskCouncilRequest = z.infer<typeof askCouncilRequestSchema>;

const boundedText = (max: number) => z.string().trim().min(1).max(max);
const modelReferenceSchema = z
  .string()
  .regex(/^(?:CTX-COMPANY|RESEARCH|EVID|PERF|BRIEF|REVIEW)-[1-9][0-9]*$/);

export const askCouncilResearchEvidenceSchema = z
  .object({
    evidenceType: boundedText(40),
    excerpt: boundedText(askCouncilLimits.evidenceCharacters),
    modelReferenceId: modelReferenceSchema,
    title: z.string().trim().max(200).nullable(),
  })
  .strict();

export const askCouncilResearchContextSchema = z
  .object({
    evidence: z
      .array(askCouncilResearchEvidenceSchema)
      .max(askCouncilLimits.researchEvidence),
    limitations: z.array(boundedText(300)).max(4),
    modelReferenceId: modelReferenceSchema,
    summary: boundedText(1_200),
    title: boundedText(200),
  })
  .strict();

export const askCouncilPerformanceContextSchema = z
  .object({
    algorithmVersion: boundedText(100),
    baselineSampleCount: z.number().int().min(1).max(100),
    baselineValue: z.number().finite().nonnegative(),
    caveats: z.array(boundedText(400)).min(1).max(4),
    difference: z.number().finite(),
    evidenceStrength: z.enum(["WEAK", "MODERATE", "STRONG"]),
    horizon: z.enum(["EARLY", "SHORT_TERM", "SEVEN_DAY", "MATURE"]),
    metric: z.literal("SAVE_RATE_BY_REACH"),
    modelReferenceId: modelReferenceSchema,
    sampleCount: z.number().int().min(1).max(100),
    segmentValue: z.number().finite().nonnegative(),
    subjectValue: boundedText(80),
    summary: boundedText(800),
  })
  .strict();

export const askCouncilBriefContextSchema = z
  .object({
    callToAction: boundedText(500),
    modelReferenceId: modelReferenceSchema,
    primaryHook: boundedText(1_000),
    schemaVersion: boundedText(100),
    title: boundedText(200),
    versionNumber: z.number().int().positive().max(10_000),
  })
  .strict();

export const askCouncilStrategicReviewContextSchema = z
  .object({
    modelReferenceId: modelReferenceSchema,
    schemaVersion: boundedText(100),
    summary: boundedText(1_500),
    versionNumber: z.number().int().positive().max(10_000),
  })
  .strict();

export const askCouncilHistoryMessageSchema = z
  .object({
    content: boundedText(askCouncilLimits.priorMessageCharacters),
    role: z.enum(["USER", "ASSISTANT"]),
  })
  .strict();

export const askCouncilContextSchema = z
  .object({
    company: companyCreativeContextSchema,
    companyModelReferenceId: z.literal("CTX-COMPANY-1"),
    history: z
      .array(askCouncilHistoryMessageSchema)
      .max(askCouncilLimits.conversationHistoryMessages),
    performance: z
      .array(askCouncilPerformanceContextSchema)
      .max(askCouncilLimits.performanceLearnings),
    reelBrief: askCouncilBriefContextSchema.nullable(),
    research: z
      .array(askCouncilResearchContextSchema)
      .max(askCouncilLimits.researchReports),
    strategicReview: askCouncilStrategicReviewContextSchema.nullable(),
  })
  .strict();
export type AskCouncilContext = z.infer<typeof askCouncilContextSchema>;

export const askCouncilTurnStartSchema = z
  .object({
    conversationId: z.uuid(),
    shouldExecute: z.boolean(),
    status: z.enum(["PENDING", "SUCCEEDED", "FAILED"]),
    turnId: z.uuid(),
    userMessageId: z.uuid(),
  })
  .strict();

export function listAskCouncilContextReferenceIds(context: AskCouncilContext) {
  return [
    context.companyModelReferenceId,
    ...context.research.flatMap((report) => [
      report.modelReferenceId,
      ...report.evidence.map((evidence) => evidence.modelReferenceId),
    ]),
    ...context.performance.map((learning) => learning.modelReferenceId),
    ...(context.reelBrief ? [context.reelBrief.modelReferenceId] : []),
    ...(context.strategicReview
      ? [context.strategicReview.modelReferenceId]
      : []),
  ];
}

function referenceArraySchema(referenceIds: readonly string[], max: number) {
  if (!referenceIds.length) return z.array(z.string()).max(0);
  const [first, ...rest] = referenceIds;
  return z.array(z.enum([first!, ...rest])).max(max);
}

export function createAskCouncilSpecialistOutputSchema(
  referenceIds: readonly string[],
) {
  return z
    .object({
      assumptions: z.array(boundedText(300)).max(3),
      perspective: boundedText(1_000),
      recommendation: boundedText(1_200),
      risks: z.array(boundedText(300)).max(3),
      suggestedNextStep: boundedText(300),
      supportingReferenceIds: referenceArraySchema(referenceIds, 6),
      uncertainty: boundedText(400),
    })
    .strict();
}

export function createAskCouncilAnswerSchema(referenceIds: readonly string[]) {
  return z
    .object({
      answer: boundedText(2_500),
      disagreements: z.array(boundedText(500)).max(4),
      keyRecommendations: z.array(boundedText(500)).min(1).max(5),
      suggestedNextSteps: z.array(boundedText(300)).max(4),
      supportingReferenceIds: referenceArraySchema(referenceIds, 10),
      uncertainties: z.array(boundedText(400)).max(4),
    })
    .strict();
}

export type AskCouncilSpecialistOutput = z.infer<
  ReturnType<typeof createAskCouncilSpecialistOutputSchema>
>;
export type AskCouncilAnswer = z.infer<
  ReturnType<typeof createAskCouncilAnswerSchema>
>;

export function assertAskCouncilReferences(
  references: readonly string[],
  allowedReferences: readonly string[],
) {
  const allowed = new Set(allowedReferences);
  if (
    new Set(references).size !== references.length ||
    references.some((reference) => !allowed.has(reference))
  )
    throw new Error("ask_council_invalid_reference");
}

export interface AskCouncilActionState {
  conversationId?: string;
  message?: string;
  status: "idle" | "error" | "success";
  turnId?: string;
}

export const initialAskCouncilActionState: AskCouncilActionState = {
  status: "idle",
};
