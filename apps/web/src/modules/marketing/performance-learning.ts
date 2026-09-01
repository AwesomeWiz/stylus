import { z } from "zod";

import type {
  MarketingPerformanceHorizon,
  MarketingPerformanceSnapshotRow,
  MarketingPublishedContentRow,
} from "@/lib/supabase/database.types";

import { contentOpportunityTypeSchema } from "./external-research";

export const PERFORMANCE_ALGORITHM_VERSION =
  "marketing-performance-learning-v1" as const;
export const PERFORMANCE_LIMITS = Object.freeze({
  contents: 100,
  learningsPerRequest: 20,
  snapshots: 500,
});

export interface PerformanceActionState {
  createdCount?: number;
  fieldErrors?: Record<string, string[]>;
  message?: string;
  status: "idle" | "error" | "success";
}

export const initialPerformanceActionState: PerformanceActionState = {
  status: "idle",
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);
const optionalId = optionalText(64).pipe(z.string().uuid().nullable());
const optionalUrl = optionalText(500).pipe(
  z.string().url().startsWith("https://").nullable(),
);
const optionalCount = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : Number(value)))
  .pipe(z.number().int().min(0).max(9_000_000_000_000_000).nullable());
const optionalDecimal = (max: number) =>
  z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .pipe(z.number().finite().min(0).max(max).nullable());

export const registerPublishedContentSchema = z.object({
  canonicalUrl: optionalUrl,
  contentOpportunityType: optionalText(80).pipe(
    contentOpportunityTypeSchema.nullable(),
  ),
  durationSeconds: optionalDecimal(10_800).refine(
    (value) => value === null || value > 0,
    "Duration must be greater than zero.",
  ),
  internalLabel: z.string().trim().min(1).max(160),
  platformNativeId: optionalText(160),
  publishedAt: z.string().datetime(),
  sourceReelBriefVersionId: optionalId,
});

export const performanceSnapshotSchema = z
  .object({
    averageWatchTimeSeconds: optionalDecimal(9_000_000_000_000_000),
    comments: optionalCount,
    completionRate: optionalDecimal(1),
    follows: optionalCount,
    likes: optionalCount,
    linkClicks: optionalCount,
    notes: optionalText(1000),
    observedAt: z.string().datetime(),
    profileVisits: optionalCount,
    publishedContentId: z.string().uuid(),
    reach: optionalCount,
    saves: optionalCount,
    shares: optionalCount,
    sourceLabel: optionalText(160),
    totalWatchTimeSeconds: optionalDecimal(9_000_000_000_000_000),
    views: optionalCount,
  })
  .refine(
    (value) =>
      [
        value.averageWatchTimeSeconds,
        value.comments,
        value.completionRate,
        value.follows,
        value.likes,
        value.linkClicks,
        value.profileVisits,
        value.reach,
        value.saves,
        value.shares,
        value.totalWatchTimeSeconds,
        value.views,
      ].some((metric) => metric !== null),
    { message: "Supply at least one metric.", path: ["views"] },
  );

export const publishedContentLifecycleSchema = z.object({
  archived: z.enum(["true", "false"]).transform((value) => value === "true"),
  publishedContentId: z.string().uuid(),
});

export interface DerivedPerformanceMetrics {
  averageWatchPercentage: number | null;
  commentRateByReach: number | null;
  commentRateByViews: number | null;
  engagementRateByReach: number | null;
  engagementRateByViews: number | null;
  engagements: number | null;
  followConversionByReach: number | null;
  likeRateByReach: number | null;
  likeRateByViews: number | null;
  profileActionRateByReach: number | null;
  saveRateByReach: number | null;
  saveRateByViews: number | null;
  shareRateByReach: number | null;
  shareRateByViews: number | null;
}

function rate(numerator: number | null, denominator: number | null) {
  return numerator === null || denominator === null || denominator === 0
    ? null
    : numerator / denominator;
}

export function derivePerformanceMetrics(
  snapshot: Pick<
    MarketingPerformanceSnapshotRow,
    | "average_watch_time_seconds"
    | "comments"
    | "follows"
    | "likes"
    | "profile_visits"
    | "reach"
    | "saves"
    | "shares"
    | "views"
  >,
  durationSeconds: number | null,
): DerivedPerformanceMetrics {
  const engagementParts = [
    snapshot.likes,
    snapshot.comments,
    snapshot.shares,
    snapshot.saves,
  ];
  const engagements = engagementParts.every((value) => value !== null)
    ? engagementParts.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    : null;
  return {
    averageWatchPercentage: rate(
      snapshot.average_watch_time_seconds,
      durationSeconds,
    ),
    commentRateByReach: rate(snapshot.comments, snapshot.reach),
    commentRateByViews: rate(snapshot.comments, snapshot.views),
    engagementRateByReach: rate(engagements, snapshot.reach),
    engagementRateByViews: rate(engagements, snapshot.views),
    engagements,
    followConversionByReach: rate(snapshot.follows, snapshot.reach),
    likeRateByReach: rate(snapshot.likes, snapshot.reach),
    likeRateByViews: rate(snapshot.likes, snapshot.views),
    profileActionRateByReach: rate(snapshot.profile_visits, snapshot.reach),
    saveRateByReach: rate(snapshot.saves, snapshot.reach),
    saveRateByViews: rate(snapshot.saves, snapshot.views),
    shareRateByReach: rate(snapshot.shares, snapshot.reach),
    shareRateByViews: rate(snapshot.shares, snapshot.views),
  };
}

export function deriveObservationHorizon(
  publishedAt: string,
  observedAt: string,
): MarketingPerformanceHorizon | null {
  const age = new Date(observedAt).getTime() - new Date(publishedAt).getTime();
  if (!Number.isFinite(age) || age < 0) return null;
  const hour = 60 * 60 * 1000;
  if (age < 24 * hour) return "EARLY";
  if (age < 72 * hour) return "SHORT_TERM";
  if (age < 8 * 24 * hour) return "SEVEN_DAY";
  return "MATURE";
}

export function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export interface PerformanceLearningCandidate {
  baselineSampleCount: number;
  baselineValue: number;
  caveats: string[];
  difference: number;
  evidence: Array<{
    evidenceRole: "BASELINE" | "SEGMENT";
    publishedContentId: string;
    snapshotId: string;
  }>;
  evidenceStrength: "WEAK" | "MODERATE" | "STRONG";
  horizon: MarketingPerformanceHorizon;
  sampleCount: number;
  segmentValue: number;
  subjectValue: string;
  summary: string;
}

type Comparable = {
  content: MarketingPublishedContentRow;
  rate: number;
  snapshot: MarketingPerformanceSnapshotRow;
};

export function derivePerformanceLearningCandidates(input: {
  contents: MarketingPublishedContentRow[];
  snapshots: MarketingPerformanceSnapshotRow[];
}): PerformanceLearningCandidate[] {
  const contentById = new Map(
    input.contents
      .filter((content) => content.archived_at === null)
      .slice(0, PERFORMANCE_LIMITS.contents)
      .map((content) => [content.id, content]),
  );
  const latest = new Map<string, Comparable>();
  for (const snapshot of input.snapshots.slice(
    0,
    PERFORMANCE_LIMITS.snapshots,
  )) {
    const content = contentById.get(snapshot.published_content_id);
    if (!content || snapshot.saves === null || !snapshot.reach) continue;
    const horizon = deriveObservationHorizon(
      content.published_at,
      snapshot.observed_at,
    );
    if (!horizon) continue;
    const key = `${content.id}:${horizon}`;
    const existing = latest.get(key);
    if (!existing || snapshot.observed_at > existing.snapshot.observed_at)
      latest.set(key, {
        content,
        rate: snapshot.saves / snapshot.reach,
        snapshot,
      });
  }

  const groups = new Map<string, Comparable[]>();
  for (const item of latest.values()) {
    const horizon = deriveObservationHorizon(
      item.content.published_at,
      item.snapshot.observed_at,
    )!;
    const key = `${item.content.organization_id}:${item.content.platform}:${horizon}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const candidates: PerformanceLearningCandidate[] = [];
  for (const baselineGroup of groups.values()) {
    if (baselineGroup.length < 5) continue;
    const baselineValue = median(baselineGroup.map((item) => item.rate))!;
    const horizon = deriveObservationHorizon(
      baselineGroup[0]!.content.published_at,
      baselineGroup[0]!.snapshot.observed_at,
    )!;
    const segments = new Map<string, Comparable[]>();
    for (const item of baselineGroup) {
      const subject = item.content.content_opportunity_type;
      if (subject)
        segments.set(subject, [...(segments.get(subject) ?? []), item]);
    }
    for (const [subjectValue, segment] of [...segments].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      if (segment.length < 3) continue;
      const segmentValue = median(segment.map((item) => item.rate))!;
      const difference = segmentValue - baselineValue;
      const evidenceStrength =
        segment.length >= 10
          ? "STRONG"
          : segment.length >= 5
            ? "MODERATE"
            : "WEAK";
      const comparison =
        difference > 0
          ? "higher than"
          : difference < 0
            ? "lower than"
            : "equal to";
      const segmentIds = new Set(segment.map((item) => item.snapshot.id));
      candidates.push({
        baselineSampleCount: baselineGroup.length,
        baselineValue,
        caveats: [
          "This is a descriptive organization-local comparison; association is not causation.",
          ...(segment.length < 5
            ? [
                "The segment is small, so treat this as weak directional evidence.",
              ]
            : []),
        ],
        difference,
        evidence: baselineGroup.map((item) => ({
          evidenceRole: segmentIds.has(item.snapshot.id)
            ? "SEGMENT"
            : "BASELINE",
          publishedContentId: item.content.id,
          snapshotId: item.snapshot.id,
        })),
        evidenceStrength,
        horizon,
        sampleCount: segment.length,
        segmentValue,
        subjectValue,
        summary: `Among ${segment.length} comparable Instagram Reels in the ${horizon} horizon, ${subjectValue} content had a median save rate by reach ${comparison} the ${baselineGroup.length}-Reel organization baseline.`,
      });
    }
  }
  return candidates.slice(0, PERFORMANCE_LIMITS.learningsPerRequest);
}
