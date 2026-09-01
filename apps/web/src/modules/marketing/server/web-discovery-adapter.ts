import "server-only";

import { z } from "zod";

import { externalResearchLimits } from "../external-research";
import { extractArticleContent } from "./article-extractor";
import {
  createFashionRelevanceProfile,
  isFashionResearchCandidateRelevant,
} from "./fashion-relevance";
import {
  mapWithConcurrency,
  normalizedContentHash,
  normalizePlainText,
  type AdapterResult,
  type NormalizedResearchItem,
  type ResearchAdapterContext,
  type ResearchEvidenceDraft,
  type ResearchSourceAdapter,
  type SourceRequestFailure,
} from "./research-sources";
import {
  safeFetchArticle,
  safeFetchRobots,
  type SafeFetchDependencies,
  SourceRetrievalError,
} from "./safe-fetch";
import {
  applyDiscoveredWebUrlPolicy,
  classifyWebSource,
  isRobotsPathAllowed,
} from "./web-source-policy";
import {
  getWebDiscoveryProvider,
  type WebDiscoveryCandidate,
  type WebDiscoveryProvider,
  WebDiscoveryProviderError,
} from "./web-discovery-provider";

const requestSchema = z
  .object({
    queryTerms: z.array(z.string().trim().min(1).max(80)).min(1).max(5),
    queryVariants: z.array(z.string().trim().min(1).max(160)).min(1).max(3),
    question: z.string().trim().min(10).max(500),
  })
  .strict();
type WebDiscoveryRequest = z.infer<typeof requestSchema>;

type CandidateWithQuery = WebDiscoveryCandidate & {
  queryVariantId: string;
};

export function createWebDiscoveryAdapter(
  dependencies: {
    provider?: WebDiscoveryProvider | null;
    safeFetch?: SafeFetchDependencies;
  } = {},
): ResearchSourceAdapter<WebDiscoveryRequest> {
  return {
    displayName: "Web discovery",
    id: "web-discovery",
    requestSchema,
    async retrieve(request, context) {
      const provider =
        dependencies.provider === undefined
          ? getWebDiscoveryProvider()
          : dependencies.provider;
      if (!provider) return unavailableResult("UNCONFIGURED");
      const relevance = createFashionRelevanceProfile({
        explicitTerms: request.queryTerms,
        question: request.question,
      });
      const searchResults = await Promise.all(
        request.queryVariants
          .slice(0, externalResearchLimits.webQueriesPerRun)
          .map(async (query, index) => {
            try {
              const result = await context.requestGate.run(() =>
                provider.search({
                  maximum: externalResearchLimits.webResultsPerQuery,
                  query,
                  signal: context.signal,
                }),
              );
              return {
                candidates: result.candidates.map((candidate) => ({
                  ...candidate,
                  queryVariantId: `WEB-Q${index + 1}`,
                })),
                failure: null,
                inspectedCount: result.inspectedCount,
              };
            } catch (error) {
              return {
                candidates: [] as CandidateWithQuery[],
                failure: providerFailure(provider.id, error, index + 1),
                inspectedCount: 0,
              };
            }
          }),
      );
      const failures = searchResults.flatMap((result) =>
        result.failure ? [result.failure] : [],
      );
      const inspectedCount = searchResults.reduce(
        (total, result) => total + result.inspectedCount,
        0,
      );
      const candidates = uniqueCandidates(
        searchResults.flatMap((result) => result.candidates),
      );
      const relevant: CandidateWithQuery[] = [];
      for (const candidate of candidates) {
        const canonicalUrl = applyDiscoveredWebUrlPolicy(candidate.url);
        if (!canonicalUrl) {
          failures.push(candidatePolicyFailure(provider.id, candidate));
          continue;
        }
        if (
          !isFashionResearchCandidateRelevant(
            `${candidate.title}\n${new URL(canonicalUrl).hostname}\n${new URL(canonicalUrl).pathname}`,
            relevance,
          )
        )
          continue;
        relevant.push({ ...candidate, url: canonicalUrl });
      }
      if (!candidates.length && !failures.length)
        return emptyResult(
          provider.id,
          request.queryVariants.length,
          0,
          "zero_candidates",
        );
      if (!relevant.length && !failures.length)
        return emptyResult(
          provider.id,
          request.queryVariants.length,
          inspectedCount,
          "zero_matching_candidates",
        );

      const fetchCandidates = relevant.slice(
        0,
        externalResearchLimits.webUrlsFetchedPerRun,
      );
      const robotsByOrigin = new Map<string, Promise<boolean>>();
      const loaded = await mapWithConcurrency(fetchCandidates, 3, (candidate) =>
        retrieveCandidate(
          candidate,
          provider.id,
          relevance,
          context,
          robotsByOrigin,
          dependencies.safeFetch,
        ),
      );
      failures.push(...loaded.flatMap((result) => result.failures));
      const items = loaded
        .flatMap((result) => result.items)
        .slice(0, externalResearchLimits.webPagesPerRun);
      return {
        failures,
        items,
        ...(items.length || failures.length
          ? {}
          : emptyResult(
              provider.id,
              request.queryVariants.length,
              inspectedCount,
              "zero_matching_candidates",
            )),
      };
    },
  };
}

async function retrieveCandidate(
  candidate: CandidateWithQuery,
  providerId: string,
  relevance: ReturnType<typeof createFashionRelevanceProfile>,
  context: ResearchAdapterContext,
  robotsByOrigin: Map<string, Promise<boolean>>,
  safeFetchDependencies?: SafeFetchDependencies,
): Promise<AdapterResult> {
  try {
    const origin = new URL(candidate.url).origin;
    let robotsAllowed = robotsByOrigin.get(origin);
    if (!robotsAllowed) {
      robotsAllowed = retrieveRobotsPolicy(
        candidate.url,
        context,
        safeFetchDependencies,
      );
      robotsByOrigin.set(origin, robotsAllowed);
    }
    if (!(await robotsAllowed))
      throw new SourceRetrievalError(
        "policy_denied",
        false,
        undefined,
        "robots_denied",
      );
    const loaded = await context.requestGate.run(() =>
      safeFetchArticle(
        candidate.url,
        context.budget,
        safeFetchDependencies,
        context.signal,
      ),
    );
    const finalUrl = applyDiscoveredWebUrlPolicy(loaded.finalUrl);
    if (!finalUrl)
      throw new SourceRetrievalError(
        "policy_denied",
        false,
        undefined,
        "url_policy_rejected",
      );
    const extracted = extractArticleContent(loaded.body);
    if (!extracted.chunks.length)
      throw new SourceRetrievalError(
        "no_results",
        false,
        undefined,
        "empty_content",
      );
    const relevantText = `${extracted.title ?? candidate.title}\n${extracted.chunks.join("\n")}`;
    if (!isFashionResearchCandidateRelevant(relevantText, relevance))
      throw new SourceRetrievalError(
        "no_results",
        false,
        undefined,
        "zero_matching_candidates",
      );
    const sourceClass = classifyWebSource(finalUrl);
    const sourceDomain = new URL(finalUrl).hostname;
    const evidence = extracted.chunks
      .slice(0, 2)
      .map((excerpt, index): ResearchEvidenceDraft => ({
        author: null,
        canonicalUrl: finalUrl,
        evidenceType: "WEB_PAGE",
        excerpt: normalizePlainText(
          excerpt,
          externalResearchLimits.evidenceExcerptCharacters,
        ),
        fetchedAt: context.fetchedAt,
        metadata: {
          chunk: index + 1,
          evidenceQuality: "FULL_PAGE",
          providerId,
          queryVariantId: candidate.queryVariantId,
          sourceClass,
          sourceDomain,
        },
        nativeId: `web:${normalizedContentHash(finalUrl).slice(0, 20)}:${index + 1}`,
        parentNativeId: null,
        publishedAt: candidate.publishedAt,
        title:
          extracted.title ?? (normalizePlainText(candidate.title, 300) || null),
      }))
      .filter((entry) => entry.excerpt.length > 0)
      .slice(0, externalResearchLimits.webEvidenceItemsPerRun);
    if (!evidence.length)
      throw new SourceRetrievalError(
        "no_results",
        false,
        undefined,
        "empty_content",
      );
    const normalizedText = normalizePlainText(
      evidence.map((entry) => entry.excerpt).join("\n\n"),
      externalResearchLimits.enrichedItemCharacters,
    );
    const item: NormalizedResearchItem = {
      adapterId: "web-discovery",
      author: null,
      canonicalUrl: finalUrl,
      contentHash: normalizedContentHash(normalizedText),
      evidence,
      fetchedAt: context.fetchedAt,
      metadata: {
        evidenceQuality: "FULL_PAGE",
        providerId,
        queryVariantId: candidate.queryVariantId,
        sourceClass,
        sourceDomain,
        sourceRequest: `web-discovery:${providerId}:${candidate.queryVariantId}`,
      },
      nativeId: normalizedContentHash(finalUrl).slice(0, 32),
      normalizedText,
      publishedAt: candidate.publishedAt,
      title:
        extracted.title ?? (normalizePlainText(candidate.title, 300) || null),
    };
    return { failures: [], items: [item] };
  } catch (error) {
    const failure =
      error instanceof SourceRetrievalError
        ? error
        : new SourceRetrievalError(
            "malformed_source",
            false,
            undefined,
            "extraction_failed",
          );
    return {
      failures: [
        {
          adapterId: "web-discovery",
          canonicalUrl: candidate.url,
          category: failure.category,
          diagnosticCategory: failure.diagnosticCategory,
          metadata: {
            ...failure.diagnosticMetadata,
            providerId,
            queryVariantId: candidate.queryVariantId,
          },
        },
      ],
      items: [],
    };
  }
}

async function retrieveRobotsPolicy(
  url: string,
  context: ResearchAdapterContext,
  dependencies?: SafeFetchDependencies,
) {
  try {
    const robots = await context.requestGate.run(() =>
      safeFetchRobots(url, context.budget, dependencies, context.signal),
    );
    return isRobotsPathAllowed(robots.body, url);
  } catch (error) {
    if (
      error instanceof SourceRetrievalError &&
      error.diagnosticCategory === "http_status" &&
      (error.diagnosticMetadata.httpStatus === 404 ||
        error.diagnosticMetadata.httpStatus === 410)
    )
      return true;
    throw new SourceRetrievalError(
      "policy_denied",
      false,
      undefined,
      "robots_unavailable",
    );
  }
}

function uniqueCandidates(candidates: CandidateWithQuery[]) {
  const seen = new Set<string>();
  const unique: CandidateWithQuery[] = [];
  for (const candidate of candidates) {
    const canonical = applyDiscoveredWebUrlPolicy(candidate.url);
    const key = canonical ?? candidate.url;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
    if (unique.length >= externalResearchLimits.webCandidateUrlsPerRun) break;
  }
  return unique;
}

function providerFailure(
  providerId: string,
  error: unknown,
  queryVariant: number,
): SourceRequestFailure {
  const category =
    error instanceof WebDiscoveryProviderError
      ? error.category
      : "transient_failure";
  const mapped =
    category === "authentication_failed"
      ? {
          category: "policy_denied" as const,
          diagnostic: "provider_authentication_failed" as const,
        }
      : category === "rate_limited"
        ? {
            category: "rate_limited" as const,
            diagnostic: "provider_rate_limited" as const,
          }
        : category === "timeout"
          ? {
              category: "timeout" as const,
              diagnostic: "provider_timeout" as const,
            }
          : category === "malformed_response"
            ? {
                category: "malformed_source" as const,
                diagnostic: "provider_malformed_response" as const,
              }
            : {
                category: "transient_failure" as const,
                diagnostic: "connection_failure" as const,
              };
  return {
    adapterId: "web-discovery",
    canonicalUrl: null,
    category: mapped.category,
    diagnosticCategory: mapped.diagnostic,
    metadata: { providerId, queryVariantId: `WEB-Q${queryVariant}` },
  };
}

function candidatePolicyFailure(
  providerId: string,
  candidate: CandidateWithQuery,
): SourceRequestFailure {
  return {
    adapterId: "web-discovery",
    canonicalUrl: null,
    category: "policy_denied",
    diagnosticCategory: "url_policy_rejected",
    metadata: {
      providerId,
      queryVariantId: candidate.queryVariantId,
    },
  };
}

function unavailableResult(status: "UNCONFIGURED"): AdapterResult {
  return {
    failures: [
      {
        adapterId: "web-discovery",
        canonicalUrl: null,
        category: "policy_denied",
        diagnosticCategory: "source_unavailable",
        metadata: { providerId: "tavily", providerStatus: status },
      },
    ],
    items: [],
  };
}

function emptyResult(
  providerId: string,
  queryCount: number,
  candidateCount: number,
  diagnosticCategory: "zero_candidates" | "zero_matching_candidates",
): AdapterResult {
  return {
    emptyResults: [
      {
        adapterId: "web-discovery",
        canonicalUrl: null,
        diagnosticCategory,
        metadata: { candidateCount, providerId, queryCount },
      },
    ],
    failures: [],
    items: [],
  };
}
