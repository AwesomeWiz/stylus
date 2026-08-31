import "server-only";

import { z } from "zod";

import { externalResearchLimits } from "../external-research";
import { getRedditConfiguration } from "./reddit-configuration";
import { getRedditCommunitySources } from "./fashion-research-source-registry";
import {
  mapWithConcurrency,
  matchesQueryTerms,
  normalizedContentHash,
  normalizePlainText,
  type NormalizedResearchItem,
  type ResearchAdapterContext,
  type ResearchEvidenceDraft,
  type ResearchSourceAdapter,
  type SourceRequestFailure,
} from "./research-sources";
import { networkDiagnosticCategory, SourceRetrievalError } from "./safe-fetch";

const REDDIT_API = "https://oauth.reddit.com";
const REDDIT_TOKEN = "https://www.reddit.com/api/v1/access_token";
const REDDIT_PUBLIC = "https://www.reddit.com";

const requestSchema = z
  .object({
    communityIds: z.array(z.string().min(2).max(64)).max(2),
    queryVariants: z.array(z.string().min(1).max(80)).min(1).max(2),
  })
  .strict();

const tokenSchema = z
  .object({
    access_token: z.string().min(1).max(4_096),
    expires_in: z.number().positive().max(86_400),
    token_type: z.string().max(32),
  })
  .passthrough();

const postSchema = z
  .object({
    author: z.string().max(256).optional(),
    created_utc: z.number().nonnegative().optional(),
    id: z.string().min(1).max(32),
    num_comments: z.number().int().nonnegative().optional(),
    over_18: z.boolean().optional(),
    permalink: z.string().max(1_000),
    score: z.number().int().optional(),
    selftext: z.string().max(200_000).optional(),
    stickied: z.boolean().optional(),
    subreddit: z.string().min(1).max(128),
    title: z.string().min(1).max(2_000),
  })
  .passthrough();

const commentSchema = z
  .object({
    author: z.string().max(256).optional(),
    body: z.string().max(200_000).optional(),
    created_utc: z.number().nonnegative().optional(),
    depth: z.number().int().nonnegative().optional(),
    id: z.string().min(1).max(32),
    parent_id: z.string().max(64).optional(),
    permalink: z.string().max(1_000).optional(),
    replies: z.unknown().optional(),
    score: z.number().int().optional(),
    subreddit: z.string().min(1).max(128).optional(),
  })
  .passthrough();

const listingSchema = z
  .object({
    data: z
      .object({
        children: z
          .array(
            z
              .object({ kind: z.string().max(16), data: z.unknown() })
              .passthrough(),
          )
          .max(100),
      })
      .passthrough(),
  })
  .passthrough();

type RedditRequest = z.infer<typeof requestSchema>;
type RedditPost = z.infer<typeof postSchema>;
type RedditConfiguration = NonNullable<
  ReturnType<typeof getRedditConfiguration>
>;

export function createRedditAdapter(
  fetchImpl: typeof fetch = fetch,
  configuration: RedditConfiguration | null = getRedditConfiguration(),
): ResearchSourceAdapter<RedditRequest> {
  return {
    displayName: "Reddit",
    id: "reddit",
    requestSchema,
    async retrieve(request, context) {
      const communities = getRedditCommunitySources(request.communityIds);
      if (!configuration || !communities.length)
        return {
          emptyResults: [],
          failures: [
            {
              adapterId: "reddit" as const,
              canonicalUrl: REDDIT_API,
              category: "policy_denied" as const,
              diagnosticCategory: "source_unavailable" as const,
              metadata: {
                configured: Boolean(configuration),
                requestedCommunityCount: communities.length,
              },
            },
          ],
          items: [],
        };

      try {
        const tokenPayload = await context.requestGate.run(() =>
          fetchRedditJson(
            REDDIT_TOKEN,
            context,
            fetchImpl,
            tokenSchema,
            configuration,
            {
              body: new URLSearchParams({ grant_type: "client_credentials" }),
              method: "POST",
              token: null,
            },
          ),
        );
        const token = tokenPayload.access_token;
        const searches = communities.flatMap((community) =>
          request.queryVariants.map((query) => ({ community, query })),
        );
        const outcomes = await mapWithConcurrency(
          searches,
          externalResearchLimits.enrichmentConcurrency,
          async ({ community, query }) => {
            const url = new URL(
              `/r/${encodeURIComponent(community.community)}/search`,
              REDDIT_API,
            );
            url.search = new URLSearchParams({
              limit: String(
                externalResearchLimits.redditCandidatePostsPerQuery,
              ),
              q: query,
              raw_json: "1",
              restrict_sr: "on",
              sort: "relevance",
              t: "year",
              type: "link",
            }).toString();
            return context.requestGate
              .run(() =>
                fetchRedditJson(
                  url.toString(),
                  context,
                  fetchImpl,
                  listingSchema,
                  configuration,
                  { token },
                ),
              )
              .then(
                (payload) => ({ community, payload, query }),
                (error: unknown) => ({
                  community,
                  error: toRetrievalError(error),
                  query,
                }),
              );
          },
        );
        const failures: SourceRequestFailure[] = outcomes.flatMap((outcome) =>
          "error" in outcome
            ? [
                redditFailure(outcome.error, {
                  community: outcome.community.community,
                  queryVariant: outcome.query,
                }),
              ]
            : [],
        );
        const candidates: RedditPost[] = [];
        const seen = new Set<string>();
        for (const outcome of outcomes) {
          if ("error" in outcome) continue;
          for (const child of outcome.payload.data.children.slice(
            0,
            externalResearchLimits.redditCandidatePostsPerQuery,
          )) {
            if (child.kind !== "t3") continue;
            const parsed = postSchema.safeParse(child.data);
            if (!parsed.success) continue;
            const post = parsed.data;
            if (
              seen.has(post.id) ||
              post.over_18 ||
              post.stickied ||
              post.subreddit.toLocaleLowerCase("en-US") !==
                outcome.community.community.toLocaleLowerCase("en-US")
            )
              continue;
            const searchable = normalizePlainText(
              `${post.title}\n${post.selftext ?? ""}`,
              externalResearchLimits.enrichedItemCharacters,
            );
            if (!matchesQueryTerms(searchable, request.queryVariants)) continue;
            seen.add(post.id);
            candidates.push(post);
          }
        }
        const retainedPosts = candidates.slice(
          0,
          externalResearchLimits.redditPostsPerRun,
        );
        let commentBudget = externalResearchLimits.redditCommentsPerRun;
        const items: NormalizedResearchItem[] = [];
        for (const post of retainedPosts) {
          const comments =
            commentBudget > 0
              ? await retrieveRedditComments(
                  post,
                  Math.min(
                    externalResearchLimits.redditCommentsPerPost,
                    commentBudget,
                  ),
                  token,
                  context,
                  fetchImpl,
                  configuration,
                )
              : { evidence: [], failures: [] };
          failures.push(...comments.failures);
          commentBudget -= comments.evidence.length;
          items.push(
            toNormalizedPost(post, comments.evidence, context.fetchedAt),
          );
        }
        const metrics = {
          candidateCount: candidates.length,
          retainedCommentCount:
            externalResearchLimits.redditCommentsPerRun - commentBudget,
          retainedPostCount: items.length,
          searchRequestCount: searches.length,
        };
        return {
          emptyResults:
            failures.length || items.length
              ? []
              : [
                  {
                    adapterId: "reddit" as const,
                    canonicalUrl: REDDIT_API,
                    diagnosticCategory: "zero_matching_candidates" as const,
                    metadata: metrics,
                  },
                ],
          failures,
          items,
        };
      } catch (error) {
        return {
          emptyResults: [],
          failures: [
            redditFailure(toRetrievalError(error), { stage: "oauth" }),
          ],
          items: [],
        };
      }
    },
  };
}

function toNormalizedPost(
  post: RedditPost,
  comments: ResearchEvidenceDraft[],
  fetchedAt: string,
): NormalizedResearchItem {
  const title = normalizePlainText(post.title, 300);
  const body = normalizePlainText(
    post.selftext,
    externalResearchLimits.redditCommentCharacters,
  );
  const canonicalUrl = redditCanonicalUrl(post.permalink);
  const publishedAt = timestamp(post.created_utc);
  const author = publicAuthor(post.author);
  const postExcerpt = normalizePlainText(
    body ? `${title}\n${body}` : title,
    externalResearchLimits.evidenceExcerptCharacters,
  );
  const postEvidence: ResearchEvidenceDraft = {
    author,
    canonicalUrl,
    evidenceType: "REDDIT_POST",
    excerpt: postExcerpt,
    fetchedAt,
    metadata: {
      commentCount: Math.max(0, post.num_comments ?? 0),
      community: post.subreddit,
      score: Math.max(0, post.score ?? 0),
    },
    nativeId: post.id,
    parentNativeId: null,
    publishedAt,
    title,
  };
  const evidence = [postEvidence, ...comments];
  const normalizedText = normalizePlainText(
    evidence.map((entry) => entry.excerpt).join("\n\n"),
    externalResearchLimits.enrichedItemCharacters,
  );
  return {
    adapterId: "reddit",
    author,
    canonicalUrl,
    contentHash: normalizedContentHash(normalizedText),
    evidence,
    fetchedAt,
    metadata: {
      community: post.subreddit,
      comments: Math.max(0, post.num_comments ?? 0),
      retainedComments: comments.length,
      score: Math.max(0, post.score ?? 0),
      sourceRequest: `reddit:${post.subreddit}`,
    },
    nativeId: post.id,
    normalizedText,
    publishedAt,
    title,
  };
}

async function retrieveRedditComments(
  post: RedditPost,
  maximum: number,
  token: string,
  context: ResearchAdapterContext,
  fetchImpl: typeof fetch,
  configuration: RedditConfiguration,
) {
  const url = new URL(
    `/r/${encodeURIComponent(post.subreddit)}/comments/${encodeURIComponent(post.id)}`,
    REDDIT_API,
  );
  url.search = new URLSearchParams({
    depth: String(externalResearchLimits.redditCommentDepth),
    limit: String(maximum),
    raw_json: "1",
    sort: "top",
  }).toString();
  try {
    const payload = await context.requestGate.run(() =>
      fetchRedditJson(
        url.toString(),
        context,
        fetchImpl,
        z.array(listingSchema).min(2).max(2),
        configuration,
        { token },
      ),
    );
    const evidence: ResearchEvidenceDraft[] = [];
    for (const child of payload[1]!.data.children) {
      if (evidence.length >= maximum || child.kind !== "t1") break;
      const parsed = commentSchema.safeParse(child.data);
      if (!parsed.success) continue;
      const topLevel = commentEvidence(parsed.data, post, 0, context.fetchedAt);
      if (topLevel) evidence.push(topLevel);
      if (evidence.length >= maximum) break;
      const replies = listingSchema.safeParse(parsed.data.replies);
      const firstReply = replies.success
        ? replies.data.data.children.find((reply) => reply.kind === "t1")
        : undefined;
      const parsedReply = firstReply
        ? commentSchema.safeParse(firstReply.data)
        : null;
      if (parsedReply?.success) {
        const nested = commentEvidence(
          parsedReply.data,
          post,
          1,
          context.fetchedAt,
        );
        if (nested) evidence.push(nested);
      }
    }
    return { evidence: evidence.slice(0, maximum), failures: [] };
  } catch (error) {
    return {
      evidence: [],
      failures: [
        redditFailure(toRetrievalError(error), {
          community: post.subreddit,
          evidenceKind: "REDDIT_COMMENT",
          postId: post.id,
        }),
      ],
    };
  }
}

function commentEvidence(
  comment: z.infer<typeof commentSchema>,
  post: RedditPost,
  depth: 0 | 1,
  fetchedAt: string,
): ResearchEvidenceDraft | null {
  if ((comment.depth ?? depth) > externalResearchLimits.redditCommentDepth)
    return null;
  const excerpt = normalizePlainText(
    comment.body,
    externalResearchLimits.redditCommentCharacters,
  );
  if (!excerpt || excerpt === "[deleted]" || excerpt === "[removed]")
    return null;
  return {
    author: publicAuthor(comment.author),
    canonicalUrl: redditCanonicalUrl(
      comment.permalink ?? `${post.permalink}${comment.id}/`,
    ),
    evidenceType: "REDDIT_COMMENT",
    excerpt,
    fetchedAt,
    metadata: {
      community: comment.subreddit ?? post.subreddit,
      depth,
      postId: post.id,
      score: Math.max(0, comment.score ?? 0),
    },
    nativeId: comment.id,
    parentNativeId: stripKindPrefix(comment.parent_id) ?? post.id,
    publishedAt: timestamp(comment.created_utc),
    title: null,
  };
}

async function fetchRedditJson<T>(
  rawUrl: string,
  context: ResearchAdapterContext,
  fetchImpl: typeof fetch,
  schema: z.ZodType<T>,
  configuration: RedditConfiguration,
  options: {
    body?: URLSearchParams;
    method?: "GET" | "POST";
    token: string | null;
  },
) {
  const url = new URL(rawUrl);
  const tokenRequest = url.toString() === REDDIT_TOKEN;
  if (
    (!tokenRequest && url.origin !== REDDIT_API) ||
    (tokenRequest && url.origin !== "https://www.reddit.com")
  )
    throw new SourceRetrievalError("policy_denied");
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    externalResearchLimits.sourceTimeoutMs,
  );
  const abort = () => controller.abort();
  context.signal.addEventListener("abort", abort, { once: true });
  try {
    const authorization = tokenRequest
      ? `Basic ${Buffer.from(`${configuration.clientId}:${configuration.clientSecret}`, "utf8").toString("base64")}`
      : `Bearer ${options.token}`;
    const response = await fetchImpl(url, {
      body: options.body,
      headers: {
        accept: "application/json",
        authorization,
        ...(tokenRequest
          ? { "content-type": "application/x-www-form-urlencoded" }
          : {}),
        "user-agent": configuration.userAgent,
      },
      method: options.method ?? "GET",
      redirect: "error",
      signal: controller.signal,
    });
    if (response.status === 429)
      throw new SourceRetrievalError(
        "rate_limited",
        true,
        undefined,
        "http_status",
        { httpStatus: 429 },
      );
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
        response.status === 401 || response.status === 403
          ? "policy_denied"
          : "permanent_failure",
        false,
        undefined,
        "http_status",
        { httpStatus: response.status },
      );
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw new SourceRetrievalError("invalid_content_type");
    const body = await readBoundedResponse(response);
    context.budget.consume(body.byteLength);
    let value: unknown;
    try {
      value = JSON.parse(new TextDecoder().decode(body));
    } catch {
      throw new SourceRetrievalError("malformed_source");
    }
    const parsed = schema.safeParse(value);
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

async function readBoundedResponse(response: Response) {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    byteLength += part.value.byteLength;
    if (byteLength > externalResearchLimits.responseBytes) {
      await reader.cancel();
      throw new SourceRetrievalError("oversized_response");
    }
    chunks.push(part.value);
  }
  const body = new Uint8Array(byteLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return body;
}

function redditCanonicalUrl(path: string) {
  try {
    const url = new URL(path, REDDIT_PUBLIC);
    return url.origin === REDDIT_PUBLIC ? url.toString() : REDDIT_PUBLIC;
  } catch {
    return REDDIT_PUBLIC;
  }
}

function publicAuthor(value: string | undefined) {
  const author = normalizePlainText(value, 120);
  return author && author !== "[deleted]" ? author : null;
}

function timestamp(value: number | undefined) {
  return value && Number.isFinite(value)
    ? new Date(value * 1_000).toISOString()
    : null;
}

function stripKindPrefix(value: string | undefined) {
  return value?.replace(/^t\d_/, "") || null;
}

function toRetrievalError(error: unknown) {
  return error instanceof SourceRetrievalError
    ? error
    : new SourceRetrievalError("malformed_source");
}

function redditFailure(
  failure: SourceRetrievalError,
  metadata: Record<string, string | number | boolean>,
): SourceRequestFailure {
  return {
    adapterId: "reddit",
    canonicalUrl: REDDIT_API,
    category: failure.category,
    diagnosticCategory: failure.diagnosticCategory,
    metadata: { ...failure.diagnosticMetadata, ...metadata },
  };
}
