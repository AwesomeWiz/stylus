import type { WorkerConfig } from "./config.js";

export interface ClaimedJob {
  attempt_count: number;
  id: string;
  input_metadata: unknown;
  job_type: string;
  organization_id: string;
  status: string;
}
export type WorkerCapability =
  "core.worker.echo" | "marketing.competitor-reels.analyze";
export type WorkerJobErrorCategory =
  | "internal_error"
  | "permanent_failure"
  | "policy_denied"
  | "provider_unavailable"
  | "rate_limited"
  | "timeout"
  | "transient_failure"
  | "validation_failed";
const defaultCapabilities: WorkerCapability[] = ["core.worker.echo"];
export const WORKER_VERSION = "0.1.0";

export class WorkerApiError extends Error {
  constructor(
    message: string,
    readonly jobFailure?: {
      category: WorkerJobErrorCategory;
      retryable: boolean;
    },
  ) {
    super(message);
  }
}
export class WorkerUnauthorizedError extends WorkerApiError {}
export class WorkerCancelledError extends WorkerApiError {}
export class WorkerUnexpectedResponseError extends WorkerApiError {
  constructor(status: number) {
    super(`Stylus worker API returned an unexpected response (${status}).`);
  }
}

export class WorkerApi {
  constructor(
    private readonly stylusUrl: string,
    private readonly credential?: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly capabilities: WorkerCapability[] = defaultCapabilities,
  ) {}
  private async request(
    operation: string,
    body: unknown,
    authenticated = true,
  ) {
    const timeoutMs = operation === "persist-extraction" ? 240_000 : 15_000;
    const response = await this.fetcher(
      new URL(`/api/worker/${operation}`, this.stylusUrl),
      {
        body: JSON.stringify(body),
        headers: {
          "content-type": "application/json",
          ...(authenticated && this.credential
            ? { authorization: `Bearer ${this.credential}` }
            : {}),
        },
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
    const contentType = response.headers.get("content-type")?.toLowerCase();
    if (!contentType?.includes("application/json")) {
      try {
        await response.body?.cancel();
      } catch {
        // The response is intentionally discarded without reading its body.
      }
      throw new WorkerUnexpectedResponseError(response.status);
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new WorkerUnexpectedResponseError(response.status);
    }
    if (authenticated && response.status === 401)
      throw new WorkerUnauthorizedError(
        "Worker credential is invalid or revoked",
      );
    if (
      !response.ok &&
      payload &&
      typeof payload === "object" &&
      (payload as { error?: unknown }).error === "cancelled"
    )
      throw new WorkerCancelledError("Worker job was cancelled");
    if (!response.ok) {
      const error = payload as {
        category?: unknown;
        retryable?: unknown;
      };
      const category = workerJobErrorCategory(error.category);
      throw new WorkerApiError(
        `Worker API operation failed (${response.status})`,
        category && typeof error.retryable === "boolean"
          ? { category, retryable: error.retryable }
          : undefined,
      );
    }
    return payload;
  }
  pair(token: string) {
    return this.request(
      "pair",
      { capabilities: this.capabilities, token, version: WORKER_VERSION },
      false,
    ) as Promise<{
      credential: string;
      name: string;
      organizationId: string;
      workerId: string;
    }>;
  }
  heartbeat() {
    return this.request("heartbeat", {
      capabilities: this.capabilities,
      version: WORKER_VERSION,
    });
  }
  claim() {
    return this.request("claim", {
      capabilities: this.capabilities,
      version: WORKER_VERSION,
    }) as Promise<ClaimedJob | null>;
  }
  operation(
    operation: string,
    jobId: string,
    payload: Record<string, unknown> = {},
  ) {
    return this.request(operation, { jobId, payload });
  }
  mediaAuthorization(jobId: string) {
    return this.request("media-authorization", {
      jobId,
      payload: {},
    }) as Promise<{
      analysisId: string;
      downloadUrl: string;
      reelId: string;
      sourceSizeBytes: number;
    }>;
  }
  persistExtraction(jobId: string, result: Record<string, unknown>) {
    return this.request("persist-extraction", { jobId, payload: result });
  }
  reportFailure(
    jobId: string,
    category: WorkerJobErrorCategory,
    retryable: boolean,
  ) {
    return this.request("fail", {
      jobId,
      payload: { category, retryable },
    });
  }
}

function workerJobErrorCategory(value: unknown): WorkerJobErrorCategory | null {
  return typeof value === "string" &&
    [
      "internal_error",
      "permanent_failure",
      "policy_denied",
      "provider_unavailable",
      "rate_limited",
      "timeout",
      "transient_failure",
      "validation_failed",
    ].includes(value)
    ? (value as WorkerJobErrorCategory)
    : null;
}

export function apiForConfig(
  config: WorkerConfig,
  fetcher?: typeof fetch,
  capabilities?: WorkerCapability[],
) {
  return new WorkerApi(
    config.stylusUrl,
    config.credential,
    fetcher,
    capabilities,
  );
}
