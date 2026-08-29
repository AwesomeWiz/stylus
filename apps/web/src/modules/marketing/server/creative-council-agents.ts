import "server-only";

import { z } from "zod";

import type { AILogicalTier } from "@/core/ai/public";

import {
  companyCreativeContextSchema,
  competitorEvidenceSchema,
  creativeCouncilContextSchema,
  creativeCritiqueSchema,
  hookStrategySchema,
  reelIdeaContextSchema,
  reelScriptSchema,
} from "../creative-council";
import {
  audienceResearchInputSchema,
  audienceResearchSchema,
  brandReviewInputSchema,
  brandReviewSchema,
  challengeReviewInputSchema,
  challengeReviewSchema,
  competitorAnalysisInputSchema,
  contentStrategyInputSchema,
  contentStrategySchema,
  creativeJudgeInputSchema,
  retentionReviewInputSchema,
  specialistAssessmentSchema,
  strategicCouncilReviewSchema,
  STRATEGIC_REVIEW_CALL_TIMEOUT_MS,
  trendResearchInputSchema,
  visualDirectionInputSchema,
} from "../strategic-review";

export const CREATIVE_COUNCIL_CAPABILITY = "marketing.creative-council.execute";

type CouncilAgentId =
  | "marketing.hook-strategist"
  | "marketing.script-writer"
  | "marketing.creative-critic"
  | "marketing.audience-researcher"
  | "marketing.trend-researcher"
  | "marketing.competitor-analyst"
  | "marketing.content-strategist"
  | "marketing.retention-editor"
  | "marketing.visual-director"
  | "marketing.brand-director"
  | "marketing.creative-judge"
  | "marketing.challenge-reviewer";

export interface CreativeCouncilAgentDefinition {
  allowedMemoryDomains: readonly [];
  displayName: string;
  failureSemantics: "STOP_WORKFLOW";
  id: CouncilAgentId;
  inputSchema: z.ZodType;
  maxOutputTokens: number;
  purpose: string;
  schema: z.ZodType;
  schemaName: string;
  systemInstruction: string;
  tier: AILogicalTier;
  timeoutMs: number;
  tools: readonly [];
  workflowEligibility: readonly string[];
}

const scriptInputSchema = z
  .object({
    company: companyCreativeContextSchema,
    competitorEvidence: z.array(competitorEvidenceSchema).max(3),
    hookStrategy: hookStrategySchema,
    reelIdea: reelIdeaContextSchema,
  })
  .strict();
const criticInputSchema = scriptInputSchema
  .extend({ script: reelScriptSchema })
  .strict();

function defineAgent<const T extends CreativeCouncilAgentDefinition>(
  definition: T,
) {
  return definition;
}

export const creativeCouncilAgents = {
  CRITIQUE: defineAgent({
    allowedMemoryDomains: [],
    displayName: "Creative Critic",
    failureSemantics: "STOP_WORKFLOW",
    id: "marketing.creative-critic",
    inputSchema: criticInputSchema,
    maxOutputTokens: 1_100,
    purpose:
      "Evaluate the original creative package for audience, brand, objective, and differentiation fit.",
    schema: creativeCritiqueSchema,
    schemaName: "marketing_creative_critique_v1",
    systemInstruction:
      "You are the Creative Critic in a bounded three-stage workflow. Evaluate only the supplied Reel Idea, company context, explicitly selected abstract competitor evidence, hook strategy, and script package. Give concise user-facing assessments, risks, and recommendations. Do not rewrite the script, call tools, request hidden reasoning, or imitate competitor wording. Your critique completes the workflow regardless of verdict.",
    tier: "reasoning",
    timeoutMs: 90_000,
    tools: [],
    workflowEligibility: ["creative-council-v1"],
  }),
  HOOK: defineAgent({
    allowedMemoryDomains: [],
    displayName: "Hook Strategist",
    failureSemantics: "STOP_WORKFLOW",
    id: "marketing.hook-strategist",
    inputSchema: creativeCouncilContextSchema,
    maxOutputTokens: 900,
    purpose:
      "Turn one selected Reel Idea and bounded evidence into an original hook strategy.",
    schema: hookStrategySchema,
    schemaName: "marketing_hook_strategy_v1",
    systemInstruction:
      "You are the Hook Strategist in a bounded three-stage workflow. Produce an original hook strategy from only the supplied Reel Idea, bounded company context, and explicitly selected abstract competitor evidence. Do not write a full script, call tools, request hidden reasoning, or copy competitor wording. Rationale must be a concise user-facing explanation.",
    tier: "balanced",
    timeoutMs: 90_000,
    tools: [],
    workflowEligibility: ["creative-council-v1"],
  }),
  SCRIPT: defineAgent({
    allowedMemoryDomains: [],
    displayName: "Script Writer",
    failureSemantics: "STOP_WORKFLOW",
    id: "marketing.script-writer",
    inputSchema: scriptInputSchema,
    maxOutputTokens: 1_600,
    purpose:
      "Produce an actionable short-form Reel package from the trusted workflow context and hook strategy.",
    schema: reelScriptSchema,
    schemaName: "marketing_reel_script_v1",
    systemInstruction:
      "You are the Script Writer in a bounded three-stage workflow. Produce one original, practical short-form Reel package from only the supplied Reel Idea, bounded company context, explicitly selected abstract competitor evidence, and validated Hook Strategist output. Do not call tools, perform research, request hidden reasoning, generate media, or copy competitor wording.",
    tier: "balanced",
    timeoutMs: 90_000,
    tools: [],
    workflowEligibility: ["creative-council-v1"],
  }),
} as const;

export const strategicReviewAgents = {
  AUDIENCE: defineAgent({
    allowedMemoryDomains: [],
    displayName: "Audience Researcher",
    failureSemantics: "STOP_WORKFLOW",
    id: "marketing.audience-researcher",
    inputSchema: audienceResearchInputSchema,
    maxOutputTokens: 1_400,
    purpose:
      "Evaluate an immutable Reel Brief against only the supplied audience and company evidence.",
    schema: audienceResearchSchema,
    schemaName: "marketing_audience_research_v1",
    systemInstruction:
      "You are the Audience Researcher in a bounded strategic review. Evaluate only the supplied Reel Brief and company/audience context. Distinguish evidence, inference, and assumption; cite supplied reference identifiers; expose uncertainty. Never claim external audience research, current trend verification, memory access, or tool use.",
    tier: "balanced",
    timeoutMs: STRATEGIC_REVIEW_CALL_TIMEOUT_MS,
    tools: [],
    workflowEligibility: ["strategic-review-v1", "future-ask-council"],
  }),
  BRAND: defineAgent({
    allowedMemoryDomains: [],
    displayName: "Brand Director",
    failureSemantics: "STOP_WORKFLOW",
    id: "marketing.brand-director",
    inputSchema: brandReviewInputSchema,
    maxOutputTokens: 1_400,
    purpose:
      "Evaluate brand, tone, positioning, credibility, and claim safety without producing final strategy.",
    schema: brandReviewSchema,
    schemaName: "marketing_brand_review_v1",
    systemInstruction:
      "You are the Brand Director in a bounded strategic review. Evaluate only the supplied Reel Brief and canonical company/brand context for alignment, tone, positioning, credibility, and claim safety. Distinguish evidence, inference, and assumption. Identify unsupported or overstated claims, but do not create the final strategy, use tools, or claim external verification.",
    tier: "balanced",
    timeoutMs: STRATEGIC_REVIEW_CALL_TIMEOUT_MS,
    tools: [],
    workflowEligibility: ["strategic-review-v1", "future-ask-council"],
  }),
  CHALLENGE: defineAgent({
    allowedMemoryDomains: [],
    displayName: "Challenge Reviewer",
    failureSemantics: "STOP_WORKFLOW",
    id: "marketing.challenge-reviewer",
    inputSchema: challengeReviewInputSchema,
    maxOutputTokens: 1_700,
    purpose:
      "Perform one adversarial pass over the candidate strategy and supplied evidence.",
    schema: challengeReviewSchema,
    schemaName: "marketing_challenge_review_v1",
    systemInstruction:
      "You are the Challenge Reviewer. Perform exactly one adversarial review of the supplied candidate strategy using only the bounded Reel Brief, Audience Researcher conclusions, Brand Director conclusions, and supplied company context. Challenge unsupported claims, evidence/inference confusion, contradictions, groupthink, missing evidence, overconfidence, imitation risk, audience/brand conflict, and plausible counter-hypotheses. Unsupported does not mean false; use contradicted only when supplied evidence directly conflicts. Recommend external verification where current evidence is absent. Return concise review findings, never hidden reasoning or a replacement strategy.",
    tier: "reasoning",
    timeoutMs: STRATEGIC_REVIEW_CALL_TIMEOUT_MS,
    tools: [],
    workflowEligibility: ["strategic-review-v1", "future-ask-council"],
  }),
  JUDGE: defineAgent({
    allowedMemoryDomains: [],
    displayName: "Creative Judge",
    failureSemantics: "STOP_WORKFLOW",
    id: "marketing.creative-judge",
    inputSchema: creativeJudgeInputSchema,
    maxOutputTokens: 1_800,
    purpose:
      "Resolve the candidate strategy and challenge findings into the final immutable review.",
    schema: strategicCouncilReviewSchema,
    schemaName: "marketing_strategic_council_review_v1",
    systemInstruction:
      "You are the Creative Judge in a bounded strategic review. Produce the final Strategic Council Review from only the supplied source, specialist results, candidate strategy, and Challenge Reviewer output. Explicitly disposition every material challenge as accepted, partially accepted, or rejected with concise rationale. Preserve unresolved verification needs and uncertainty. Do not expose hidden reasoning, call tools, research externally, or fabricate evidence.",
    tier: "reasoning",
    timeoutMs: STRATEGIC_REVIEW_CALL_TIMEOUT_MS,
    tools: [],
    workflowEligibility: ["strategic-review-v1", "future-ask-council"],
  }),
  STRATEGY: defineAgent({
    allowedMemoryDomains: [],
    displayName: "Content Strategist",
    failureSemantics: "STOP_WORKFLOW",
    id: "marketing.content-strategist",
    inputSchema: contentStrategyInputSchema,
    maxOutputTokens: 1_700,
    purpose:
      "Synthesize audience and brand findings into a bounded candidate strategy.",
    schema: contentStrategySchema,
    schemaName: "marketing_content_strategy_v1",
    systemInstruction:
      "You are the Content Strategist in a bounded strategic review. Use only the exact Reel Brief, bounded company context, Audience Researcher output, and Brand Director output. Produce the candidate recommendation with unique REC-N identifiers, evidence status, assumptions, risks, priorities, and what should remain unchanged. Do not call tools, perform research, claim current evidence, or reveal hidden reasoning.",
    tier: "reasoning",
    timeoutMs: STRATEGIC_REVIEW_CALL_TIMEOUT_MS,
    tools: [],
    workflowEligibility: ["strategic-review-v1", "future-ask-council"],
  }),
} as const;

const trendResearcher = defineAgent({
  allowedMemoryDomains: [],
  displayName: "Trend Researcher",
  failureSemantics: "STOP_WORKFLOW",
  id: "marketing.trend-researcher",
  inputSchema: trendResearchInputSchema,
  maxOutputTokens: 1_200,
  purpose:
    "Interpret only explicitly supplied trend evidence without independently researching current trends.",
  schema: specialistAssessmentSchema,
  schemaName: "marketing_trend_assessment_v1",
  systemInstruction:
    "Reason only over trend evidence explicitly supplied by an authorized workflow. Never claim you searched, observed, or verified current trends independently. If evidence is absent or stale, state that verification is required. Do not call tools.",
  tier: "balanced",
  timeoutMs: STRATEGIC_REVIEW_CALL_TIMEOUT_MS,
  tools: [],
  workflowEligibility: [
    "future-research-enabled-council",
    "future-ask-council",
  ],
});
const competitorAnalyst = defineAgent({
  allowedMemoryDomains: [],
  displayName: "Competitor Analyst",
  failureSemantics: "STOP_WORKFLOW",
  id: "marketing.competitor-analyst",
  inputSchema: competitorAnalysisInputSchema,
  maxOutputTokens: 1_200,
  purpose:
    "Interpret only explicitly authorized competitor evidence while avoiding imitation.",
  schema: specialistAssessmentSchema,
  schemaName: "marketing_competitor_assessment_v1",
  systemInstruction:
    "Reason only over explicitly authorized structured competitor evidence supplied by a workflow. Never fetch sources, infer access to media or transcripts, or reproduce competitor expression. Surface patterns, gaps, uncertainty, and verification needs. Do not call tools.",
  tier: "balanced",
  timeoutMs: STRATEGIC_REVIEW_CALL_TIMEOUT_MS,
  tools: [],
  workflowEligibility: ["future-evidence-council", "future-ask-council"],
});
const retentionEditor = defineAgent({
  allowedMemoryDomains: [],
  displayName: "Retention Editor",
  failureSemantics: "STOP_WORKFLOW",
  id: "marketing.retention-editor",
  inputSchema: retentionReviewInputSchema,
  maxOutputTokens: 1_200,
  purpose: "Assess pacing, clarity, and retention risks from bounded inputs.",
  schema: specialistAssessmentSchema,
  schemaName: "marketing_retention_assessment_v1",
  systemInstruction:
    "Assess pacing, clarity, and retention risks from only the supplied bounded creative inputs. Distinguish observed structure from inference, expose uncertainty, and do not claim performance evidence or external research. Do not call tools.",
  tier: "balanced",
  timeoutMs: STRATEGIC_REVIEW_CALL_TIMEOUT_MS,
  tools: [],
  workflowEligibility: ["future-create-council", "future-ask-council"],
});
const visualDirector = defineAgent({
  allowedMemoryDomains: [],
  displayName: "Visual Director",
  failureSemantics: "STOP_WORKFLOW",
  id: "marketing.visual-director",
  inputSchema: visualDirectionInputSchema,
  maxOutputTokens: 1_200,
  purpose:
    "Assess supplied visual direction without claiming unseen media analysis.",
  schema: specialistAssessmentSchema,
  schemaName: "marketing_visual_assessment_v1",
  systemInstruction:
    "Assess only the textual visual direction supplied by the workflow. Never claim to have viewed media, frames, or external sources. Separate evidence from inference and provide bounded production-oriented recommendations. Do not call tools.",
  tier: "balanced",
  timeoutMs: STRATEGIC_REVIEW_CALL_TIMEOUT_MS,
  tools: [],
  workflowEligibility: ["future-create-council", "future-ask-council"],
});

export const registeredTask016Specialists = [
  strategicReviewAgents.AUDIENCE,
  trendResearcher,
  competitorAnalyst,
  strategicReviewAgents.STRATEGY,
  retentionEditor,
  visualDirector,
  strategicReviewAgents.BRAND,
  strategicReviewAgents.JUDGE,
  strategicReviewAgents.CHALLENGE,
] as const;

export const registeredCreativeCouncilSpecialists = [
  creativeCouncilAgents.HOOK,
  creativeCouncilAgents.SCRIPT,
  creativeCouncilAgents.CRITIQUE,
  ...registeredTask016Specialists,
] as const;
