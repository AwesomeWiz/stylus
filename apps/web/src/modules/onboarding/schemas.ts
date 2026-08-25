import { z } from "zod";

const requiredShort = (label: string, minimum = 2) =>
  z.string().trim().min(minimum, `${label} is required.`).max(500);
const optionalText = z.string().trim().max(1200).optional().default("");
const textList = z.array(z.string().trim().min(1).max(160)).max(12).default([]);
const requiredTextList = z
  .array(z.string().trim().min(1).max(160))
  .min(1, "Add at least one channel.")
  .max(12);
const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine(
    (value) => !value || z.url().safeParse(value).success,
    "Enter a complete URL.",
  );

export const companyStageValues = [
  "IDEA",
  "VALIDATION",
  "PRE_PRODUCT",
  "MVP",
  "BETA",
  "LAUNCHED",
  "GROWTH",
] as const;
export const productStatusValues = [
  "CONCEPT",
  "RESEARCHING",
  "DESIGNING",
  "BUILDING",
  "TESTING",
  "AVAILABLE",
] as const;
export const brandStatusValues = ["UNDECIDED", "EXPLORING", "DEFINED"] as const;
export const marketingObjectiveValues = [
  "AWARENESS",
  "TRUST",
  "AUTHORITY",
  "AUDIENCE_GROWTH",
  "COMMUNITY",
  "WAITLIST",
  "PRODUCT_EDUCATION",
  "VALIDATION",
  "FUTURE_DEMAND",
] as const;
export const marketingStageValues = [
  "NOT_STARTED",
  "EXPERIMENTING",
  "BUILDING_AUDIENCE",
  "CONSISTENT",
  "SCALING",
] as const;
export const competitorTypeValues = [
  "DIRECT",
  "INDIRECT",
  "ALTERNATIVE",
  "INSPIRATION",
] as const;

export const companyStepSchema = z.object({
  companyName: requiredShort("Company name").max(80),
  industry: requiredShort("Industry").max(80),
  instagram: z.string().trim().max(200),
  primaryMarket: z.string().trim().max(120),
  shortDescription: requiredShort("Short description", 10).max(300),
  stage: z.enum(companyStageValues),
  website: optionalUrl,
});

export const problemStepSchema = z.object({
  affectedAudience: optionalText,
  coreInsight: optionalText,
  currentAlternatives: textList,
  problemImportance: optionalText,
  problemStatement: requiredShort("Problem", 10).max(1200),
  startupIdea: requiredShort("Startup idea", 10).max(1200),
});

export const productStepSchema = z.object({
  coreCapabilities: textList,
  differentiators: textList,
  nearTermObjective: optionalText,
  productConcept: requiredShort("Product concept", 10).max(1200),
  productStatus: z.enum(productStatusValues),
  valueProposition: requiredShort("Value proposition", 10).max(600),
});

export const audienceStepSchema = z.object({
  attentionChannels: textList,
  characteristics: textList,
  description: requiredShort("Audience description", 10).max(500),
  goals: textList,
  motivations: textList,
  name: requiredShort("Audience name").max(80),
  objections: textList,
  painPoints: textList,
});

export const positioningBrandStepSchema = z.object({
  avoid: textList,
  brandStatus: z.enum(brandStatusValues),
  communicationTraits: textList,
  desiredEmotions: textList,
  desiredPerception: optionalText,
  emphasize: textList,
  keyPromise: optionalText,
  personalityTraits: textList,
  positioningCategory: optionalText,
  positioningDifference: requiredShort("Difference", 5).max(600),
  primaryColors: textList,
  reasonsToBelieve: textList,
  statusQuo: optionalText,
  toneOfVoice: textList,
  visualDirection: optionalText,
});

export const marketingStepSchema = z.object({
  contentFocus: textList,
  desiredAudienceAction: optionalText,
  marketingStage: z.enum(marketingStageValues),
  notes: optionalText,
  primaryChannels: requiredTextList,
  primaryObjective: z.enum(marketingObjectiveValues),
  secondaryObjectives: z
    .array(z.enum(marketingObjectiveValues))
    .max(8)
    .default([]),
});

export const competitorSchema = z.object({
  id: z.uuid().optional(),
  instagram: z.string().trim().max(300).default(""),
  name: requiredShort("Competitor name").max(120),
  relevance: optionalText,
  shortDescription: optionalText,
  type: z.enum(competitorTypeValues),
  website: optionalUrl,
});

export const competitorsStepSchema = z.object({
  competitors: z.array(competitorSchema).max(20, "Add at most 20 competitors."),
});

export type OnboardingActionState = {
  fieldErrors?: Record<string, string[]>;
  message?: string;
  status: "idle" | "error";
};

export const initialOnboardingActionState: OnboardingActionState = {
  status: "idle",
};
