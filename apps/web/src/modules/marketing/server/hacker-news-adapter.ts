import "server-only";

import { z } from "zod";

import {
  externalResearchLimits,
  hackerNewsStreamSchema,
} from "../external-research";
import {
  mapWithConcurrency,
  matchesQueryTerms,
  normalizedContentHash,
  normalizePlainText,
  type ResearchSourceAdapter,
} from "./research-sources";
import { SourceRetrievalError, withSourceRetry } from "./safe-fetch";

const HN_API = "https://hacker-news.firebaseio.com/v0";

const requestSchema = z
  .object({
    queryTerms: z.array(z.string().min(1).max(80)).min(1).max(5),
    stream: hackerNewsStreamSchema,
  })
  .strict();

type HackerNewsRequest = z.infer<typeof requestSchema>;

type HNItem = {
  by?: string;
  descendants?: number;
  deleted?: boolean;
  id?: number;
  score?: number;
  text?: string;
  time?: number;
  title?: string;
  type?: string;
};

export function createHackerNewsAdapter(
  fetchImpl: typeof fetch = fetch,
): ResearchSourceAdapter<HackerNewsRequest> {
  return {
    displayName: "Hacker News",
    id: "hacker-news",
    requestSchema,
    async retrieve(request, context) {
      try {
        const suffix =
          request.stream === "ask" ? "askstories" : `${request.stream}stories`;
        const ids = await withSourceRetry(
          () =>
            context.requestGate.run(() =>
              fetchHackerNewsJson<number[]>(
                `${HN_API}/${suffix}.json`,
                context,
                fetchImpl,
              ),
            ),
          undefined,
          context.signal,
        );
        const candidates = Array.isArray(ids) ? ids.slice(0, 20) : [];
        const loaded = await mapWithConcurrency(
          candidates,
          externalResearchLimits.concurrentRequests,
          async (id) =>
            withSourceRetry(
              () =>
                context.requestGate.run(() =>
                  fetchHackerNewsJson<HNItem>(
                    `${HN_API}/item/${id}.json`,
                    context,
                    fetchImpl,
                  ),
                ),
              undefined,
              context.signal,
            ).then(
              (item) => ({ failure: null, item }),
              (error: unknown) => ({
                failure:
                  error instanceof SourceRetrievalError
                    ? error
                    : new SourceRetrievalError("transient_failure", true),
                item: null,
              }),
            ),
        );
        const itemFailure = loaded.find((result) => result.failure)?.failure;
        const items = loaded.flatMap(({ item }) => {
          if (!item || item.deleted || item.type !== "story" || !item.id)
            return [];
          const title = normalizePlainText(item.title, 300);
          const body = normalizePlainText(item.text);
          const normalizedText = normalizePlainText(`${title}\n${body}`);
          if (
            !normalizedText ||
            !matchesQueryTerms(normalizedText, request.queryTerms)
          )
            return [];
          return [
            {
              adapterId: "hacker-news" as const,
              author: normalizePlainText(item.by, 120) || null,
              canonicalUrl: `https://news.ycombinator.com/item?id=${item.id}`,
              contentHash: normalizedContentHash(normalizedText),
              fetchedAt: context.fetchedAt,
              metadata: {
                comments: Math.max(0, item.descendants ?? 0),
                score: Math.max(0, item.score ?? 0),
                stream: request.stream,
              },
              nativeId: String(item.id),
              normalizedText,
              publishedAt: item.time
                ? new Date(item.time * 1_000).toISOString()
                : null,
              title: title || null,
            },
          ];
        });
        const retained = items.slice(
          0,
          externalResearchLimits.retainedItemsPerSource,
        );
        return {
          failures: itemFailure
            ? [
                {
                  adapterId: "hacker-news" as const,
                  canonicalUrl: `https://news.ycombinator.com/${request.stream}`,
                  category: itemFailure.category,
                },
              ]
            : retained.length
              ? []
              : [
                  {
                    adapterId: "hacker-news" as const,
                    canonicalUrl: `https://news.ycombinator.com/${request.stream}`,
                    category: "no_results" as const,
                  },
                ],
          items: retained,
        };
      } catch (error) {
        const category =
          error instanceof SourceRetrievalError
            ? error.category
            : "malformed_source";
        return {
          failures: [
            {
              adapterId: "hacker-news",
              canonicalUrl: `https://news.ycombinator.com/${request.stream}`,
              category,
            },
          ],
          items: [],
        };
      }
    },
  };
}

async function fetchHackerNewsJson<T>(
  url: string,
  context: Parameters<
    ReturnType<typeof createHackerNewsAdapter>["retrieve"]
  >[1],
  fetchImpl: typeof fetch,
) {
  if (!url.startsWith(`${HN_API}/`))
    throw new SourceRetrievalError("policy_denied");
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    externalResearchLimits.sourceTimeoutMs,
  );
  const abort = () => controller.abort();
  context.signal.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetchImpl(url, {
      headers: { accept: "application/json" },
      redirect: "error",
      signal: controller.signal,
    });
    if (response.status === 408)
      throw new SourceRetrievalError("timeout", true);
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after"));
      throw new SourceRetrievalError(
        "rate_limited",
        true,
        Number.isFinite(retryAfter) && retryAfter >= 0
          ? retryAfter * 1_000
          : undefined,
      );
    }
    if ([500, 502, 503, 504].includes(response.status))
      throw new SourceRetrievalError("transient_failure", true);
    if (!response.ok) throw new SourceRetrievalError("permanent_failure");
    if (
      !response.headers
        .get("content-type")
        ?.toLowerCase()
        .includes("application/json")
    )
      throw new SourceRetrievalError("invalid_content_type");
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > externalResearchLimits.responseBytes)
      throw new SourceRetrievalError("oversized_response");
    const body = await readBoundedBody(response);
    context.budget.consume(body.byteLength);
    return JSON.parse(new TextDecoder().decode(body)) as T;
  } catch (error) {
    if (error instanceof SourceRetrievalError) throw error;
    if (controller.signal.aborted)
      throw new SourceRetrievalError("timeout", true);
    throw new SourceRetrievalError("transient_failure", true);
  } finally {
    clearTimeout(timer);
    context.signal.removeEventListener("abort", abort);
  }
}

async function readBoundedBody(response: Response) {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > externalResearchLimits.responseBytes) {
      await reader.cancel();
      throw new SourceRetrievalError("oversized_response");
    }
    chunks.push(part.value);
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
