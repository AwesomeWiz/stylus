import { defineJob, z } from "@/core/jobs/public";

import {
  externalResearchJobInputSchema,
  externalResearchLimits,
} from "./external-research";
import { runExternalResearchJob } from "./server/external-research-handler";

export const externalResearchJob = defineJob({
  capability: "marketing.external-research.execute",
  concurrencyGroup: "marketing.external-research",
  description:
    "Retrieve bounded public evidence and synthesize a research report.",
  executionClass: "SERVERLESS",
  handler: runExternalResearchJob,
  hostedExecutionSupported: true,
  id: "marketing.external-research.run",
  idempotency: "REQUIRED",
  inputSchema: externalResearchJobInputSchema,
  maxAttempts: 1,
  origin: { kind: "plugin", pluginId: "marketing" },
  outputSchema: z
    .object({
      evidenceCount: z.number().int().min(1).max(20),
      reportId: z.uuid(),
      runId: z.uuid(),
    })
    .strict(),
  priority: 60,
  retryableCategories: [],
  sideEffect: "IDEMPOTENT_WRITE",
  timeoutMs: externalResearchLimits.workflowTimeoutMs,
});
