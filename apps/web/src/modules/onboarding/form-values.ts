import {
  competitorsStepSchema,
  companyStepSchema,
  problemStepSchema,
  productStepSchema,
  audienceStepSchema,
  positioningBrandStepSchema,
  marketingStepSchema,
} from "./schemas";
import type { OnboardingStepSlug } from "./steps";
function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}
function values(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .map(String)
    .map((v) => v.trim())
    .filter(Boolean);
}
export function parseOnboardingFields(
  step: OnboardingStepSlug,
  formData: FormData,
) {
  switch (step) {
    case "company":
      return companyStepSchema.parse({
        companyName: value(formData, "companyName"),
        industry: value(formData, "industry"),
        instagram: value(formData, "instagram"),
        primaryMarket: value(formData, "primaryMarket"),
        shortDescription: value(formData, "shortDescription"),
        stage: value(formData, "stage"),
        website: value(formData, "website"),
      });
    case "problem":
      return problemStepSchema.parse({
        affectedAudience: value(formData, "affectedAudience"),
        coreInsight: value(formData, "coreInsight"),
        currentAlternatives: values(formData, "currentAlternatives"),
        problemImportance: value(formData, "problemImportance"),
        problemStatement: value(formData, "problemStatement"),
        startupIdea: value(formData, "startupIdea"),
      });
    case "product":
      return productStepSchema.parse({
        coreCapabilities: values(formData, "coreCapabilities"),
        differentiators: values(formData, "differentiators"),
        nearTermObjective: value(formData, "nearTermObjective"),
        productConcept: value(formData, "productConcept"),
        productStatus: value(formData, "productStatus"),
        valueProposition: value(formData, "valueProposition"),
      });
    case "audience":
      return audienceStepSchema.parse({
        attentionChannels: values(formData, "attentionChannels"),
        characteristics: values(formData, "characteristics"),
        description: value(formData, "description"),
        goals: values(formData, "goals"),
        motivations: values(formData, "motivations"),
        name: value(formData, "name"),
        objections: values(formData, "objections"),
        painPoints: values(formData, "painPoints"),
      });
    case "positioning-brand":
      return positioningBrandStepSchema.parse({
        avoid: values(formData, "avoid"),
        brandStatus: value(formData, "brandStatus"),
        communicationTraits: values(formData, "communicationTraits"),
        desiredEmotions: values(formData, "desiredEmotions"),
        desiredPerception: value(formData, "desiredPerception"),
        emphasize: values(formData, "emphasize"),
        keyPromise: value(formData, "keyPromise"),
        personalityTraits: values(formData, "personalityTraits"),
        positioningCategory: value(formData, "positioningCategory"),
        positioningDifference: value(formData, "positioningDifference"),
        primaryColors: values(formData, "primaryColors"),
        reasonsToBelieve: values(formData, "reasonsToBelieve"),
        statusQuo: value(formData, "statusQuo"),
        toneOfVoice: values(formData, "toneOfVoice"),
        visualDirection: value(formData, "visualDirection"),
      });
    case "marketing":
      return marketingStepSchema.parse({
        contentFocus: values(formData, "contentFocus"),
        desiredAudienceAction: value(formData, "desiredAudienceAction"),
        marketingStage: value(formData, "marketingStage"),
        notes: value(formData, "notes"),
        primaryChannels: values(formData, "primaryChannels"),
        primaryObjective: value(formData, "primaryObjective"),
        secondaryObjectives: values(formData, "secondaryObjectives"),
      });
    case "competitors":
      return competitorsStepSchema.parse({
        competitors: JSON.parse(value(formData, "competitors") || "[]"),
      });
    default:
      throw Error("Invalid step");
  }
}
