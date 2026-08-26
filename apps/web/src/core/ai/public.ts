import { z } from "zod";

import type { PluginMemoryDomain } from "@/core/plugins/public";

export const aiLogicalTiers = ["fast", "balanced", "reasoning"] as const;
export const aiLogicalTierSchema = z.enum(aiLogicalTiers);
export type AILogicalTier = z.infer<typeof aiLogicalTierSchema>;

export const aiMessageRoles = ["system", "user", "assistant"] as const;
export const aiMessageSchema = z.object({
  content: z.string().min(1).max(100_000),
  role: z.enum(aiMessageRoles),
});
export type AIMessage = z.infer<typeof aiMessageSchema>;

export const aiSideEffects = ["read", "write", "external_side_effect"] as const;
export const aiSideEffectSchema = z.enum(aiSideEffects);
export type AISideEffect = z.infer<typeof aiSideEffectSchema>;

export interface AIExecutionContext {
  actorId: string;
  capability: string;
  memoryDomains: readonly PluginMemoryDomain[];
  organizationId: string;
  pluginId: string | null;
  runId: string;
}

export interface AIGenerationOptions {
  maxOutputTokens?: number;
  messages: readonly AIMessage[];
  signal?: AbortSignal;
  temperature?: number;
  tier?: AILogicalTier;
  timeoutMs?: number;
}

export interface AIUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

export interface AIGenerationMetadata {
  estimatedCostUsd: number | null;
  finishReason: string | null;
  modelId: string;
  providerId: string;
  runId: string;
  usage: AIUsage;
}

export interface AITextResult extends AIGenerationMetadata {
  text: string;
}

export interface AIStructuredResult<T> extends AIGenerationMetadata {
  data: T;
}

export interface AIToolMetadata {
  description: string;
  id: string;
  owningPluginId: string;
  requiredCapability: string;
  sideEffect: AISideEffect;
}
