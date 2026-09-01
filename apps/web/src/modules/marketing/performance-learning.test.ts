import { describe, expect, it } from "vitest";

import type {
  MarketingPerformanceSnapshotRow,
  MarketingPublishedContentRow,
} from "@/lib/supabase/database.types";

import {
  deriveObservationHorizon,
  derivePerformanceLearningCandidates,
  derivePerformanceMetrics,
  median,
  PERFORMANCE_ALGORITHM_VERSION,
  performanceSnapshotSchema,
} from "./performance-learning";

const organizationId = "10000000-0000-4000-8000-000000000001";

function content(
  id: number,
  opportunity: "MYTH_BUSTING" | "RELATABLE_PAIN" | null,
): MarketingPublishedContentRow {
  return {
    archived_at: null,
    canonical_url: null,
    content_opportunity_type: opportunity,
    content_type: "REEL",
    created_at: "2026-01-01T00:00:00.000Z",
    created_by: organizationId,
    duration_seconds: 30,
    id: `20000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    internal_label: `Reel ${id}`,
    organization_id: organizationId,
    platform: "INSTAGRAM",
    platform_native_id: null,
    published_at: "2026-01-01T00:00:00.000Z",
    source_reel_brief_version_id: `30000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    updated_at: "2026-01-01T00:00:00.000Z",
    updated_by: organizationId,
  };
}

function snapshot(
  id: number,
  publishedContentId: string,
  saves: number | null,
  reach: number | null = 1_000,
): MarketingPerformanceSnapshotRow {
  return {
    average_watch_time_seconds: null,
    comments: null,
    completion_rate: null,
    created_at: "2026-01-08T00:00:00.000Z",
    entered_by: organizationId,
    follows: null,
    id: `40000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    likes: null,
    link_clicks: null,
    notes: null,
    observed_at: "2026-01-08T00:00:00.000Z",
    organization_id: organizationId,
    profile_visits: null,
    published_content_id: publishedContentId,
    reach,
    saves,
    shares: null,
    source_label: null,
    source_type: "MANUAL",
    total_watch_time_seconds: null,
    views: null,
  };
}

describe("performance snapshot normalization", () => {
  it("preserves unavailable metrics as null and a supplied zero as zero", () => {
    const parsed = performanceSnapshotSchema.parse({
      averageWatchTimeSeconds: "",
      comments: "",
      completionRate: "",
      follows: "",
      likes: "0",
      linkClicks: "",
      notes: "",
      observedAt: "2026-01-02T00:00:00.000Z",
      profileVisits: "",
      publishedContentId: "20000000-0000-4000-8000-000000000001",
      reach: "",
      saves: "",
      shares: "",
      sourceLabel: "",
      totalWatchTimeSeconds: "",
      views: "",
    });
    expect(parsed.likes).toBe(0);
    expect(parsed.views).toBeNull();
    expect(parsed.reach).toBeNull();
  });

  it("rejects negative, overflowing, out-of-range, and all-blank metrics", () => {
    const base = {
      averageWatchTimeSeconds: "",
      comments: "",
      completionRate: "",
      follows: "",
      likes: "",
      linkClicks: "",
      notes: "",
      observedAt: "2026-01-02T00:00:00.000Z",
      profileVisits: "",
      publishedContentId: "20000000-0000-4000-8000-000000000001",
      reach: "",
      saves: "",
      shares: "",
      sourceLabel: "",
      totalWatchTimeSeconds: "",
      views: "",
    };
    expect(performanceSnapshotSchema.safeParse(base).success).toBe(false);
    expect(
      performanceSnapshotSchema.safeParse({ ...base, views: "-1" }).success,
    ).toBe(false);
    expect(
      performanceSnapshotSchema.safeParse({
        ...base,
        views: "9000000000000001",
      }).success,
    ).toBe(false);
    expect(
      performanceSnapshotSchema.safeParse({
        ...base,
        completionRate: "1.01",
      }).success,
    ).toBe(false);
  });
});

describe("deterministic derived performance metrics", () => {
  it("uses explicit denominators and never manufactures a zero rate", () => {
    const derived = derivePerformanceMetrics(
      {
        average_watch_time_seconds: 15,
        comments: 5,
        follows: 2,
        likes: 20,
        profile_visits: 10,
        reach: 100,
        saves: 10,
        shares: 5,
        views: 200,
      },
      30,
    );
    expect(derived.engagements).toBe(40);
    expect(derived.engagementRateByReach).toBe(0.4);
    expect(derived.engagementRateByViews).toBe(0.2);
    expect(derived.saveRateByReach).toBe(0.1);
    expect(derived.saveRateByViews).toBe(0.05);
    expect(derived.averageWatchPercentage).toBe(0.5);
  });

  it("returns unavailable for missing or zero denominators", () => {
    const derived = derivePerformanceMetrics(
      {
        average_watch_time_seconds: null,
        comments: 0,
        follows: 0,
        likes: 0,
        profile_visits: 0,
        reach: 0,
        saves: 0,
        shares: 0,
        views: null,
      },
      null,
    );
    expect(derived.engagements).toBe(0);
    expect(derived.engagementRateByReach).toBeNull();
    expect(derived.saveRateByViews).toBeNull();
    expect(derived.averageWatchPercentage).toBeNull();
  });
});

describe("performance comparability", () => {
  const published = "2026-01-01T00:00:00.000Z";
  it.each([
    ["2026-01-01T23:59:59.999Z", "EARLY"],
    ["2026-01-02T00:00:00.000Z", "SHORT_TERM"],
    ["2026-01-03T23:59:59.999Z", "SHORT_TERM"],
    ["2026-01-04T00:00:00.000Z", "SEVEN_DAY"],
    ["2026-01-08T23:59:59.999Z", "SEVEN_DAY"],
    ["2026-01-09T00:00:00.000Z", "MATURE"],
  ])("places %s in %s", (observed, expected) => {
    expect(deriveObservationHorizon(published, observed)).toBe(expected);
  });
  it("rejects an observation before publication", () => {
    expect(
      deriveObservationHorizon(published, "2025-12-31T23:59:59.999Z"),
    ).toBeNull();
  });
  it("computes an exact median without mutating the input", () => {
    const values = [9, 1, 5, 3];
    expect(median(values)).toBe(4);
    expect(values).toEqual([9, 1, 5, 3]);
  });
});

describe("bounded deterministic Performance Learnings", () => {
  it("compares six latest same-horizon Reels and preserves exact evidence", () => {
    const contents = [
      content(1, "RELATABLE_PAIN"),
      content(2, "RELATABLE_PAIN"),
      content(3, "RELATABLE_PAIN"),
      content(4, "MYTH_BUSTING"),
      content(5, "MYTH_BUSTING"),
      content(6, "MYTH_BUSTING"),
    ];
    const snapshots = contents.map((item, index) =>
      snapshot(index + 1, item.id, [10, 20, 30, 70, 80, 90][index]!),
    );
    const candidates = derivePerformanceLearningCandidates({
      contents,
      snapshots,
    });
    expect(candidates).toHaveLength(2);
    const myth = candidates.find(
      (candidate) => candidate.subjectValue === "MYTH_BUSTING",
    )!;
    expect(myth.horizon).toBe("SEVEN_DAY");
    expect(myth.sampleCount).toBe(3);
    expect(myth.baselineSampleCount).toBe(6);
    expect(myth.segmentValue).toBe(0.08);
    expect(myth.baselineValue).toBe(0.05);
    expect(myth.difference).toBeCloseTo(0.03);
    expect(myth.evidenceStrength).toBe("WEAK");
    expect(myth.evidence.map((item) => item.snapshotId)).toEqual(
      snapshots.map((item) => item.id),
    );
    expect(
      myth.evidence.filter((item) => item.evidenceRole === "SEGMENT"),
    ).toHaveLength(3);
    const pain = candidates.find(
      (candidate) => candidate.subjectValue === "RELATABLE_PAIN",
    )!;
    expect(pain.difference).toBeLessThan(0);
    expect(PERFORMANCE_ALGORITHM_VERSION).toBe(
      "marketing-performance-learning-v1",
    );
  });

  it("creates no fake learning below either sample threshold", () => {
    const contents = [
      content(1, "MYTH_BUSTING"),
      content(2, "MYTH_BUSTING"),
      content(3, "RELATABLE_PAIN"),
      content(4, "RELATABLE_PAIN"),
      content(5, null),
    ];
    expect(
      derivePerformanceLearningCandidates({
        contents,
        snapshots: contents.map((item, index) =>
          snapshot(index + 1, item.id, 10 + index),
        ),
      }),
    ).toEqual([]);
  });

  it("allows unclassified content in the baseline without treating NULL as a segment", () => {
    const contents = [
      content(1, "MYTH_BUSTING"),
      content(2, "MYTH_BUSTING"),
      content(3, "MYTH_BUSTING"),
      content(4, null),
      content(5, null),
    ];
    const candidates = derivePerformanceLearningCandidates({
      contents,
      snapshots: contents.map((item, index) =>
        snapshot(index + 1, item.id, 10 + index),
      ),
    });
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      baselineSampleCount: 5,
      sampleCount: 3,
      subjectValue: "MYTH_BUSTING",
    });
    expect(
      candidates.some((candidate) => candidate.subjectValue === "null"),
    ).toBe(false);
  });

  it("uses only the latest snapshot for one content within a horizon", () => {
    const contents = Array.from({ length: 5 }, (_, index) =>
      content(index + 1, "MYTH_BUSTING"),
    );
    const snapshots = contents.map((item, index) =>
      snapshot(index + 1, item.id, 10 + index),
    );
    snapshots.push({
      ...snapshot(99, contents[0]!.id, 90),
      observed_at: "2026-01-08T12:00:00.000Z",
    });
    const [candidate] = derivePerformanceLearningCandidates({
      contents,
      snapshots,
    });
    expect(candidate?.baselineSampleCount).toBe(5);
    expect(candidate?.evidence).toHaveLength(5);
    expect(
      candidate?.evidence.some((item) =>
        item.snapshotId.endsWith("000000000099"),
      ),
    ).toBe(true);
  });

  it("never combines organizations into one baseline", () => {
    const contents = Array.from({ length: 6 }, (_, index) => ({
      ...content(index + 1, "MYTH_BUSTING"),
      organization_id:
        index < 3
          ? "10000000-0000-4000-8000-000000000001"
          : "10000000-0000-4000-8000-000000000002",
    }));
    expect(
      derivePerformanceLearningCandidates({
        contents,
        snapshots: contents.map((item, index) =>
          snapshot(index + 1, item.id, 10 + index),
        ),
      }),
    ).toEqual([]);
  });

  it("describes an equal segment median without claiming it is higher", () => {
    const contents = Array.from({ length: 5 }, (_, index) =>
      content(index + 1, "MYTH_BUSTING"),
    );
    const [candidate] = derivePerformanceLearningCandidates({
      contents,
      snapshots: contents.map((item, index) =>
        snapshot(index + 1, item.id, 10),
      ),
    });
    expect(candidate?.difference).toBe(0);
    expect(candidate?.summary).toContain("equal to the 5-Reel");
  });
});
