import type { ClaimedJob, WorkerApi } from "./api.js";

export interface HandlerContext {
  api: WorkerApi;
  jobId: string;
  signal: AbortSignal;
}
export interface WorkerHandler {
  capability: "core.worker.echo";
  executionClass: "EXTERNAL_WORKER";
  jobType: string;
  timeoutMs: number;
  run(
    input: unknown,
    context: HandlerContext,
  ): Promise<Record<string, unknown>>;
}

export class WorkerHandlerRegistry {
  private readonly handlers = new Map<string, WorkerHandler>();
  constructor(handlers: WorkerHandler[] = []) {
    handlers.forEach((handler) => this.register(handler));
  }
  register(handler: WorkerHandler) {
    if (handler.executionClass !== "EXTERNAL_WORKER")
      throw new Error("Worker handlers must use EXTERNAL_WORKER");
    if (this.handlers.has(handler.jobType))
      throw new Error(`Duplicate worker handler: ${handler.jobType}`);
    if (
      !Number.isInteger(handler.timeoutMs) ||
      handler.timeoutMs < 1_000 ||
      handler.timeoutMs > 86_400_000
    )
      throw new Error("Worker handler timeout is invalid");
    this.handlers.set(handler.jobType, handler);
    return this;
  }
  get(jobType: string) {
    return this.handlers.get(jobType);
  }
}

export const workerEchoHandler: WorkerHandler = {
  capability: "core.worker.echo",
  executionClass: "EXTERNAL_WORKER",
  jobType: "core.test.worker-echo",
  timeoutMs: 30_000,
  async run(input, context) {
    if (
      !input ||
      typeof input !== "object" ||
      (input as { message?: unknown }).message !== "Stylus worker check"
    )
      throw new Error("Invalid worker diagnostic input");
    await context.api.operation("progress", context.jobId, {
      message: "Worker diagnostic started.",
      progress: 25,
    });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 100);
      context.signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new Error("Worker diagnostic aborted"));
        },
        { once: true },
      );
    });
    await context.api.operation("progress", context.jobId, {
      message: "Worker diagnostic validated.",
      progress: 75,
    });
    return { acknowledged: true };
  },
};

export const workerRegistry = new WorkerHandlerRegistry([workerEchoHandler]);
export function handlerForClaim(
  registry: WorkerHandlerRegistry,
  job: ClaimedJob,
) {
  return registry.get(job.job_type);
}
