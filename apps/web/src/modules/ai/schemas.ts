import { z } from "zod";

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
