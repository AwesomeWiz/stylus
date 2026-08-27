import "server-only";

import type {
  JobErrorCategory,
  JobHandlerContext,
  JobRegistry,
} from "@/core/jobs/public";

export interface ClaimedJob {
  actorId: string;
  attempt: number;
  input: unknown;
  jobId: string;
  jobType: string;
  organizationId: string;
  origin: JobHandlerContext["origin"];
}

export interface JobExecutionStore {
  claim(executorId: string): Promise<ClaimedJob | null>;
  complete(jobId: string, executorId: string, result: unknown): Promise<void>;
  fail(input: {
    category: JobErrorCategory;
    executorId: string;
    jobId: string;
    retryable: boolean;
  }): Promise<void>;
  heartbeat(jobId: string, executorId: string): Promise<void>;
  isCancellationRequested(jobId: string, executorId: string): Promise<boolean>;
  progress(
    jobId: string,
    executorId: string,
    progress: number,
    message: string,
  ): Promise<void>;
}

export interface JobLifecycleEvent {
  category?: JobErrorCategory;
  jobId: string;
  jobType: string;
  organizationId: string;
  status: "SUCCEEDED" | "FAILED";
}

export type JobLifecycleObserver = (
  event: JobLifecycleEvent,
) => Promise<void> | void;

export class JobCancelledError extends Error {
  constructor() {
    super("Job cancellation requested");
    this.name = "JobCancelledError";
  }
}

export class JobExecutor {
  constructor(
    private readonly executorId: string,
    private readonly registry: JobRegistry,
    private readonly store: JobExecutionStore,
    private readonly onLifecycleEvent?: JobLifecycleObserver,
  ) {}

  async runOne() {
    const claimed = await this.store.claim(this.executorId);
    if (!claimed) return null;
    const definition = this.registry.get(claimed.jobType);
    if (!definition?.handler) {
      await this.store.fail({
        category: "permanent_failure",
        executorId: this.executorId,
        jobId: claimed.jobId,
        retryable: false,
      });
      await notifyLifecycle(this.onLifecycleEvent, {
        category: "permanent_failure",
        jobId: claimed.jobId,
        jobType: claimed.jobType,
        organizationId: claimed.organizationId,
        status: "FAILED",
      });
      return claimed.jobId;
    }
    const input = definition.inputSchema.safeParse(claimed.input);
    if (!input.success) {
      await this.store.fail({
        category: "validation_failed",
        executorId: this.executorId,
        jobId: claimed.jobId,
        retryable: false,
      });
      await notifyLifecycle(this.onLifecycleEvent, {
        category: "validation_failed",
        jobId: claimed.jobId,
        jobType: claimed.jobType,
        organizationId: claimed.organizationId,
        status: "FAILED",
      });
      return claimed.jobId;
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort("timeout"),
      definition.timeoutMs,
    );
    try {
      if (
        await this.store.isCancellationRequested(claimed.jobId, this.executorId)
      )
        throw new JobCancelledError();
      let lastProgressAt = 0;
      let lastProgress = -1;
      const context: JobHandlerContext = {
        actorId: claimed.actorId,
        attempt: claimed.attempt,
        heartbeat: () => this.store.heartbeat(claimed.jobId, this.executorId),
        isCancellationRequested: () =>
          this.store.isCancellationRequested(claimed.jobId, this.executorId),
        jobId: claimed.jobId,
        organizationId: claimed.organizationId,
        origin: claimed.origin,
        reportProgress: async (progress, message) => {
          const now = Date.now();
          if (progress < lastProgress || progress < 0 || progress > 99)
            throw new Error("Invalid job progress");
          if (lastProgressAt && now - lastProgressAt < 500 && progress < 99)
            return;
          await this.store.progress(
            claimed.jobId,
            this.executorId,
            progress,
            message,
          );
          lastProgress = progress;
          lastProgressAt = now;
        },
        signal: controller.signal,
      };
      const result = await Promise.race([
        definition.handler(input.data, context),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener(
            "abort",
            () => reject(new Error("Job timed out")),
            { once: true },
          );
        }),
      ]);
      if (await context.isCancellationRequested())
        throw new JobCancelledError();
      const output = definition.outputSchema.safeParse(result);
      if (!output.success || JSON.stringify(output.data).length > 16_384)
        throw new InvalidJobResultError();
      await this.store.complete(claimed.jobId, this.executorId, output.data);
      await notifyLifecycle(this.onLifecycleEvent, {
        jobId: claimed.jobId,
        jobType: claimed.jobType,
        organizationId: claimed.organizationId,
        status: "SUCCEEDED",
      });
    } catch (error) {
      const category = normalizeExecutionError(error, controller.signal);
      await this.store.fail({
        category,
        executorId: this.executorId,
        jobId: claimed.jobId,
        retryable: definition.retryableCategories.includes(category),
      });
      await notifyLifecycle(this.onLifecycleEvent, {
        category,
        jobId: claimed.jobId,
        jobType: claimed.jobType,
        organizationId: claimed.organizationId,
        status: "FAILED",
      });
    } finally {
      clearTimeout(timeout);
    }
    return claimed.jobId;
  }
}

class InvalidJobResultError extends Error {}

async function notifyLifecycle(
  observer: JobLifecycleObserver | undefined,
  event: JobLifecycleEvent,
) {
  try {
    await observer?.(event);
  } catch {
    // Lifecycle persistence is authoritative; optional notification/activity
    // adapters must not corrupt a completed transition.
  }
}

function normalizeExecutionError(
  error: unknown,
  signal: AbortSignal,
): JobErrorCategory {
  if (error instanceof JobCancelledError) return "cancelled";
  if (signal.aborted) return "timeout";
  if (error instanceof InvalidJobResultError) return "validation_failed";
  return "internal_error";
}

export function calculateJobBackoffSeconds(attempt: number) {
  return Math.min(900, 30 * 2 ** Math.max(0, attempt - 1));
}
