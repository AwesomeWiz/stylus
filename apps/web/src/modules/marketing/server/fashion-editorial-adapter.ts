import "server-only";

import { z } from "zod";

import { externalResearchLimits } from "../external-research";
import { extractArticleContent } from "./article-extractor";
import {
  createFashionRelevanceProfile,
  isFashionResearchCandidateRelevant,
  type FashionRelevanceProfile,
} from "./fashion-relevance";
import {
  getFashionEditorialSources,
  isAllowedEditorialArticleUrl,
  type FashionEditorialSource,
} from "./fashion-research-source-registry";
import {
  getFashionSearchProvider,
  type FashionSearchCandidate,
  type FashionSearchProvider,
} from "./fashion-search-provider";
import {
  normalizedContentHash,
  normalizeCanonicalUrl,
  normalizePlainText,
  type AdapterResult,
  type NormalizedResearchItem,
  type ResearchAdapterContext,
  type ResearchEvidenceDraft,
  type ResearchSourceAdapter,
  type SourceRequestFailure,
} from "./research-sources";
import { createRssAtomAdapter } from "./rss-atom-adapter";
import {
  safeFetchArticle,
  type SafeFetchDependencies,
  SourceRetrievalError,
} from "./safe-fetch";

const requestSchema = z
  .object({
    includeSearchDiscovery: z.boolean(),
    question: z.string().trim().min(10).max(500),
    queryTerms: z.array(z.string().min(1).max(80)).min(1).max(5),
    sourceIds: z.array(z.string().min(2).max(64)).min(1).max(2),
  })
  .strict();
type FashionEditorialRequest = z.infer<typeof requestSchema>;

export function createFashionEditorialAdapter(
  dependencies: {
    safeFetch?: SafeFetchDependencies;
    searchProvider?: FashionSearchProvider | null;
  } = {},
): ResearchSourceAdapter<FashionEditorialRequest> {
  return {
    displayName: "Fashion editorial",
    id: "fashion-editorial",
    requestSchema,
    async retrieve(request, context) {
      const sources = getFashionEditorialSources(request.sourceIds);
      const relevance = createFashionRelevanceProfile({
        explicitTerms: request.queryTerms,
        question: request.question,
      });
      const rss = createRssAtomAdapter(dependencies.safeFetch, (candidate) =>
        isFashionResearchCandidateRelevant(candidate, relevance),
      );
      const feedResults = await Promise.all(
        sources.map(async (source) => {
          const result = await rss.retrieve(
            { queryTerms: request.queryTerms, url: source.feedUrl },
            context,
          );
          return projectFeedResult(result, source);
        }),
      );
      const failures = feedResults.flatMap((result) => result.failures);
      const emptyResults = feedResults.flatMap(
        (result) => result.emptyResults ?? [],
      );
      const feedItems = feedResults.flatMap((result) => result.items);
      let articleRequests = 0;
      const enrichedItems: NormalizedResearchItem[] = [];
      for (const item of feedItems) {
        const source = sources.find(
          (candidate) => candidate.id === item.metadata.sourceId,
        );
        if (!source) continue;
        const canEnrich =
          source.articleFetchPermitted &&
          item.canonicalUrl &&
          isAllowedEditorialArticleUrl(item.canonicalUrl, source) &&
          articleRequests < externalResearchLimits.articleRequestsPerRun;
        if (!canEnrich) {
          enrichedItems.push(item);
          continue;
        }
        articleRequests += 1;
        const article = await retrieveEditorialArticle(
          item.canonicalUrl!,
          source,
          item.nativeId,
          context,
          relevance,
          dependencies.safeFetch,
        );
        failures.push(...article.failures);
        enrichedItems.push(withArticleEvidence(item, article.evidence));
      }

      if (request.includeSearchDiscovery) {
        const provider =
          dependencies.searchProvider === undefined
            ? getFashionSearchProvider()
            : dependencies.searchProvider;
        if (!provider) {
          failures.push({
            adapterId: "fashion-editorial",
            canonicalUrl: null,
            category: "policy_denied",
            diagnosticCategory: "source_unavailable",
            metadata: { retrievalMode: "SEARCH_PROVIDER" },
          });
        } else {
          const discovered = await retrieveSearchCandidates(
            provider,
            sources,
            request.queryTerms,
            relevance,
            context,
            dependencies.safeFetch,
          );
          failures.push(...discovered.failures);
          enrichedItems.push(...discovered.items);
        }
      }
      return { emptyResults, failures, items: enrichedItems };
    },
  };
}

function projectFeedResult(
  result: AdapterResult,
  source: FashionEditorialSource,
): AdapterResult {
  return {
    emptyResults: result.emptyResults?.map((outcome) => ({
      ...outcome,
      adapterId: "fashion-editorial" as const,
      metadata: {
        ...outcome.metadata,
        category: source.category,
        sourceId: source.id,
        sourceName: source.name,
      },
    })),
    failures: result.failures.map((failure) => ({
      ...failure,
      adapterId: "fashion-editorial" as const,
      metadata: {
        ...failure.metadata,
        category: source.category,
        sourceId: source.id,
        sourceName: source.name,
      },
    })),
    items: result.items
      .slice(0, externalResearchLimits.editorialItemsPerFeed)
      .map((item) => ({
        ...item,
        adapterId: "fashion-editorial" as const,
        evidence: item.evidence.map((evidence) => ({
          ...evidence,
          metadata: {
            ...evidence.metadata,
            category: source.category,
            sourceId: source.id,
            sourceName: source.name,
          },
        })),
        metadata: {
          ...item.metadata,
          category: source.category,
          sourceId: source.id,
          sourceName: source.name,
          sourceRequest: `fashion-editorial:${source.id}`,
        },
      })),
  };
}

async function retrieveSearchCandidates(
  provider: FashionSearchProvider,
  sources: FashionEditorialSource[],
  queryTerms: string[],
  relevance: FashionRelevanceProfile,
  context: ResearchAdapterContext,
  safeFetchDependencies?: SafeFetchDependencies,
) {
  const failures: SourceRequestFailure[] = [];
  const items: NormalizedResearchItem[] = [];
  let candidates: FashionSearchCandidate[];
  try {
    candidates = await context.requestGate.run(() =>
      provider.search({
        allowedDomains: sources.map((source) => source.canonicalDomain),
        maximum: externalResearchLimits.articleRequestsPerRun,
        queryTerms,
        signal: context.signal,
      }),
    );
  } catch {
    return {
      failures: [
        {
          adapterId: "fashion-editorial" as const,
          canonicalUrl: null,
          category: "transient_failure" as const,
          diagnosticCategory: "connection_failure" as const,
          metadata: {
            providerId: provider.id,
            retrievalMode: "SEARCH_PROVIDER",
          },
        },
      ],
      items,
    };
  }
  const seen = new Set<string>();
  for (const candidate of candidates.slice(
    0,
    externalResearchLimits.articleRequestsPerRun,
  )) {
    const source = sources.find((entry) => entry.id === candidate.sourceId);
    const canonical = normalizeCanonicalUrl(candidate.url);
    if (
      !source ||
      !canonical ||
      seen.has(canonical) ||
      !isAllowedEditorialArticleUrl(canonical, source)
    ) {
      failures.push({
        adapterId: "fashion-editorial",
        canonicalUrl: canonical,
        category: "policy_denied",
        diagnosticCategory: "source_not_allowlisted",
        metadata: { providerId: provider.id, retrievalMode: "SEARCH_PROVIDER" },
      });
      continue;
    }
    if (!isFashionResearchCandidateRelevant(candidate.title ?? "", relevance))
      continue;
    seen.add(canonical);
    const article = await retrieveEditorialArticle(
      canonical,
      source,
      null,
      context,
      relevance,
      safeFetchDependencies,
    );
    failures.push(...article.failures);
    if (!article.evidence.length) continue;
    const normalizedText = normalizePlainText(
      article.evidence.map((evidence) => evidence.excerpt).join("\n\n"),
      externalResearchLimits.enrichedItemCharacters,
    );
    items.push({
      adapterId: "fashion-editorial",
      author: null,
      canonicalUrl: canonical,
      contentHash: normalizedContentHash(normalizedText),
      evidence: article.evidence,
      fetchedAt: context.fetchedAt,
      metadata: {
        category: source.category,
        providerId: provider.id,
        sourceId: source.id,
        sourceName: source.name,
        sourceRequest: `fashion-editorial-search:${source.id}`,
      },
      nativeId: normalizedContentHash(canonical).slice(0, 32),
      normalizedText,
      publishedAt: null,
      title: normalizePlainText(candidate.title, 300) || null,
    });
  }
  return { failures, items };
}

async function retrieveEditorialArticle(
  url: string,
  source: FashionEditorialSource,
  parentNativeId: string | null,
  context: ResearchAdapterContext,
  relevance: FashionRelevanceProfile,
  dependencies?: SafeFetchDependencies,
) {
  try {
    const loaded = await context.requestGate.run(() =>
      safeFetchArticle(url, context.budget, dependencies, context.signal),
    );
    if (!isAllowedEditorialArticleUrl(loaded.finalUrl, source))
      throw new SourceRetrievalError(
        "policy_denied",
        false,
        undefined,
        "source_not_allowlisted",
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
    if (
      !isFashionResearchCandidateRelevant(
        `${extracted.title ?? ""}\n${extracted.chunks.join("\n")}`,
        relevance,
      )
    )
      throw new SourceRetrievalError(
        "no_results",
        false,
        undefined,
        "zero_matching_candidates",
      );
    return {
      evidence: extracted.chunks.map(
        (excerpt, index): ResearchEvidenceDraft => ({
          author: null,
          canonicalUrl: loaded.finalUrl,
          evidenceType: "ARTICLE_CONTENT",
          excerpt,
          fetchedAt: context.fetchedAt,
          metadata: {
            category: source.category,
            chunk: index + 1,
            sourceId: source.id,
            sourceName: source.name,
          },
          nativeId: `${source.id}:article:${normalizedContentHash(loaded.finalUrl).slice(0, 16)}:${index + 1}`,
          parentNativeId,
          publishedAt: null,
          title: extracted.title,
        }),
      ),
      failures: [],
    };
  } catch (error) {
    const failure =
      error instanceof SourceRetrievalError
        ? error
        : new SourceRetrievalError("transient_failure", true);
    return {
      evidence: [],
      failures: [
        {
          adapterId: "fashion-editorial" as const,
          canonicalUrl: url,
          category: failure.category,
          diagnosticCategory: failure.diagnosticCategory,
          metadata: {
            ...failure.diagnosticMetadata,
            evidenceKind: "ARTICLE_CONTENT",
            sourceId: source.id,
            sourceName: source.name,
          },
        },
      ],
    };
  }
}

function withArticleEvidence(
  item: NormalizedResearchItem,
  articleEvidence: ResearchEvidenceDraft[],
) {
  if (!articleEvidence.length) return item;
  const evidence = [...item.evidence, ...articleEvidence];
  const normalizedText = normalizePlainText(
    evidence.map((entry) => entry.excerpt).join("\n\n"),
    externalResearchLimits.enrichedItemCharacters,
  );
  return {
    ...item,
    contentHash: normalizedContentHash(normalizedText),
    evidence,
    normalizedText,
  };
}
