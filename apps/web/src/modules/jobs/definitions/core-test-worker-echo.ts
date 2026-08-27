import { z } from "zod";

import { defineJob } from "@/core/jobs/public";

export const coreTestWorkerEchoJob = defineJob({
  capability: "core.worker.echo",
  concurrencyGroup: "core.test.worker-echo",
  description:
    "A deterministic health check executed by a paired external worker.",
  executionClass: "EXTERNAL_WORKER",
  hostedExecutionSupported: false,
  id: "core.test.worker-echo",
  idempotency: "OPTIONAL",
  inputSchema: z.object({ message: z.literal("Stylus worker check") }).strict(),
  maxAttempts: 2,
  origin: { kind: "core" },
  outputSchema: z.object({ acknowledged: z.literal(true) }).strict(),
  priority: 50,
  retryableCategories: ["transient_failure", "internal_error", "timeout"],
  sideEffect: "NONE",
  timeoutMs: 30_000,
});
