import "server-only";

import type { MarketingResearchIntent } from "../external-research";

export type RedditCommunitySource = {
  community: string;
  enabled: boolean;
  id: string;
  name: string;
  relevantIntents: readonly MarketingResearchIntent[];
};

export type FashionEditorialSource = {
  articleFetchPermitted: boolean;
  canonicalDomain: string;
  category: "FASHION_EDITORIAL" | "RETAIL_ECOMMERCE";
  enabled: boolean;
  fashionRelevance: "PRIMARY" | "SUPPORTING";
  feedUrl: string;
  id: string;
  name: string;
  relevantIntents: readonly MarketingResearchIntent[];
  retrievalMode: "RSS_WITH_ARTICLE_ENRICHMENT";
};

const consumerIntents = [
  "AUDIENCE_PAIN",
  "AUDIENCE_DESIRE",
  "AUDIENCE_LANGUAGE",
  "PURCHASE_OBJECTION",
  "QUESTION_DEMAND",
  "BELIEF_OR_MISCONCEPTION",
  "CONTROVERSY_OR_DEBATE",
  "TREND_SIGNAL",
] as const satisfies readonly MarketingResearchIntent[];

const configuredCommunityIds = new Set(
  (process.env.STYLUS_REDDIT_COMMUNITY_IDS ?? "")
    .split(",")
    .map((value) => value.trim().toLocaleLowerCase("en-US"))
    .filter(Boolean),
);

const redditSources: readonly RedditCommunitySource[] = [
  {
    community: "femalefashionadvice",
    enabled: true,
    id: "female-fashion-advice",
    name: "Female Fashion Advice",
    relevantIntents: consumerIntents,
  },
  {
    community: "malefashionadvice",
    enabled: true,
    id: "male-fashion-advice",
    name: "Male Fashion Advice",
    relevantIntents: consumerIntents,
  },
  {
    community: "fashion",
    enabled: true,
    id: "fashion-community",
    name: "Fashion",
    relevantIntents: [
      "AUDIENCE_DESIRE",
      "CONTROVERSY_OR_DEBATE",
      "TREND_SIGNAL",
      "FASHION_TECH",
    ],
  },
  {
    community: "BuyItForLife",
    enabled: true,
    id: "buy-it-for-life",
    name: "Buy It For Life",
    relevantIntents: [
      "AUDIENCE_PAIN",
      "PURCHASE_OBJECTION",
      "QUESTION_DEMAND",
      "BELIEF_OR_MISCONCEPTION",
    ],
  },
  {
    community: "ethicalfashion",
    enabled: true,
    id: "ethical-fashion",
    name: "Ethical Fashion",
    relevantIntents: [
      "AUDIENCE_DESIRE",
      "PURCHASE_OBJECTION",
      "BELIEF_OR_MISCONCEPTION",
      "CONTROVERSY_OR_DEBATE",
      "TREND_SIGNAL",
      "FASHION_TECH",
    ],
  },
  {
    community: "streetwear",
    enabled: true,
    id: "streetwear",
    name: "Streetwear",
    relevantIntents: [
      "AUDIENCE_DESIRE",
      "AUDIENCE_LANGUAGE",
      "CONTROVERSY_OR_DEBATE",
      "TREND_SIGNAL",
    ],
  },
] as const;

const editorialSources: readonly FashionEditorialSource[] = [
  {
    articleFetchPermitted: true,
    canonicalDomain: "www.vogue.com",
    category: "FASHION_EDITORIAL",
    enabled: true,
    fashionRelevance: "PRIMARY",
    feedUrl: "https://www.vogue.com/feed/rss",
    id: "vogue-editorial",
    name: "Vogue",
    relevantIntents: [
      "AUDIENCE_DESIRE",
      "QUESTION_DEMAND",
      "BELIEF_OR_MISCONCEPTION",
      "CONTROVERSY_OR_DEBATE",
      "TREND_SIGNAL",
      "COMPETITOR_SIGNAL",
      "FASHION_TECH",
    ],
    retrievalMode: "RSS_WITH_ARTICLE_ENRICHMENT",
  },
  {
    articleFetchPermitted: true,
    canonicalDomain: "www.retaildive.com",
    category: "RETAIL_ECOMMERCE",
    enabled: true,
    fashionRelevance: "SUPPORTING",
    feedUrl: "https://www.retaildive.com/feeds/news/",
    id: "retail-dive",
    name: "Retail Dive",
    relevantIntents: [
      "AUDIENCE_PAIN",
      "AUDIENCE_DESIRE",
      "PURCHASE_OBJECTION",
      "QUESTION_DEMAND",
      "BELIEF_OR_MISCONCEPTION",
      "CONTROVERSY_OR_DEBATE",
      "TREND_SIGNAL",
      "COMPETITOR_SIGNAL",
      "FASHION_TECH",
    ],
    retrievalMode: "RSS_WITH_ARTICLE_ENRICHMENT",
  },
] as const;

export function listRedditCommunitySources() {
  return redditSources.filter(
    (source) =>
      source.enabled &&
      (!configuredCommunityIds.size || configuredCommunityIds.has(source.id)),
  );
}

export function getRedditCommunitySources(ids: readonly string[]) {
  const available = new Map(
    listRedditCommunitySources().map((source) => [source.id, source]),
  );
  const selected = ids.map((id) => available.get(id));
  if (selected.some((source) => !source))
    throw new Error("Reddit source registry selection is invalid.");
  return selected as RedditCommunitySource[];
}

export function listFashionEditorialSources() {
  return editorialSources.filter((source) => source.enabled);
}

export function getFashionEditorialSources(ids: readonly string[]) {
  const available = new Map(
    listFashionEditorialSources().map((source) => [source.id, source]),
  );
  const selected = ids.map((id) => available.get(id));
  if (selected.some((source) => !source))
    throw new Error("Editorial source registry selection is invalid.");
  return selected as FashionEditorialSource[];
}

export function isAllowedEditorialArticleUrl(
  rawUrl: string,
  source: FashionEditorialSource,
) {
  try {
    const url = new URL(rawUrl);
    const canonical = source.canonicalDomain.toLocaleLowerCase("en-US");
    const hostname = url.hostname.toLocaleLowerCase("en-US");
    const registrable = canonical.startsWith("www.")
      ? canonical.slice(4)
      : canonical;
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (hostname === canonical ||
        hostname === registrable ||
        hostname.endsWith(`.${registrable}`))
    );
  } catch {
    return false;
  }
}
