import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
const safeUrl = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//i.test(value), "Use an HTTP or HTTPS URL.");
const optionalUrl = optionalText(500).pipe(safeUrl.nullable());
const id = z.string().uuid();
const optionalId = z
  .string()
  .trim()
  .transform((v) => v || null)
  .pipe(z.string().uuid().nullable());

export interface MarketingActionState {
  fieldErrors?: Record<string, string[]>;
  message?: string;
  status: "idle" | "error" | "success";
}
export const initialMarketingActionState: MarketingActionState = {
  status: "idle",
};

export const competitorSchema = z.object({
  recordId: optionalId,
  name: z.string().trim().min(1).max(120),
  websiteUrl: optionalUrl,
  instagramHandle: optionalText(80),
  instagramProfileUrl: optionalUrl,
  notes: optionalText(4000),
  coreCompetitorId: optionalId,
});

export const campaignSchema = z
  .object({
    recordId: optionalId,
    name: z.string().trim().min(1).max(120),
    objective: z.string().trim().min(1).max(1000),
    notes: optionalText(4000),
    startsOn: optionalText(10),
    endsOn: optionalText(10),
    status: z.enum(["PLANNING", "ACTIVE", "PAUSED", "COMPLETED"]),
  })
  .superRefine((value, context) => {
    if (value.startsOn && value.endsOn && value.endsOn < value.startsOn)
      context.addIssue({
        code: "custom",
        message: "End date cannot precede start date.",
        path: ["endsOn"],
      });
  });

export const reelIdeaSchema = z.object({
  recordId: optionalId,
  title: z.string().trim().min(1).max(160),
  concept: optionalText(2000),
  hook: optionalText(1000),
  contentAngle: optionalText(1000),
  callToAction: optionalText(500),
  notes: optionalText(4000),
  status: z.enum(["IDEA", "DRAFT", "READY"]),
  campaignId: optionalId,
});

export const researchSchema = z.object({
  recordId: optionalId,
  title: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1).max(8000),
  sourceLabel: optionalText(160),
  sourceUrl: optionalUrl,
  category: z.enum(["CUSTOMER", "COMPETITOR", "TREND", "CONTENT", "OTHER"]),
});

export const briefSchema = z.object({
  recordId: optionalId,
  title: z.string().trim().min(1).max(160),
  objective: z.string().trim().min(1).max(1200),
  targetAudience: optionalText(1200),
  coreMessage: optionalText(1200),
  toneDirection: optionalText(1000),
  callToAction: optionalText(500),
  visualDirection: optionalText(1500),
  notes: optionalText(4000),
  status: z.enum(["DRAFT", "READY", "APPROVED"]),
  campaignId: optionalId,
});

export const lifecycleSchema = z.object({
  recordId: id,
  archived: z.enum(["true", "false"]).transform((v) => v === "true"),
});
