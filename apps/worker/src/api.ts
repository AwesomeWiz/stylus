import type { WorkerConfig } from "./config.js";

export interface ClaimedJob {
  attempt_count: number;
  id: string;
  input_metadata: unknown;
  job_type: string;
  organization_id: string;
  status: string;
}
const capabilities = ["core.worker.echo"] as const;
export const WORKER_VERSION = "0.1.0";

export class WorkerUnauthorizedError extends Error {}

export class WorkerApi {
  constructor(
    private readonly stylusUrl: string,
    private readonly credential?: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}
  private async request(
    operation: string,
    body: unknown,
    authenticated = true,
  ) {
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
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (response.status === 401)
      throw new WorkerUnauthorizedError(
        "Worker credential is invalid or revoked",
      );
    if (!response.ok)
      throw new Error(`Worker API operation failed (${response.status})`);
    return response.json() as Promise<unknown>;
  }
  pair(token: string) {
    return this.request(
      "pair",
      { capabilities, token, version: WORKER_VERSION },
      false,
    ) as Promise<{
      credential: string;
      name: string;
      organizationId: string;
      workerId: string;
    }>;
  }
  heartbeat() {
    return this.request("heartbeat", { capabilities, version: WORKER_VERSION });
  }
  claim() {
    return this.request("claim", {
      capabilities,
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
}

export function apiForConfig(config: WorkerConfig, fetcher?: typeof fetch) {
  return new WorkerApi(config.stylusUrl, config.credential, fetcher);
}
