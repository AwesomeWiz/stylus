import { z } from "zod";

import { defineJob } from "@/core/jobs/public";

export const coreTestEchoJob = defineJob({
  capability: "core.jobs.test",
  concurrencyGroup: "core.test.echo",
  description:
    "A deterministic database-native health check for the durable job lifecycle.",
  executionClass: "DATABASE",
  hostedExecutionSupported: true,
  id: "core.test.echo",
  idempotency: "OPTIONAL",
  inputSchema: z.object({ message: z.string().trim().min(1).max(80) }).strict(),
  maxAttempts: 2,
  origin: { kind: "core" },
  outputSchema: z.object({ acknowledged: z.literal(true) }).strict(),
  priority: 50,
  retryableCategories: ["transient_failure", "internal_error", "timeout"],
  sideEffect: "NONE",
  timeoutMs: 60_000,
});
