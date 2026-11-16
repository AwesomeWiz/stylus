import { z } from "zod";

export const hypothesisStatuses = [
  "DRAFT",
  "READY_TO_TEST",
  "TESTING",
  "SUPPORTED",
  "NOT_SUPPORTED",
  "INCONCLUSIVE",
] as const;
export const experimentStatuses = [
  "DRAFT",
  "PLANNED",
  "RUNNING",
  "EVALUATING",
  "COMPLETE",
  "CANCELLED",
] as const;
export const growthOutcomes = [
  "SUPPORTED",
  "NOT_SUPPORTED",
  "INCONCLUSIVE",
] as const;
export const growthConfidence = ["LOW", "MEDIUM", "HIGH"] as const;
export const growthLinkKinds = [
  "task",
  "campaign",
  "reel-idea",
  "creative-brief",
  "reel-brief",
  "snapshot",
  "performance-learning",
] as const;
export type GrowthLinkKind = (typeof growthLinkKinds)[number];
export type GrowthKind = "hypothesis" | "experiment" | "learning";
const optionalId = z.union([z.uuid(), z.literal("")]).default("");
const date = z.union([z.iso.date(), z.literal("")]).default("");
export const hypothesisFields = z
  .object({
    title: z.string().trim().min(2).max(160),
    statement: z.string().trim().min(2).max(4000),
    status: z.enum(hypothesisStatuses).default("DRAFT"),
    confidence: z.union([z.enum(growthConfidence), z.literal("")]).default(""),
    ownerId: optionalId,
    archived: z.boolean().default(false),
  })
  .strict();
export const experimentFields = z
  .object({
    title: z.string().trim().min(2).max(160),
    hypothesisId: z.uuid(),
    testPlan: z.string().trim().max(4000).default(""),
    successCriteria: z.string().trim().max(2000).default(""),
    status: z.enum(experimentStatuses).default("DRAFT"),
    ownerId: optionalId,
    startsOn: date,
    endsOn: date,
    archived: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      ["RUNNING", "EVALUATING", "COMPLETE"].includes(value.status) &&
      !value.successCriteria
    )
      ctx.addIssue({
        code: "custom",
        path: ["successCriteria"],
        message: "Define success or evaluation criteria before running.",
      });
    if (value.startsOn && value.endsOn && value.endsOn < value.startsOn)
      ctx.addIssue({
        code: "custom",
        path: ["endsOn"],
        message: "End date must follow start date.",
      });
  });
export const learningFields = z
  .object({
    title: z.string().trim().min(2).max(160),
    conclusion: z.string().trim().min(2).max(4000),
    confidence: z.enum(growthConfidence).default("MEDIUM"),
    archived: z.boolean().default(false),
  })
  .strict();
export const hypothesisSourceSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("evidence"),
      id: z.uuid(),
      runId: z.uuid(),
      evidenceKey: z
        .string()
        .regex(/^EVID-[1-9][0-9]*$/)
        .max(24),
    })
    .strict(),
  z.object({ kind: z.literal("note"), id: z.uuid() }).strict(),
  z
    .object({
      kind: z.literal("opportunity"),
      id: z.uuid(),
      index: z.number().int().min(0).max(3),
    })
    .strict(),
]);
export type HypothesisSource = z.infer<typeof hypothesisSourceSchema>;
const revision = z.string().datetime({ offset: true }).nullable();
export const growthMutationSchema = z.discriminatedUnion("operation", [
  z
    .object({
      operation: z.literal("hypothesis"),
      id: z.uuid(),
      fields: hypothesisFields,
      revision,
      source: hypothesisSourceSchema.nullable().optional(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("experiment"),
      id: z.uuid(),
      fields: experimentFields,
      revision,
    })
    .strict(),
  z
    .object({
      operation: z.literal("learning"),
      id: z.uuid(),
      experimentId: z.uuid(),
      fields: learningFields,
      revision,
    })
    .strict(),
  z
    .object({
      operation: z.literal("source"),
      hypothesisId: z.uuid(),
      source: hypothesisSourceSchema,
      archived: z.boolean().default(false),
    })
    .strict(),
  z
    .object({
      operation: z.literal("link"),
      experimentId: z.uuid(),
      kind: z.enum(growthLinkKinds),
      targetId: z.uuid(),
      archived: z.boolean().default(false),
    })
    .strict(),
  z
    .object({
      operation: z.literal("evaluate"),
      experimentId: z.uuid(),
      outcome: z.enum(growthOutcomes),
      resultSummary: z.string().trim().min(2).max(4000),
      revision: revision.unwrap(),
      updateHypothesis: z.boolean().default(false),
      learning: learningFields
        .omit({ archived: true })
        .extend({ id: z.uuid() })
        .nullable(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("promote"),
      learningId: z.uuid(),
      kind: z.enum(["FACT", "DECISION", "INSIGHT", "PREFERENCE", "NOTE"]),
      title: z.string().trim().min(2).max(160),
      content: z.string().trim().min(1).max(10000),
    })
    .strict(),
]);
export type GrowthMutation = z.infer<typeof growthMutationSchema>;
export const growthRoutes = {
  hypothesis: "/apps/marketing/hypotheses",
  experiment: "/apps/marketing/experiments",
  learning: "/apps/marketing/learn",
} as const;
export const growthLabel = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (s) => s.toUpperCase());
export type {
  GrowthRow,
  HypothesisSourceRow,
  ExperimentLinkRow,
} from "@/lib/supabase/database.types";
export const growthLinkColumn = {
  task: "task_id",
  campaign: "campaign_id",
  "reel-idea": "reel_idea_id",
  "creative-brief": "creative_brief_id",
  "reel-brief": "reel_brief_version_id",
  snapshot: "performance_snapshot_id",
  "performance-learning": "performance_learning_id",
} as const;
