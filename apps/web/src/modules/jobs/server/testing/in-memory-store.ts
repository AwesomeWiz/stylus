import "server-only";

import type { JobErrorCategory } from "@/core/jobs/public";

import type { ClaimedJob, JobExecutionStore } from "../executor";

type StoredJob = {
  cancellationRequested: boolean;
  claimed: ClaimedJob;
  errorCategory: JobErrorCategory | null;
  executorId: string | null;
  progress: number;
  progressMessage: string | null;
  result: unknown;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
};

export class InMemoryJobExecutionStore implements JobExecutionStore {
  readonly #jobs: StoredJob[];

  constructor(jobs: readonly ClaimedJob[]) {
    this.#jobs = jobs.map((claimed) => ({
      cancellationRequested: false,
      claimed,
      errorCategory: null,
      executorId: null,
      progress: 0,
      progressMessage: null,
      result: null,
      status: "QUEUED",
    }));
  }

  async claim(executorId: string) {
    const job = this.#jobs.find((candidate) => candidate.status === "QUEUED");
    if (!job) return null;
    job.status = "RUNNING";
    job.executorId = executorId;
    return job.claimed;
  }

  async complete(jobId: string, executorId: string, result: unknown) {
    const job = this.#active(jobId, executorId);
    job.status = "SUCCEEDED";
    job.progress = 100;
    job.result = result;
  }

  async fail(input: {
    category: JobErrorCategory;
    executorId: string;
    jobId: string;
    retryable: boolean;
  }) {
    void input.retryable;
    const job = this.#active(input.jobId, input.executorId);
    job.status = "FAILED";
    job.errorCategory = input.category;
  }

  async heartbeat(jobId: string, executorId: string) {
    this.#active(jobId, executorId);
  }

  async isCancellationRequested(jobId: string, executorId: string) {
    return this.#active(jobId, executorId).cancellationRequested;
  }

  async progress(
    jobId: string,
    executorId: string,
    progress: number,
    message: string,
  ) {
    const job = this.#active(jobId, executorId);
    job.progress = progress;
    job.progressMessage = message;
  }

  requestCancellation(jobId: string) {
    const job = this.#jobs.find(
      (candidate) => candidate.claimed.jobId === jobId,
    );
    if (!job) throw new Error("Unknown in-memory job");
    job.cancellationRequested = true;
  }

  snapshot(jobId: string) {
    const job = this.#jobs.find(
      (candidate) => candidate.claimed.jobId === jobId,
    );
    return job ? { ...job } : null;
  }

  #active(jobId: string, executorId: string) {
    const job = this.#jobs.find(
      (candidate) =>
        candidate.claimed.jobId === jobId &&
        candidate.executorId === executorId &&
        candidate.status === "RUNNING",
    );
    if (!job) throw new Error("Active in-memory job not found");
    return job;
  }
}
