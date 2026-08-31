import "server-only";

const lowInformationTokens = new Set([
  "article",
  "brand",
  "clothes",
  "clothing",
  "content",
  "consumer",
  "consumers",
  "evidence",
  "fashion",
  "finding",
  "findings",
  "growing",
  "growth",
  "indicate",
  "indicates",
  "interest",
  "marketing",
  "opportunities",
  "opportunity",
  "people",
  "repeated",
  "repeatedly",
  "say",
  "says",
  "shopper",
  "shoppers",
  "show",
  "shows",
  "signal",
  "signals",
  "style",
  "suggest",
  "suggested",
  "suggesting",
  "suggests",
  "support",
  "supported",
  "supporting",
  "supports",
  "topic",
  "topics",
  "trend",
  "trends",
]);

const requestStopWords = new Set([
  "about",
  "and",
  "are",
  "does",
  "for",
  "from",
  "how",
  "into",
  "that",
  "the",
  "their",
  "these",
  "this",
  "what",
  "when",
  "where",
  "which",
  "why",
  "with",
]);

const conceptGroups = [
  [
    "circular",
    "circularity",
    "ethical",
    "ethics",
    "preowned",
    "recommerce",
    "resale",
    "responsibility",
    "responsible",
    "secondhand",
    "sustainability",
    "sustainable",
  ],
  ["fit", "fitting", "fits"],
  ["price", "prices", "pricing"],
  ["size", "sizes", "sizing"],
] as const;

const conceptAliases = new Map<string, string>();
conceptGroups.forEach((group, index) =>
  group.forEach((token) => conceptAliases.set(token, `concept-${index + 1}`)),
);

export type FashionRelevanceProfile = Readonly<{
  explicitConcepts: readonly string[];
  questionConcepts: readonly string[];
}>;

export function createFashionRelevanceProfile(input: {
  explicitTerms: readonly string[];
  question: string;
}): FashionRelevanceProfile {
  return Object.freeze({
    explicitConcepts: meaningfulConcepts(input.explicitTerms.join(" ")),
    questionConcepts: meaningfulConcepts(input.question),
  });
}

export function isFashionResearchCandidateRelevant(
  candidateText: string,
  profile: FashionRelevanceProfile,
) {
  const candidateConcepts = new Set(tokenize(candidateText).map(toConcept));
  const requiredConcepts = profile.explicitConcepts.length
    ? profile.explicitConcepts
    : profile.questionConcepts;
  return (
    requiredConcepts.length > 0 &&
    requiredConcepts.some((concept) => candidateConcepts.has(concept))
  );
}

function meaningfulConcepts(value: string) {
  return [
    ...new Set(
      tokenize(value)
        .filter(
          (token) =>
            !lowInformationTokens.has(token) && !requestStopWords.has(token),
        )
        .map(toConcept),
    ),
  ];
}

function toConcept(token: string) {
  return conceptAliases.get(token) ?? token;
}

function tokenize(value: string) {
  return (
    value
      .normalize("NFKC")
      .toLocaleLowerCase("en-US")
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((token) => token.length >= 3) ?? []
  );
}
