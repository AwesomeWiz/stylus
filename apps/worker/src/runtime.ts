import {
  WorkerApiError,
  WorkerCancelledError,
  WorkerUnauthorizedError,
  type WorkerApi,
} from "./api.js";
import { handlerForClaim, type WorkerHandlerRegistry } from "./registry.js";

export class WorkerRuntime {
  constructor(
    private readonly api: WorkerApi,
    private readonly registry: WorkerHandlerRegistry,
    private readonly pollMs = 8_000,
  ) {}
  async run(signal: AbortSignal) {
    await this.api.heartbeat();
    let backoff = this.pollMs;
    while (!signal.aborted) {
      try {
        const job = await this.api.claim();
        if (job) await this.execute(job, signal);
        backoff = this.pollMs;
      } catch (error) {
        if (error instanceof WorkerUnauthorizedError) throw error;
        backoff = Math.min(60_000, Math.max(this.pollMs, backoff * 2));
      }
      await wait(backoff, signal);
    }
  }
  private async execute(
    job: Awaited<ReturnType<WorkerApi["claim"]>> & {},
    shutdown: AbortSignal,
  ) {
    if (!job) return;
    const handler = handlerForClaim(this.registry, job);
    if (!handler) {
      await this.api.reportFailure(job.id, "permanent_failure", false);
      return;
    }
    const controller = new AbortController();
    const stop = () => controller.abort("shutdown");
    shutdown.addEventListener("abort", stop, { once: true });
    const leaseTimer = setInterval(async () => {
      try {
        const state = (await this.api.operation("heartbeat", job.id)) as {
          status?: string;
        };
        if (state.status === "CANCEL_REQUESTED") controller.abort("cancelled");
      } catch {
        controller.abort("lease_lost");
      }
    }, 20_000);
    const timeout = setTimeout(
      () => controller.abort("timeout"),
      handler.timeoutMs,
    );
    try {
      const result = await handler.run(job.input_metadata, {
        api: this.api,
        jobId: job.id,
        signal: controller.signal,
      });
      if (controller.signal.aborted)
        throw new Error(String(controller.signal.reason));
      await this.api.operation("complete", job.id, { result });
    } catch (error) {
      const reason = String(controller.signal.reason ?? "");
      if (reason === "cancelled" || error instanceof WorkerCancelledError)
        await this.api.operation("cancel", job.id);
      else {
        const message = error instanceof Error ? error.message : "";
        const permanent = /^(invalid_|media_duration_exceeded)/.test(message);
        const brokerFailure =
          error instanceof WorkerApiError ? error.jobFailure : undefined;
        await this.api.reportFailure(
          job.id,
          brokerFailure?.category ??
            (reason === "timeout"
              ? "timeout"
              : permanent
                ? "permanent_failure"
                : "internal_error"),
          brokerFailure?.retryable ?? (reason !== "shutdown" && !permanent),
        );
      }
    } finally {
      clearInterval(leaseTimer);
      clearTimeout(timeout);
      shutdown.removeEventListener("abort", stop);
    }
  }
}

async function wait(ms: number, signal: AbortSignal) {
  if (signal.aborted) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}
