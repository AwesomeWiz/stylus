import "server-only";

import type {
  AIExecutionContext,
  AILogicalTier,
  AIUsage,
} from "@/core/ai/public";
import type { AIErrorCategory } from "@/modules/ai/errors";

export type AIRunTerminalStatus =
  "SUCCEEDED" | "FAILED" | "CANCELLED" | "TIMED_OUT";

export interface AIRunStart {
  context: AIExecutionContext;
  operation: "generate_text" | "generate_structured";
  parentRunId?: string | null;
  requestedTier: AILogicalTier;
  trace: Readonly<Record<string, unknown>>;
}

export interface AIRunCompletion {
  durationMs: number;
  errorCategory: AIErrorCategory | null;
  estimatedCostUsd: number | null;
  isRemote: boolean | null;
  modelId: string | null;
  organizationId: string;
  providerId: string | null;
  runId: string;
  status: AIRunTerminalStatus;
  trace: Readonly<Record<string, unknown>>;
  usage: AIUsage;
}

export interface AIRunStore {
  complete(input: AIRunCompletion): Promise<void>;
  start(input: AIRunStart): Promise<void>;
}

export class InMemoryAIRunStore implements AIRunStore {
  completions: AIRunCompletion[] = [];
  starts: AIRunStart[] = [];

  async start(input: AIRunStart) {
    if (this.starts.some((run) => run.context.runId === input.context.runId))
      throw new Error("Duplicate AI run ID");
    this.starts.push(input);
  }

  async complete(input: AIRunCompletion) {
    this.completions.push(input);
  }
}
