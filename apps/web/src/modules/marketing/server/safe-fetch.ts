import "server-only";

import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

import { externalResearchLimits } from "../external-research";

export type SourceFailureCategory =
  | "invalid_source"
  | "policy_denied"
  | "rate_limited"
  | "timeout"
  | "transient_failure"
  | "permanent_failure"
  | "invalid_content_type"
  | "oversized_response"
  | "malformed_source"
  | "no_results";

export type SourceDiagnosticCategory =
  | "dns_failure"
  | "unsafe_address"
  | "connection_failure"
  | "tls_failure"
  | "timeout"
  | "http_status"
  | "invalid_content_type"
  | "response_too_large"
  | "malformed_payload"
  | "zero_candidates"
  | "zero_matching_candidates";

export type SourceDiagnosticMetadata = Record<
  string,
  boolean | number | string
>;

export class SourceRetrievalError extends Error {
  constructor(
    readonly category: SourceFailureCategory,
    readonly retryable = false,
    readonly retryAfterMs?: number,
    readonly diagnosticCategory: SourceDiagnosticCategory = defaultDiagnosticCategory(
      category,
    ),
    readonly diagnosticMetadata: SourceDiagnosticMetadata = {},
  ) {
    super(`External source failed: ${category}`);
    this.name = "SourceRetrievalError";
  }
}

export class RunByteBudget {
  #used = 0;

  constructor(readonly maximum = externalResearchLimits.totalFetchedBytes) {}

  consume(bytes: number) {
    if (
      !Number.isSafeInteger(bytes) ||
      bytes < 0 ||
      this.#used + bytes > this.maximum
    )
      throw new SourceRetrievalError("oversized_response");
    this.#used += bytes;
  }

  get used() {
    return this.#used;
  }
}

type Address = { address: string; family: 4 | 6 };
type TransportResponse = {
  body: Uint8Array;
  headers: Record<string, string | string[] | undefined>;
  status: number;
};

export type SafeFetchDependencies = {
  resolve(hostname: string): Promise<Address[]>;
  transport(input: {
    address: Address;
    signal: AbortSignal;
    url: URL;
  }): Promise<TransportResponse>;
};

const defaults: SafeFetchDependencies = {
  async resolve(hostname) {
    const addresses = await dnsLookup(hostname, { all: true, verbatim: true });
    return addresses.map(({ address, family }) => ({
      address,
      family: family as 4 | 6,
    }));
  },
  transport: pinnedHttpsRequest,
};

export async function safeFetchXml(
  rawUrl: string,
  budget: RunByteBudget,
  dependencies: SafeFetchDependencies = defaults,
  signal?: AbortSignal,
) {
  let current = validatePublicHttpsUrl(rawUrl);
  for (let redirectCount = 0; ; redirectCount += 1) {
    const response = await fetchOnce(current, dependencies, signal);
    budget.consume(response.body.byteLength);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = header(response.headers, "location");
      if (!location || redirectCount >= externalResearchLimits.maxRedirects)
        throw new SourceRetrievalError("policy_denied");
      current = validatePublicHttpsUrl(new URL(location, current).toString());
      continue;
    }
    if (response.status === 408)
      throw new SourceRetrievalError("timeout", true, undefined, "timeout", {
        httpStatus: response.status,
      });
    if (response.status === 429)
      throw new SourceRetrievalError(
        "rate_limited",
        true,
        retryAfterMilliseconds(header(response.headers, "retry-after")),
        "http_status",
        { httpStatus: response.status },
      );
    if ([500, 502, 503, 504].includes(response.status))
      throw new SourceRetrievalError(
        "transient_failure",
        true,
        undefined,
        "http_status",
        { httpStatus: response.status },
      );
    if (response.status < 200 || response.status >= 300)
      throw new SourceRetrievalError(
        "permanent_failure",
        false,
        undefined,
        "http_status",
        { httpStatus: response.status },
      );
    const contentType = header(response.headers, "content-type")
      ?.split(";", 1)
      .at(0)
      ?.trim()
      .toLowerCase();
    if (
      !contentType ||
      ![
        "application/atom+xml",
        "application/rss+xml",
        "application/xml",
        "text/xml",
      ].includes(contentType)
    )
      throw new SourceRetrievalError("invalid_content_type");
    let body: string;
    try {
      body = new TextDecoder("utf-8", { fatal: true }).decode(response.body);
    } catch {
      throw new SourceRetrievalError("malformed_source");
    }
    return {
      body,
      bytes: response.body.byteLength,
      contentType,
      finalUrl: current.toString(),
    };
  }
}

async function fetchOnce(
  url: URL,
  dependencies: SafeFetchDependencies,
  signal?: AbortSignal,
) {
  if (signal?.aborted) throw new SourceRetrievalError("timeout", true);
  const addresses = await dependencies.resolve(url.hostname).catch(() => {
    throw new SourceRetrievalError(
      "transient_failure",
      true,
      undefined,
      "dns_failure",
    );
  });
  if (
    !addresses.length ||
    addresses.some((address) => !isPublicAddress(address.address))
  )
    throw new SourceRetrievalError(
      "policy_denied",
      false,
      undefined,
      "unsafe_address",
    );
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(
    () => controller.abort(),
    externalResearchLimits.sourceTimeoutMs,
  );
  try {
    const response = await dependencies.transport({
      address: addresses[0]!,
      signal: controller.signal,
      url,
    });
    if (response.body.byteLength > externalResearchLimits.responseBytes)
      throw new SourceRetrievalError("oversized_response");
    return response;
  } catch (error) {
    if (error instanceof SourceRetrievalError) throw error;
    if (controller.signal.aborted)
      throw new SourceRetrievalError("timeout", true);
    throw new SourceRetrievalError(
      "transient_failure",
      true,
      undefined,
      networkDiagnosticCategory(error),
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export function validatePublicHttpsUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SourceRetrievalError("invalid_source");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (
    url.protocol !== "https:" ||
    Boolean(url.username || url.password) ||
    (url.port !== "" && url.port !== "443") ||
    isIP(hostname) !== 0 ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  )
    throw new SourceRetrievalError("policy_denied");
  url.hash = "";
  return url;
}

export function isPublicAddress(address: string) {
  const family = isIP(address);
  if (family === 4) {
    const octets = address.split(".").map(Number);
    const [a, b, c] = octets;
    if (a === undefined || b === undefined || c === undefined) return false;
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }
  if (family === 6) {
    const normalized = address.toLowerCase();
    return (
      (normalized.startsWith("2") || normalized.startsWith("3")) &&
      !normalized.startsWith("2001:db8:")
    );
  }
  return false;
}

export async function withSourceRetry<T>(
  operation: () => Promise<T>,
  sleep: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  signal?: AbortSignal,
) {
  try {
    return await operation();
  } catch (error) {
    if (!(error instanceof SourceRetrievalError) || !error.retryable)
      throw error;
    if (signal?.aborted) throw new SourceRetrievalError("timeout", true);
    await waitForRetry(
      sleep,
      Math.min(error.retryAfterMs ?? 250, 10_000),
      signal,
    );
    return operation();
  }
}

async function waitForRetry(
  sleep: (milliseconds: number) => Promise<void>,
  milliseconds: number,
  signal?: AbortSignal,
) {
  if (!signal) return sleep(milliseconds);
  let rejectForAbort: (reason: SourceRetrievalError) => void = () => undefined;
  const abort = () => rejectForAbort(new SourceRetrievalError("timeout", true));
  const aborted = new Promise<never>((_, reject) => {
    rejectForAbort = reject;
    signal.addEventListener("abort", abort, { once: true });
  });
  try {
    await Promise.race([sleep(milliseconds), aborted]);
  } finally {
    signal.removeEventListener("abort", abort);
  }
}

function retryAfterMilliseconds(value: string | undefined) {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}

function header(headers: TransportResponse["headers"], name: string) {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function networkDiagnosticCategory(
  error: unknown,
): "connection_failure" | "dns_failure" | "tls_failure" {
  const code = nestedErrorCode(error);
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "dns_failure";
  if (
    code.startsWith("ERR_TLS") ||
    code.startsWith("CERT_") ||
    code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
    code === "SELF_SIGNED_CERT_IN_CHAIN" ||
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
  )
    return "tls_failure";
  return "connection_failure";
}

function nestedErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const candidate = error as { cause?: unknown; code?: unknown };
  if (typeof candidate.code === "string") return candidate.code.toUpperCase();
  return candidate.cause === error ? "" : nestedErrorCode(candidate.cause);
}

function defaultDiagnosticCategory(
  category: SourceFailureCategory,
): SourceDiagnosticCategory {
  switch (category) {
    case "policy_denied":
      return "unsafe_address";
    case "timeout":
      return "timeout";
    case "invalid_content_type":
      return "invalid_content_type";
    case "oversized_response":
      return "response_too_large";
    case "malformed_source":
    case "invalid_source":
      return "malformed_payload";
    case "no_results":
      return "zero_matching_candidates";
    case "rate_limited":
    case "permanent_failure":
      return "http_status";
    case "transient_failure":
      return "connection_failure";
  }
}

async function pinnedHttpsRequest(input: {
  address: Address;
  signal: AbortSignal;
  url: URL;
}): Promise<TransportResponse> {
  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      input.url,
      {
        headers: {
          accept:
            "application/rss+xml, application/atom+xml, application/xml, text/xml",
          "accept-encoding": "identity",
          "user-agent": "StylusExternalResearch/1.0",
        },
        lookup: (_hostname, _options, callback) =>
          callback(null, input.address.address, input.address.family),
        signal: input.signal,
      },
      (response) => {
        if (
          response.headers["content-encoding"] &&
          response.headers["content-encoding"] !== "identity"
        ) {
          response.resume();
          reject(new SourceRetrievalError("invalid_content_type"));
          return;
        }
        const declared = Number(response.headers["content-length"] ?? 0);
        if (declared > externalResearchLimits.responseBytes) {
          response.resume();
          reject(new SourceRetrievalError("oversized_response"));
          return;
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        response.on("data", (chunk: Buffer) => {
          bytes += chunk.byteLength;
          if (bytes > externalResearchLimits.responseBytes) {
            response.destroy(new SourceRetrievalError("oversized_response"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          resolve({
            body: Buffer.concat(chunks),
            headers: response.headers,
            status: response.statusCode ?? 500,
          }),
        );
      },
    );
    request.on("error", reject);
    request.end();
  });
}
