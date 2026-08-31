import "server-only";

import { z } from "zod";

import {
  externalResearchLimits,
  hackerNewsStreamSchema,
} from "../external-research";
import { extractArticleContent } from "./article-extractor";
import {
  mapWithConcurrency,
  matchesQueryTerms,
  normalizedContentHash,
  normalizeCanonicalUrl,
  normalizePlainText,
  type ResearchAdapterContext,
  type ResearchEvidenceDraft,
  type ResearchSourceAdapter,
  type SourceRequestFailure,
} from "./research-sources";
import {
  networkDiagnosticCategory,
  safeFetchArticle,
  type SafeFetchDependencies,
  SourceRetrievalError,
  withSourceRetry,
} from "./safe-fetch";

const HN_API = "https://hacker-news.firebaseio.com/v0";
const HN_DISCUSSION = "https://news.ycombinator.com/item?id=";

const requestSchema = z
  .object({
    queryTerms: z.array(z.string().min(1).max(80)).min(1).max(5),
    stream: hackerNewsStreamSchema,
  })
  .strict();
const hnIdsSchema = z.array(z.number().int().positive()).max(500);
const hnItemSchema = z
  .object({
    by: z.string().max(256).optional(),
    dead: z.boolean().optional(),
    descendants: z.number().int().nonnegative().optional(),
    deleted: z.boolean().optional(),
    id: z.number().int().positive(),
    kids: z.array(z.number().int().positive()).max(500).optional(),
    parent: z.number().int().positive().optional(),
    parts: z.array(z.number().int().positive()).max(500).optional(),
    poll: z.number().int().positive().optional(),
    score: z.number().int().nonnegative().optional(),
    text: z.string().max(200_000).optional(),
    time: z.number().int().positive().optional(),
    title: z.string().max(2_000).optional(),
    type: z.enum(["story", "comment", "job", "poll", "pollopt"]).optional(),
    url: z.string().max(2_000).optional(),
  })
  .strict()
  .nullable();

type HackerNewsItem = NonNullable<z.infer<typeof hnItemSchema>>;
type HackerNewsRequest = z.infer<typeof requestSchema>;

export function createHackerNewsAdapter(
  fetchImpl: typeof fetch = fetch,
  safeFetchDependencies?: SafeFetchDependencies,
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
        const loaded = await loadItems(candidates, context, fetchImpl);
        const itemFailures = loaded.flatMap(({ failure }) =>
          failure ? [failure] : [],
        );
        const eligible = loaded.flatMap(({ item }) => {
          if (!isUsableStory(item)) return [];
          const title = normalizePlainText(item.title, 300);
          const body = normalizePlainText(
            item.text,
            externalResearchLimits.enrichedItemCharacters,
          );
          const searchableText = normalizePlainText(
            `${title}\n${body}`,
            externalResearchLimits.enrichedItemCharacters,
          );
          return searchableText ? [{ body, item, searchableText, title }] : [];
        });
        const matching = eligible.filter(({ searchableText }) =>
          matchesQueryTerms(searchableText, request.queryTerms),
        );
        const enrichmentFailures: SourceRequestFailure[] = [];
        let retainedComments = 0;
        let articleRequests = 0;
        const articleUrls = new Set<string>();
        const retained = [];
        for (const candidate of matching.slice(
          0,
          externalResearchLimits.enrichedHackerNewsStories,
        )) {
          const evidence = baseEvidence(candidate, context.fetchedAt);
          const externalUrl = normalizeCanonicalUrl(candidate.item.url);
          if (
            externalUrl &&
            articleRequests < externalResearchLimits.articleRequestsPerRun &&
            !articleUrls.has(externalUrl)
          ) {
            articleUrls.add(externalUrl);
            articleRequests += 1;
            const article = await retrieveArticle(
              externalUrl,
              candidate.item,
              context,
              request.stream,
              safeFetchDependencies,
            );
            evidence.push(...article.evidence);
            enrichmentFailures.push(...article.failures);
          }
          const commentResult = await retrieveComments(
            candidate.item,
            context,
            fetchImpl,
            externalResearchLimits.commentsPerRun - retainedComments,
            request.stream,
          );
          evidence.push(...commentResult.evidence);
          retainedComments += commentResult.evidence.length;
          enrichmentFailures.push(...commentResult.failures);
          const normalizedText = normalizePlainText(
            evidence.map((entry) => entry.excerpt).join("\n\n"),
            externalResearchLimits.enrichedItemCharacters,
          );
          retained.push({
            adapterId: "hacker-news" as const,
            author: normalizePlainText(candidate.item.by, 120) || null,
            canonicalUrl: `${HN_DISCUSSION}${candidate.item.id}`,
            contentHash: normalizedContentHash(normalizedText),
            evidence,
            fetchedAt: context.fetchedAt,
            metadata: {
              articleRequests,
              comments: Math.max(0, candidate.item.descendants ?? 0),
              ...(externalUrl ? { externalUrl } : {}),
              retainedComments,
              score: Math.max(0, candidate.item.score ?? 0),
              storyType: candidate.item.type ?? "story",
              stream: request.stream,
            },
            nativeId: String(candidate.item.id),
            normalizedText,
            publishedAt: publishedAt(candidate.item),
            title: candidate.title || null,
          });
        }
        const metrics = {
          articleRequestCount: articleRequests,
          candidateCount: candidates.length,
          eligibleCandidateCount: eligible.length,
          enrichedStoryCount: retained.length,
          itemFailureCount: itemFailures.length,
          matchingCandidateCount: matching.length,
          retainedCommentCount: retainedComments,
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
          failures: [
            ...(itemFailure
              ? [sourceFailure(itemFailure, streamUrl, metrics)]
              : []),
            ...enrichmentFailures,
          ],
          items: retained,
        };
      } catch (error) {
        const failure = toRetrievalError(error, "malformed_source");
        return {
          emptyResults: [],
          failures: [
            sourceFailure(failure, streamUrl, { stream: request.stream }),
          ],
          items: [],
        };
      }
    },
  };
}

function baseEvidence(
  candidate: { body: string; item: HackerNewsItem; title: string },
  fetchedAt: string,
): ResearchEvidenceDraft[] {
  const { item, title } = candidate;
  const author = normalizePlainText(item.by, 120) || null;
  const discussionUrl = `${HN_DISCUSSION}${item.id}`;
  const externalUrl = normalizeCanonicalUrl(item.url);
  const published = publishedAt(item);
  const storyLabel = title || "HN text submission";
  const story: ResearchEvidenceDraft = {
    author,
    canonicalUrl: discussionUrl,
    evidenceType: "HN_STORY",
    excerpt: normalizePlainText(
      `${storyLabel}. Score ${Math.max(0, item.score ?? 0)}; ${Math.max(0, item.descendants ?? 0)} comments.`,
      externalResearchLimits.evidenceExcerptCharacters,
    ),
    fetchedAt,
    metadata: {
      descendants: Math.max(0, item.descendants ?? 0),
      ...(externalUrl ? { externalUrl } : {}),
      score: Math.max(0, item.score ?? 0),
      storyType: item.type ?? "story",
    },
    nativeId: String(item.id),
    parentNativeId: null,
    publishedAt: published,
    title: title || null,
  };
  return candidate.body
    ? [
        story,
        {
          author,
          canonicalUrl: discussionUrl,
          evidenceType: "HN_TEXT",
          excerpt: candidate.body.slice(
            0,
            externalResearchLimits.evidenceExcerptCharacters,
          ),
          fetchedAt,
          metadata: {},
          nativeId: String(item.id),
          parentNativeId: null,
          publishedAt: published,
          title: title || null,
        },
      ]
    : [story];
}

async function retrieveComments(
  story: HackerNewsItem,
  context: ResearchAdapterContext,
  fetchImpl: typeof fetch,
  remaining: number,
  stream: string,
) {
  const evidence: ResearchEvidenceDraft[] = [];
  const failures: SourceRequestFailure[] = [];
  const topLevelIds = (story.kids ?? []).slice(
    0,
    Math.min(externalResearchLimits.hackerNewsTopLevelComments, remaining),
  );
  const topLevel = await loadItems(
    topLevelIds,
    context,
    fetchImpl,
    externalResearchLimits.enrichmentConcurrency,
  );
  for (const loaded of topLevel) {
    if (evidence.length >= remaining) break;
    if (loaded.failure) {
      failures.push(
        sourceFailure(loaded.failure, `${HN_DISCUSSION}${story.id}`, {
          evidenceKind: "HN_COMMENT",
          storyId: story.id,
          stream,
        }),
      );
      continue;
    }
    const comment = commentEvidence(
      loaded.item,
      story.id,
      story.id,
      0,
      context.fetchedAt,
    );
    if (!comment) continue;
    evidence.push(comment);
    if (
      evidence.length >= remaining ||
      externalResearchLimits.hackerNewsCommentDepth < 1
    )
      continue;
    const replyId = loaded.item?.kids?.[0];
    if (!replyId) continue;
    const [reply] = await loadItems(
      [replyId],
      context,
      fetchImpl,
      externalResearchLimits.enrichmentConcurrency,
    );
    if (reply?.failure) {
      failures.push(
        sourceFailure(reply.failure, `${HN_DISCUSSION}${story.id}`, {
          evidenceKind: "HN_COMMENT",
          storyId: story.id,
          stream,
        }),
      );
      continue;
    }
    const nested = commentEvidence(
      reply?.item ?? null,
      loaded.item!.id,
      story.id,
      1,
      context.fetchedAt,
    );
    if (nested) evidence.push(nested);
  }
  return { evidence: evidence.slice(0, remaining), failures };
}

function commentEvidence(
  item: HackerNewsItem | null,
  expectedParentId: number,
  storyId: number,
  depth: 0 | 1,
  fetchedAt: string,
): ResearchEvidenceDraft | null {
  if (
    !item ||
    item.dead ||
    item.deleted ||
    item.type !== "comment" ||
    item.parent !== expectedParentId
  )
    return null;
  const excerpt = normalizePlainText(
    item.text,
    externalResearchLimits.hackerNewsCommentCharacters,
  );
  if (!excerpt) return null;
  return {
    author: normalizePlainText(item.by, 120) || null,
    canonicalUrl: `${HN_DISCUSSION}${item.id}`,
    evidenceType: "HN_COMMENT",
    excerpt,
    fetchedAt,
    metadata: { depth, storyId },
    nativeId: String(item.id),
    parentNativeId: String(item.parent),
    publishedAt: publishedAt(item),
    title: null,
  };
}

async function retrieveArticle(
  url: string,
  story: HackerNewsItem,
  context: ResearchAdapterContext,
  stream: string,
  dependencies?: SafeFetchDependencies,
) {
  const metadata = {
    evidenceKind: "ARTICLE_CONTENT",
    storyId: story.id,
    stream,
  };
  try {
    const loaded = await context.requestGate.run(() =>
      safeFetchArticle(url, context.budget, dependencies, context.signal),
    );
    let extracted;
    try {
      extracted = extractArticleContent(loaded.body);
    } catch {
      throw new SourceRetrievalError(
        "malformed_source",
        false,
        undefined,
        "extraction_failed",
      );
    }
    if (!extracted.chunks.length)
      throw new SourceRetrievalError(
        "no_results",
        false,
        undefined,
        "empty_content",
      );
    return {
      evidence: extracted.chunks.map(
        (excerpt, index): ResearchEvidenceDraft => ({
          author: null,
          canonicalUrl: loaded.finalUrl,
          evidenceType: "ARTICLE_CONTENT",
          excerpt,
          fetchedAt: context.fetchedAt,
          metadata: { chunk: index + 1, storyId: story.id },
          nativeId: `${story.id}:article:${index + 1}`,
          parentNativeId: String(story.id),
          publishedAt: null,
          title: extracted.title,
        }),
      ),
      failures: [],
    };
  } catch (error) {
    const failure = toRetrievalError(error, "transient_failure");
    return {
      evidence: [],
      failures: [sourceFailure(failure, url, metadata)],
    };
  }
}

async function loadItems(
  ids: number[],
  context: ResearchAdapterContext,
  fetchImpl: typeof fetch,
  concurrency: number = externalResearchLimits.concurrentRequests,
) {
  return mapWithConcurrency(ids, concurrency, async (id) =>
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
        failure: toRetrievalError(error, "transient_failure"),
        item: null,
      }),
    ),
  );
}

async function fetchHackerNewsJson<T>(
  url: string,
  context: ResearchAdapterContext,
  fetchImpl: typeof fetch,
  schema: z.ZodType<T>,
) {
  if (!url.startsWith(`${HN_API}/`))
    throw new SourceRetrievalError("policy_denied");
  if (context.signal.aborted)
    throw new SourceRetrievalError("timeout", true, undefined, "timeout");
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

function isUsableStory(item: HackerNewsItem | null): item is HackerNewsItem {
  return Boolean(
    item &&
    !item.dead &&
    !item.deleted &&
    item.type === "story" &&
    (item.title || item.text),
  );
}

function publishedAt(item: HackerNewsItem) {
  return item.time ? new Date(item.time * 1_000).toISOString() : null;
}

function toRetrievalError(
  error: unknown,
  fallback: "malformed_source" | "transient_failure",
) {
  return error instanceof SourceRetrievalError
    ? error
    : new SourceRetrievalError(
        fallback,
        fallback === "transient_failure",
        undefined,
        fallback === "malformed_source"
          ? "malformed_payload"
          : networkDiagnosticCategory(error),
      );
}

function sourceFailure(
  failure: SourceRetrievalError,
  canonicalUrl: string,
  metadata: Record<string, string | number | boolean>,
): SourceRequestFailure {
  return {
    adapterId: "hacker-news",
    canonicalUrl,
    category: failure.category,
    diagnosticCategory: failure.diagnosticCategory,
    metadata: { ...failure.diagnosticMetadata, ...metadata },
  };
}
