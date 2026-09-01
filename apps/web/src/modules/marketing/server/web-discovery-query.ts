import "server-only";

import type { MarketingResearchIntent } from "../external-research";

const genericTokens = new Set([
  "clothes",
  "clothing",
  "consumer",
  "consumers",
  "fashion",
  "interest",
  "marketing",
  "shopper",
  "shoppers",
  "style",
  "trend",
  "trends",
]);

const stopWords = new Set([
  "about",
  "and",
  "are",
  "describe",
  "does",
  "find",
  "for",
  "from",
  "have",
  "how",
  "into",
  "people",
  "show",
  "that",
  "the",
  "their",
  "these",
  "this",
  "trying",
  "use",
  "what",
  "when",
  "where",
  "which",
  "why",
  "with",
]);

const intentModifiers: Record<MarketingResearchIntent, readonly string[]> = {
  AUDIENCE_PAIN: ["problems complaints", "frustrations discussion"],
  AUDIENCE_DESIRE: ["customer preferences", "buying guide"],
  AUDIENCE_LANGUAGE: ["customer language complaints", "forum discussion"],
  PURCHASE_OBJECTION: ["purchase objections reviews", "buying problems"],
  QUESTION_DEMAND: ["questions advice", "frequently asked"],
  BELIEF_OR_MISCONCEPTION: ["misconceptions explained", "consumer discussion"],
  CONTROVERSY_OR_DEBATE: ["debate discussion", "different opinions"],
  TREND_SIGNAL: ["trend analysis", "market discussion"],
  COMPETITOR_SIGNAL: ["brand coverage reviews", "public campaign analysis"],
  FASHION_TECH: ["technology analysis", "consumer adoption"],
};

export function buildWebDiscoveryQueries(input: {
  intent: MarketingResearchIntent;
  queryTerms: readonly string[];
  question: string;
}) {
  const explicit = input.queryTerms
    .map(normalizePhrase)
    .filter(Boolean)
    .filter(hasMeaningfulToken);
  const bases = explicit.length
    ? explicit
    : fallbackQuestionConcepts(input.question);
  if (!bases.length) return [];
  const concepts = [...new Set(bases)].slice(0, 3);
  const modifiers = intentModifiers[input.intent];
  const queries = concepts.map((concept, index) =>
    normalizePhrase(`${concept} ${modifiers[index % modifiers.length]}`),
  );
  return [...new Set(queries)].slice(0, 3);
}

function fallbackQuestionConcepts(question: string) {
  const tokens = tokenize(question).filter(
    (token) => !genericTokens.has(token) && !stopWords.has(token),
  );
  return tokens.length ? [tokens.slice(0, 5).join(" ")] : [];
}

function hasMeaningfulToken(value: string) {
  return tokenize(value).some(
    (token) => !genericTokens.has(token) && !stopWords.has(token),
  );
}

function normalizePhrase(value: string) {
  return tokenize(value).join(" ").slice(0, 120);
}

function tokenize(value: string) {
  return (
    value
      .normalize("NFKC")
      .toLocaleLowerCase("en-US")
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((token) => token.length >= 2) ?? []
  );
}
