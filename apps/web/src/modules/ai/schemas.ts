import { z } from "zod";

import type { AIErrorCategory } from "./errors";

export interface AIPolicyActionState {
  message?: string;
  status: "idle" | "error" | "success";
}

export const initialAIPolicyActionState: AIPolicyActionState = {
  status: "idle",
};

export interface AIConnectionTestActionState {
  durationMs?: number;
  errorCategory?: AIErrorCategory;
  message?: string;
  modelId?: string;
  providerId?: string;
  status: "idle" | "error" | "success";
}

export const initialAIConnectionTestActionState: AIConnectionTestActionState = {
  status: "idle",
};

export const aiPolicySchema = z.object({
  allowedProviderIds: z
    .array(z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/))
    .max(20),
  defaultTier: z.enum(["FAST", "BALANCED", "REASONING"]),
  executionMode: z.enum(["DISABLED", "LOCAL_ONLY", "REMOTE_ALLOWED"]),
  monthlyRemoteCostLimitUsd: z.preprocess(
    (value) => (value === "" || value === null ? null : Number(value)),
    z.number().finite().min(0).max(1_000_000).nullable(),
  ),
});
