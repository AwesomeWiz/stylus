import "server-only";

import { z } from "zod";

import { serverEnv } from "@/lib/env/server";

import { externalResearchLimits } from "../external-research";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

const tavilyResponseSchema = z
  .object({
    results: z
      .array(
        z
          .object({
            published_date: z.string().max(80).nullish(),
            title: z.string().max(500),
            url: z.string().max(2_000),
          })
          .strip(),
      )
      .max(externalResearchLimits.webResultsPerQuery),
  })
  .strip();

export type WebDiscoveryProviderStatus = "AVAILABLE" | "UNCONFIGURED";

export type WebDiscoveryCandidate = {
  publishedAt: string | null;
  title: string;
  url: string;
};

export type WebDiscoverySearchResult = {
  candidates: WebDiscoveryCandidate[];
  inspectedCount: number;
};

export class WebDiscoveryProviderError extends Error {
  constructor(
    readonly category:
      | "authentication_failed"
      | "rate_limited"
      | "timeout"
      | "malformed_response"
      | "transient_failure",
  ) {
    super(`Web discovery provider failed: ${category}`);
    this.name = "WebDiscoveryProviderError";
  }
}

export interface WebDiscoveryProvider {
  readonly id: "tavily";
  readonly status: WebDiscoveryProviderStatus;
  search(input: {
    maximum: number;
    query: string;
    signal: AbortSignal;
  }): Promise<WebDiscoverySearchResult>;
}

type FetchLike = typeof fetch;

export function createTavilyWebDiscoveryProvider(
  apiKey: string,
  fetcher: FetchLike = fetch,
): WebDiscoveryProvider {
  return {
    id: "tavily",
    status: "AVAILABLE",
    async search(input) {
      let response: Response;
      try {
        response = await fetcher(TAVILY_SEARCH_URL, {
          body: JSON.stringify({
            include_answer: false,
            include_images: false,
            include_raw_content: false,
            max_results: Math.min(
              input.maximum,
              externalResearchLimits.webResultsPerQuery,
            ),
            query: input.query,
            search_depth: "basic",
          }),
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          signal: input.signal,
        });
      } catch (error) {
        if (input.signal.aborted || isAbortError(error))
          throw new WebDiscoveryProviderError("timeout");
        throw new WebDiscoveryProviderError("transient_failure");
      }
      if (response.status === 401 || response.status === 403)
        throw new WebDiscoveryProviderError("authentication_failed");
      if (response.status === 408 || response.status === 504)
        throw new WebDiscoveryProviderError("timeout");
      if ([429, 432, 433].includes(response.status))
        throw new WebDiscoveryProviderError("rate_limited");
      if (!response.ok)
        throw new WebDiscoveryProviderError(
          response.status >= 500 ? "transient_failure" : "malformed_response",
        );
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw new WebDiscoveryProviderError("malformed_response");
      const declaredLength = Number(
        response.headers.get("content-length") ?? 0,
      );
      if (declaredLength > externalResearchLimits.webSearchResponseBytes)
        throw new WebDiscoveryProviderError("malformed_response");
      const bytes = await readBoundedBody(
        response,
        externalResearchLimits.webSearchResponseBytes,
      );
      if (bytes.byteLength > externalResearchLimits.webSearchResponseBytes)
        throw new WebDiscoveryProviderError("malformed_response");
      try {
        const payload = tavilyResponseSchema.parse(
          JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
        );
        return {
          candidates: payload.results.map((candidate) => ({
            publishedAt: normalizePublishedAt(candidate.published_date),
            title: candidate.title,
            url: candidate.url,
          })),
          inspectedCount: payload.results.length,
        };
      } catch {
        throw new WebDiscoveryProviderError("malformed_response");
      }
    },
  };
}

export function getWebDiscoveryProvider(): WebDiscoveryProvider | null {
  const apiKey = serverEnv.STYLUS_WEB_DISCOVERY_TAVILY_API_KEY?.trim();
  return apiKey ? createTavilyWebDiscoveryProvider(apiKey) : null;
}

export function getWebDiscoveryProviderCapability() {
  return {
    id: "tavily" as const,
    status: (serverEnv.STYLUS_WEB_DISCOVERY_TAVILY_API_KEY
      ? "AVAILABLE"
      : "UNCONFIGURED") as WebDiscoveryProviderStatus,
  };
}

function normalizePublishedAt(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

async function readBoundedBody(response: Response, maximumBytes: number) {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        throw new WebDiscoveryProviderError("malformed_response");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof WebDiscoveryProviderError) throw error;
    throw new WebDiscoveryProviderError("malformed_response");
  } finally {
    reader.releaseLock();
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}
