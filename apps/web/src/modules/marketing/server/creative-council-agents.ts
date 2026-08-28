import "server-only";

import type { AILogicalTier } from "@/core/ai/public";

import {
  creativeCritiqueSchema,
  hookStrategySchema,
  reelScriptSchema,
} from "../creative-council";

export const CREATIVE_COUNCIL_CAPABILITY = "marketing.creative-council.execute";

interface CreativeCouncilAgentDefinition {
  displayName: string;
  id:
    | "marketing.hook-strategist"
    | "marketing.script-writer"
    | "marketing.creative-critic";
  maxOutputTokens: number;
  purpose: string;
  schema:
    | typeof hookStrategySchema
    | typeof reelScriptSchema
    | typeof creativeCritiqueSchema;
  schemaName:
    | "marketing_hook_strategy_v1"
    | "marketing_reel_script_v1"
    | "marketing_creative_critique_v1";
  systemInstruction: string;
  tier: AILogicalTier;
  timeoutMs: 90_000;
  tools: readonly [];
}

export const creativeCouncilAgents = {
  CRITIQUE: {
    displayName: "Creative Critic",
    id: "marketing.creative-critic",
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
  },
  HOOK: {
    displayName: "Hook Strategist",
    id: "marketing.hook-strategist",
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
  },
  SCRIPT: {
    displayName: "Script Writer",
    id: "marketing.script-writer",
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
  },
} as const satisfies Record<
  "HOOK" | "SCRIPT" | "CRITIQUE",
  CreativeCouncilAgentDefinition
>;
