import "server-only";

import {
  externalResearchLimits,
  fashionResearchSourcePlanSchema,
  type FashionResearchSourcePlan,
  type MarketingResearchIntent,
  type ResearchSourceFamily,
} from "../external-research";
import {
  listFashionEditorialSources,
  listRedditCommunitySources,
} from "./fashion-research-source-registry";
import { getRedditConfiguration } from "./reddit-configuration";

type PlanInput = {
  hackerNewsStream: "top" | "new" | "ask" | null;
  intent: MarketingResearchIntent;
  queryTerms: string[];
};

const sourceFamiliesByIntent: Record<
  MarketingResearchIntent,
  readonly ResearchSourceFamily[]
> = {
  AUDIENCE_PAIN: ["REDDIT", "EDITORIAL"],
  AUDIENCE_DESIRE: ["REDDIT", "EDITORIAL"],
  AUDIENCE_LANGUAGE: ["REDDIT"],
  PURCHASE_OBJECTION: ["REDDIT", "EDITORIAL"],
  QUESTION_DEMAND: ["REDDIT", "EDITORIAL"],
  BELIEF_OR_MISCONCEPTION: ["REDDIT", "EDITORIAL"],
  CONTROVERSY_OR_DEBATE: ["REDDIT", "EDITORIAL"],
  TREND_SIGNAL: ["EDITORIAL", "REDDIT"],
  COMPETITOR_SIGNAL: ["EDITORIAL"],
  FASHION_TECH: ["HACKER_NEWS", "EDITORIAL", "REDDIT"],
};

const redditCommunityPriority: Record<
  MarketingResearchIntent,
  readonly string[]
> = {
  AUDIENCE_PAIN: ["female-fashion-advice", "male-fashion-advice"],
  AUDIENCE_DESIRE: ["fashion-community", "streetwear"],
  AUDIENCE_LANGUAGE: ["female-fashion-advice", "streetwear"],
  PURCHASE_OBJECTION: ["buy-it-for-life", "ethical-fashion"],
  QUESTION_DEMAND: ["female-fashion-advice", "male-fashion-advice"],
  BELIEF_OR_MISCONCEPTION: ["ethical-fashion", "buy-it-for-life"],
  CONTROVERSY_OR_DEBATE: ["ethical-fashion", "fashion-community"],
  TREND_SIGNAL: ["fashion-community", "streetwear"],
  COMPETITOR_SIGNAL: [],
  FASHION_TECH: ["fashion-community", "ethical-fashion"],
};

export function planFashionResearch(
  input: PlanInput,
): FashionResearchSourcePlan {
  const selectedSourceFamilies = [...sourceFamiliesByIntent[input.intent]];
  const redditById = new Map(
    listRedditCommunitySources()
      .filter((source) => source.relevantIntents.includes(input.intent))
      .map((source) => [source.id, source]),
  );
  const reddit = redditCommunityPriority[input.intent]
    .flatMap((id) => (redditById.has(id) ? [redditById.get(id)!] : []))
    .slice(0, externalResearchLimits.redditCommunitiesPerRun);
  const editorial = listFashionEditorialSources()
    .filter((source) => source.relevantIntents.includes(input.intent))
    .sort((left, right) =>
      left.fashionRelevance === right.fashionRelevance
        ? left.id.localeCompare(right.id)
        : left.fashionRelevance === "PRIMARY"
          ? -1
          : 1,
    )
    .slice(0, externalResearchLimits.editorialFeedsPerRun);
  const reasonCodes = new Set<
    FashionResearchSourcePlan["reasonCodes"][number]
  >();
  if (selectedSourceFamilies.includes("REDDIT")) {
    reasonCodes.add(
      input.intent === "AUDIENCE_LANGUAGE"
        ? "CONSUMER_LANGUAGE_SOURCE"
        : "CONSUMER_DISCUSSION_SOURCE",
    );
  }
  if (selectedSourceFamilies.includes("EDITORIAL")) {
    reasonCodes.add(
      input.intent === "TREND_SIGNAL"
        ? "EDITORIAL_TREND_SOURCE"
        : input.intent === "COMPETITOR_SIGNAL"
          ? "PUBLIC_COMPETITOR_SOURCE"
          : "EDITORIAL_CONTEXT_SOURCE",
    );
    reasonCodes.add("EXISTING_FEED_SOURCE");
  }
  if (selectedSourceFamilies.includes("HACKER_NEWS"))
    reasonCodes.add("TECHNICAL_DISCUSSION_SOURCE");

  return fashionResearchSourcePlanSchema.parse({
    editorial: {
      includeSearchDiscovery: input.intent === "COMPETITOR_SIGNAL",
      sourceIds: editorial.map((source) => source.id),
    },
    hackerNews: selectedSourceFamilies.includes("HACKER_NEWS")
      ? { stream: input.hackerNewsStream ?? "new" }
      : null,
    intent: input.intent,
    reasonCodes: [...reasonCodes],
    reddit: {
      communityIds: reddit.map((source) => source.id),
      queryVariants: input.queryTerms.slice(
        0,
        externalResearchLimits.redditQueryVariants,
      ),
    },
    selectedSourceFamilies,
    version: "marketing-fashion-source-plan-v1",
  });
}

export function assertFashionResearchPlan(
  plan: FashionResearchSourcePlan,
  input: Omit<PlanInput, "hackerNewsStream">,
) {
  const expected = planFashionResearch({
    ...input,
    hackerNewsStream: plan.hackerNews?.stream ?? null,
  });
  if (JSON.stringify(expected) !== JSON.stringify(plan))
    throw new Error("Persisted research source plan is invalid.");
}

export function getFashionResearchPlanPreviews() {
  const redditAvailable = getRedditConfiguration() !== null;
  return Object.keys(sourceFamiliesByIntent).map((intent) => {
    const typedIntent = intent as MarketingResearchIntent;
    const plan = planFashionResearch({
      hackerNewsStream: null,
      intent: typedIntent,
      queryTerms: ["fashion"],
    });
    const editorialNames = new Map(
      listFashionEditorialSources().map((source) => [source.id, source.name]),
    );
    const redditNames = new Map(
      listRedditCommunitySources().map((source) => [source.id, source.name]),
    );
    return {
      intent: typedIntent,
      reasonCodes: plan.reasonCodes,
      sources: [
        ...(plan.selectedSourceFamilies.includes("REDDIT")
          ? [
              {
                available:
                  redditAvailable && plan.reddit.communityIds.length > 0,
                family: "REDDIT" as const,
                labels: plan.reddit.communityIds.map(
                  (id) => redditNames.get(id) ?? id,
                ),
              },
            ]
          : []),
        ...(plan.selectedSourceFamilies.includes("EDITORIAL")
          ? [
              {
                available: true,
                family: "EDITORIAL" as const,
                labels: plan.editorial.sourceIds.map(
                  (id) => editorialNames.get(id) ?? id,
                ),
              },
            ]
          : []),
        ...(plan.selectedSourceFamilies.includes("HACKER_NEWS")
          ? [
              {
                available: true,
                family: "HACKER_NEWS" as const,
                labels: ["Hacker News"],
              },
            ]
          : []),
      ],
    };
  });
}
