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
import {
  networkDiagnosticCategory,
  SourceRetrievalError,
  withSourceRetry,
} from "./safe-fetch";

const HN_API = "https://hacker-news.firebaseio.com/v0";

const requestSchema = z
  .object({
    queryTerms: z.array(z.string().min(1).max(80)).min(1).max(5),
    stream: hackerNewsStreamSchema,
  })
  .strict();

const hnIdsSchema = z.array(z.number().int().positive()).max(500);
const hnItemSchema = z
  .object({
    by: z.string().optional(),
    dead: z.boolean().optional(),
    descendants: z.number().int().nonnegative().optional(),
    deleted: z.boolean().optional(),
    id: z.number().int().positive(),
    score: z.number().int().nonnegative().optional(),
    text: z.string().optional(),
    time: z.number().int().positive().optional(),
    title: z.string().optional(),
    type: z.string().optional(),
  })
  .nullable();

type HackerNewsRequest = z.infer<typeof requestSchema>;

export function createHackerNewsAdapter(
  fetchImpl: typeof fetch = fetch,
): ResearchSourceAdapter<HackerNewsRequest> {
  return {
    displayName: "Hacker News",
    id: "hacker-news",
    requestSchema,
    async retrieve(request, context) {
      const streamUrl = `https://news.ycombinator.com/${request.stream}`;
      try {
        const suffix =
          request.stream === "ask" ? "askstories" : `${request.stream}stories`;
        const ids = await withSourceRetry(
          () =>
            context.requestGate.run(() =>
              fetchHackerNewsJson(
                `${HN_API}/${suffix}.json`,
                context,
                fetchImpl,
                hnIdsSchema,
              ),
            ),
          undefined,
          context.signal,
        );
        const candidates = ids.slice(0, 20);
        const loaded = await mapWithConcurrency(
          candidates,
          externalResearchLimits.concurrentRequests,
          async (id) =>
            withSourceRetry(
              () =>
                context.requestGate.run(() =>
                  fetchHackerNewsJson(
                    `${HN_API}/item/${id}.json`,
                    context,
                    fetchImpl,
                    hnItemSchema,
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
                    : new SourceRetrievalError(
                        "transient_failure",
                        true,
                        undefined,
                        networkDiagnosticCategory(error),
                      ),
                item: null,
              }),
            ),
        );
        const itemFailures = loaded.flatMap(({ failure }) =>
          failure ? [failure] : [],
        );
        const eligible = loaded.flatMap(({ item }) => {
          if (!item || item.dead || item.deleted || item.type !== "story")
            return [];
          const title = normalizePlainText(item.title, 300);
          const body = normalizePlainText(item.text);
          const normalizedText = normalizePlainText(`${title}\n${body}`);
          return normalizedText ? [{ item, normalizedText, title }] : [];
        });
        const matching = eligible.filter(({ normalizedText }) =>
          matchesQueryTerms(normalizedText, request.queryTerms),
        );
        const retained = matching
          .map(({ item, normalizedText, title }) => ({
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
          }))
          .slice(0, externalResearchLimits.retainedItemsPerSource);
        const metrics = {
          candidateCount: candidates.length,
          eligibleCandidateCount: eligible.length,
          itemFailureCount: itemFailures.length,
          matchingCandidateCount: matching.length,
          stream: request.stream,
        };
        const itemFailure = itemFailures[0];
        return {
          emptyResults:
            !itemFailure && !retained.length
              ? [
                  {
                    adapterId: "hacker-news" as const,
                    canonicalUrl: streamUrl,
                    diagnosticCategory: eligible.length
                      ? ("zero_matching_candidates" as const)
                      : ("zero_candidates" as const),
                    metadata: metrics,
                  },
                ]
              : [],
          failures: itemFailure
            ? [
                {
                  adapterId: "hacker-news" as const,
                  canonicalUrl: streamUrl,
                  category: itemFailure.category,
                  diagnosticCategory: itemFailure.diagnosticCategory,
                  metadata: {
                    ...itemFailure.diagnosticMetadata,
                    ...metrics,
                  },
                },
              ]
            : [],
          items: retained,
        };
      } catch (error) {
        const failure =
          error instanceof SourceRetrievalError
            ? error
            : new SourceRetrievalError(
                "malformed_source",
                false,
                undefined,
                "malformed_payload",
              );
        return {
          emptyResults: [],
          failures: [
            {
              adapterId: "hacker-news",
              canonicalUrl: streamUrl,
              category: failure.category,
              diagnosticCategory: failure.diagnosticCategory,
              metadata: {
                ...failure.diagnosticMetadata,
                stream: request.stream,
              },
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
  schema: z.ZodType<T>,
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
      throw new SourceRetrievalError("timeout", true, undefined, "timeout", {
        httpStatus: response.status,
      });
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after"));
      throw new SourceRetrievalError(
        "rate_limited",
        true,
        Number.isFinite(retryAfter) && retryAfter >= 0
          ? retryAfter * 1_000
          : undefined,
        "http_status",
        { httpStatus: response.status },
      );
    }
    if ([500, 502, 503, 504].includes(response.status))
      throw new SourceRetrievalError(
        "transient_failure",
        true,
        undefined,
        "http_status",
        { httpStatus: response.status },
      );
    if (!response.ok)
      throw new SourceRetrievalError(
        "permanent_failure",
        false,
        undefined,
        "http_status",
        { httpStatus: response.status },
      );
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
    let payload: unknown;
    try {
      payload = JSON.parse(new TextDecoder().decode(body));
    } catch {
      throw new SourceRetrievalError("malformed_source");
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) throw new SourceRetrievalError("malformed_source");
    return parsed.data;
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
