import { z } from "zod";

import type { CompanyKnowledge } from "@/modules/memory/company-knowledge";

import {
  competitorReelAnalysisSchema,
  type CompetitorReelAnalysis,
} from "./reel-analysis";

export const CREATIVE_COUNCIL_WORKFLOW_VERSION = "creative-council-v1";
export const CREATIVE_COUNCIL_SCHEMA_VERSION = "reel-brief-v1";
export const MAX_COUNCIL_COMPETITOR_ANALYSES = 3;
export const MAX_COMPANY_CONTEXT_CHARS = 20_000;
export const MAX_COMPETITOR_EVIDENCE_CHARS = 12_000;
export const MAX_REEL_IDEA_CONTEXT_CHARS = 6_000;

const shortText = z.string().trim().min(1).max(500);
const assessmentSchema = z
  .object({
    rating: z.enum(["STRONG", "ACCEPTABLE", "WEAK"]),
    summary: z.string().trim().min(1).max(800),
  })
  .strict();

export const hookStrategySchema = z
  .object({
    alternateHooks: z.array(z.string().trim().min(1).max(400)).max(2),
    assumptions: z.array(z.string().trim().min(1).max(300)).max(5),
    audienceTension: z.string().trim().min(1).max(600),
    confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
    evidenceSummary: z.string().trim().min(1).max(800),
    primaryHook: z.string().trim().min(1).max(500),
    rationale: z.string().trim().min(1).max(800),
  })
  .strict();

export const reelScriptSectionSchema = z
  .object({
    endSecond: z.number().min(0).max(180),
    purpose: z.string().trim().min(1).max(120),
    script: z.string().trim().min(1).max(1200),
    startSecond: z.number().min(0).max(180),
  })
  .strict()
  .refine(
    (section) => section.endSecond >= section.startSecond,
    "Section end must not precede its start.",
  );

export const reelScriptSchema = z
  .object({
    callToAction: z.string().trim().min(1).max(500),
    caption: z.string().trim().min(1).max(1800),
    chosenHook: z.string().trim().min(1).max(500),
    sections: z.array(reelScriptSectionSchema).min(1).max(8),
    spokenScript: z.string().trim().min(1).max(5000),
    visualDirections: z.array(shortText).max(8),
  })
  .strict();

export const creativeCritiqueSchema = z
  .object({
    audienceFit: assessmentSchema,
    brandFit: assessmentSchema,
    confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
    originality: assessmentSchema,
    recommendations: z.array(z.string().trim().min(1).max(400)).max(6),
    risks: z.array(z.string().trim().min(1).max(400)).max(6),
    strengths: z.array(z.string().trim().min(1).max(400)).max(6),
    verdict: z.enum(["STRONG", "VIABLE", "NEEDS_WORK"]),
    weaknesses: z.array(z.string().trim().min(1).max(400)).max(6),
  })
  .strict();

export const reelIdeaContextSchema = z
  .object({
    callToAction: z.string().max(500).nullable(),
    concept: z.string().max(2000).nullable(),
    contentAngle: z.string().max(1000).nullable(),
    hook: z.string().max(1000).nullable(),
    notes: z.string().max(1000).nullable(),
    sourceReelIdeaId: z.string().uuid(),
    status: z.enum(["IDEA", "DRAFT", "READY"]),
    title: z.string().min(1).max(160),
  })
  .strict();

const boundedCompanySectionSchema = z
  .record(z.string(), z.unknown())
  .nullable();
export const companyCreativeContextSchema = z
  .object({
    audience: boundedCompanySectionSchema,
    brand: boundedCompanySectionSchema,
    identity: boundedCompanySectionSchema,
    marketing: boundedCompanySectionSchema,
    positioning: boundedCompanySectionSchema,
    problem: boundedCompanySectionSchema,
    product: boundedCompanySectionSchema,
  })
  .strict();

export const competitorEvidenceSchema = z
  .object({
    analysisId: z.string().uuid(),
    analysisVersion: z.number().int().min(1).max(10_000),
    cautions: z.array(z.string().max(300)).max(4),
    hookExplanation: z.string().max(600),
    hookType: z.string().max(120),
    pacingAnalysis: z.string().max(600),
    reusablePatterns: z.array(z.string().max(300)).max(4),
    scriptStructure: z
      .array(
        z
          .object({
            label: z.enum(["HOOK", "SETUP", "VALUE", "PAYOFF", "CTA", "OTHER"]),
            observation: z.string().max(300),
          })
          .strict(),
      )
      .max(6),
    transcriptPatternObservations: z.array(z.string().max(300)).max(4),
    visualMetrics: z
      .object({
        averageSceneDuration: z.number().min(0).max(180),
        cutsPerMinute: z.number().min(0).max(1000),
        sceneCount: z.number().int().min(0).max(20),
      })
      .strict(),
  })
  .strict();

export const creativeCouncilContextSchema = z
  .object({
    company: companyCreativeContextSchema,
    competitorEvidence: z
      .array(competitorEvidenceSchema)
      .max(MAX_COUNCIL_COMPETITOR_ANALYSES),
    reelIdea: reelIdeaContextSchema,
  })
  .strict();

export const creativeCouncilRequestSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    selectedAnalysisIds: z
      .array(z.string().uuid())
      .max(MAX_COUNCIL_COMPETITOR_ANALYSES)
      .transform((ids) => [...new Set(ids)]),
    sourceReelIdeaId: z.string().uuid(),
  })
  .strict();

export const creativeCouncilRunStartSchema = z
  .object({
    runId: z.string().uuid(),
    shouldExecute: z.boolean(),
    status: z.enum(["RUNNING", "SUCCEEDED", "FAILED"]),
  })
  .strict();

export type HookStrategy = z.infer<typeof hookStrategySchema>;
export type ReelScript = z.infer<typeof reelScriptSchema>;
export type CreativeCritique = z.infer<typeof creativeCritiqueSchema>;
export type ReelIdeaContext = z.infer<typeof reelIdeaContextSchema>;
export type CompanyCreativeContext = z.infer<
  typeof companyCreativeContextSchema
>;
export type CompetitorEvidence = z.infer<typeof competitorEvidenceSchema>;
export type CreativeCouncilContext = z.infer<
  typeof creativeCouncilContextSchema
>;

export interface CreativeCouncilActionState {
  message?: string;
  runId?: string;
  status: "idle" | "error" | "success";
}

export const initialCreativeCouncilActionState: CreativeCouncilActionState = {
  status: "idle",
};

function truncate(value: string | null | undefined, max: number) {
  return value ? value.trim().slice(0, max) : null;
}

function strings(value: unknown, count = 8, max = 240) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .slice(0, count)
        .map((item) => item.trim().slice(0, max))
        .filter(Boolean)
    : [];
}

export function projectReelIdea(input: {
  call_to_action: string | null;
  concept: string | null;
  content_angle: string | null;
  hook: string | null;
  id: string;
  notes: string | null;
  status: "IDEA" | "DRAFT" | "READY";
  title: string;
}): ReelIdeaContext {
  const projected = reelIdeaContextSchema.parse({
    callToAction: truncate(input.call_to_action, 500),
    concept: truncate(input.concept, 2000),
    contentAngle: truncate(input.content_angle, 1000),
    hook: truncate(input.hook, 1000),
    notes: truncate(input.notes, 1000),
    sourceReelIdeaId: input.id,
    status: input.status,
    title: input.title.trim().slice(0, 160),
  });
  if (JSON.stringify(projected).length > MAX_REEL_IDEA_CONTEXT_CHARS)
    throw new Error("reel_idea_context_too_large");
  return projected;
}

export function projectCompanyCreativeContext(
  knowledge: CompanyKnowledge,
): CompanyCreativeContext {
  const { sections } = knowledge;
  const projected = companyCreativeContextSchema.parse({
    audience: sections.audience
      ? {
          attentionChannels: strings(sections.audience.attentionChannels),
          description: truncate(sections.audience.description, 1000),
          goals: strings(sections.audience.goals),
          motivations: strings(sections.audience.motivations),
          objections: strings(sections.audience.objections),
          painPoints: strings(sections.audience.painPoints),
        }
      : null,
    brand: sections.brand
      ? {
          avoid: strings(sections.brand.avoid),
          emphasize: strings(sections.brand.emphasize),
          personalityTraits: strings(sections.brand.personalityTraits),
          toneOfVoice: strings(sections.brand.toneOfVoice),
          visualDirection: truncate(sections.brand.visualDirection, 800),
        }
      : null,
    identity: sections.identity
      ? {
          companyName: truncate(sections.identity.companyName, 160),
          industry: truncate(sections.identity.industry, 160),
          primaryMarket: truncate(sections.identity.primaryMarket, 400),
          shortDescription: truncate(sections.identity.shortDescription, 1000),
          stage: sections.identity.stage,
        }
      : null,
    marketing: sections.marketing
      ? {
          contentFocus: strings(sections.marketing.contentFocus),
          desiredAudienceAction: truncate(
            sections.marketing.desiredAudienceAction,
            600,
          ),
          primaryObjective: sections.marketing.primaryObjective,
          secondaryObjectives: strings(sections.marketing.secondaryObjectives),
        }
      : null,
    positioning: sections.positioning
      ? {
          desiredPerception: truncate(
            sections.positioning.desiredPerception,
            600,
          ),
          difference: truncate(sections.positioning.difference, 800),
          keyPromise: truncate(sections.positioning.keyPromise, 600),
          reasonsToBelieve: strings(sections.positioning.reasonsToBelieve),
        }
      : null,
    problem: sections.problem
      ? {
          affectedAudience: truncate(sections.problem.affectedAudience, 800),
          coreInsight: truncate(sections.problem.coreInsight, 800),
          importance: truncate(sections.problem.importance, 800),
          statement: truncate(sections.problem.statement, 1000),
          startupIdea: truncate(sections.problem.startupIdea, 1000),
        }
      : null,
    product: sections.product
      ? {
          capabilities: strings(sections.product.capabilities),
          concept: truncate(sections.product.concept, 1000),
          differentiators: strings(sections.product.differentiators),
          nearTermObjective: truncate(sections.product.nearTermObjective, 800),
          valueProposition: truncate(sections.product.valueProposition, 1000),
        }
      : null,
  });
  if (JSON.stringify(projected).length > MAX_COMPANY_CONTEXT_CHARS)
    throw new Error("company_context_too_large");
  return projected;
}

export function projectCompetitorEvidence(input: {
  analysisId: string;
  analysisVersion: number;
  structuredResult: unknown;
}): CompetitorEvidence {
  const result: CompetitorReelAnalysis = competitorReelAnalysisSchema.parse(
    input.structuredResult,
  );
  return competitorEvidenceSchema.parse({
    analysisId: input.analysisId,
    analysisVersion: input.analysisVersion,
    cautions: result.cautions_or_limitations
      .slice(0, 4)
      .map((item) => item.slice(0, 300)),
    hookExplanation: result.hook_explanation.slice(0, 600),
    hookType: result.hook_type.slice(0, 120),
    pacingAnalysis: result.pacing_analysis.slice(0, 600),
    reusablePatterns: result.reusable_patterns
      .slice(0, 4)
      .map((item) => item.slice(0, 300)),
    scriptStructure: result.script_structure.slice(0, 6).map((section) => ({
      label: section.label,
      observation: section.observation.slice(0, 300),
    })),
    transcriptPatternObservations: result.transcript_pattern_observations
      .slice(0, 4)
      .map((item) => item.slice(0, 300)),
    visualMetrics: {
      averageSceneDuration: result.visual_metrics.average_scene_duration,
      cutsPerMinute: result.visual_metrics.cuts_per_minute,
      sceneCount: result.visual_metrics.scene_count,
    },
  });
}

export function resolveSelectedCompetitorEvidence(input: {
  analyses: readonly {
    analysis_version: number;
    completed_at: string | null;
    competitor_reel_id: string;
    id: string;
    organization_id: string;
    status: string;
    structured_result: unknown;
  }[];
  competitors: readonly {
    archived_at: string | null;
    id: string;
    organization_id: string;
  }[];
  organizationId: string;
  reels: readonly {
    archived_at: string | null;
    id: string;
    marketing_competitor_id: string;
    organization_id: string;
  }[];
  selectedAnalysisIds: readonly string[];
}) {
  const analysisById = new Map(input.analyses.map((item) => [item.id, item]));
  const reelById = new Map(input.reels.map((item) => [item.id, item]));
  const competitorById = new Map(
    input.competitors.map((item) => [item.id, item]),
  );
  const evidence = input.selectedAnalysisIds.map((analysisId) => {
    const analysis = analysisById.get(analysisId);
    const reel = analysis
      ? reelById.get(analysis.competitor_reel_id)
      : undefined;
    const competitor = reel
      ? competitorById.get(reel.marketing_competitor_id)
      : undefined;
    if (
      !analysis ||
      analysis.organization_id !== input.organizationId ||
      analysis.status !== "ANALYZED" ||
      !analysis.completed_at ||
      !analysis.structured_result ||
      !reel ||
      reel.organization_id !== input.organizationId ||
      reel.archived_at !== null ||
      !competitor ||
      competitor.organization_id !== input.organizationId ||
      competitor.archived_at !== null
    )
      throw new Error("competitor_analysis_ineligible");
    return projectCompetitorEvidence({
      analysisId,
      analysisVersion: analysis.analysis_version,
      structuredResult: analysis.structured_result,
    });
  });
  assertCompetitorEvidenceBounded(evidence);
  return evidence;
}

export function assertCompetitorEvidenceBounded(
  evidence: readonly CompetitorEvidence[],
) {
  if (evidence.length > MAX_COUNCIL_COMPETITOR_ANALYSES)
    throw new Error("too_many_competitor_analyses");
  if (JSON.stringify(evidence).length > MAX_COMPETITOR_EVIDENCE_CHARS)
    throw new Error("competitor_evidence_too_large");
}
