"use client";

import { useActionState, useMemo, useState, useSyncExternalStore } from "react";
import {
  Archive,
  BarChart3,
  BookOpenCheck,
  ExternalLink,
  History,
  Plus,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  MarketingPerformanceLearningEvidenceRow,
  MarketingPerformanceLearningRow,
  MarketingPerformanceSnapshotRow,
  MarketingPublishedContentRow,
  MarketingReelBriefVersionRow,
  OrganizationRole,
} from "@/lib/supabase/database.types";
import { canMutateMarketing } from "@/modules/marketing/authorization";
import {
  addPerformanceSnapshotAction,
  derivePerformanceLearningsAction,
  registerPublishedContentAction,
  setPublishedContentArchivedAction,
} from "@/modules/marketing/performance-actions";
import { contentOpportunityTypes } from "@/modules/marketing/external-research";
import {
  deriveObservationHorizon,
  derivePerformanceMetrics,
  initialPerformanceActionState,
} from "@/modules/marketing/performance-learning";
import { localDateTimeToIso } from "@/modules/tasks/datetime";

type Tab = "CONTENT" | "DETAIL" | "LEARNINGS";

function subscribeToHydration() {
  return () => undefined;
}

function label(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => `${part[0]?.toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function localDate(value: string, useLocalTime: boolean) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: useLocalTime ? undefined : "UTC",
  }).format(new Date(value));
}

function metric(value: number | null) {
  return value === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US").format(value);
}

function percent(value: number | null) {
  return value === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
        style: "percent",
      }).format(value);
}

function getLearningEvidenceStatus(
  selected: MarketingPublishedContentRow | undefined,
  contents: MarketingPublishedContentRow[],
  snapshots: MarketingPerformanceSnapshotRow[],
) {
  if (!selected) return { baselineSampleCount: 0, segmentSampleCount: 0 };
  const selectedLatest = snapshots
    .filter((snapshot) => snapshot.published_content_id === selected.id)
    .sort((left, right) =>
      right.observed_at.localeCompare(left.observed_at),
    )[0];
  if (!selectedLatest) {
    return { baselineSampleCount: 0, segmentSampleCount: 0 };
  }
  const horizon = deriveObservationHorizon(
    selected.published_at,
    selectedLatest.observed_at,
  );
  if (!horizon) return { baselineSampleCount: 0, segmentSampleCount: 0 };

  const comparableContents = contents.filter(
    (content) => !content.archived_at && content.platform === selected.platform,
  );
  const eligibleContents = comparableContents.filter((content) => {
    const latestInHorizon = snapshots
      .filter(
        (snapshot) =>
          snapshot.published_content_id === content.id &&
          deriveObservationHorizon(
            content.published_at,
            snapshot.observed_at,
          ) === horizon,
      )
      .sort((left, right) =>
        right.observed_at.localeCompare(left.observed_at),
      )[0];
    return (
      latestInHorizon?.saves !== null &&
      latestInHorizon?.saves !== undefined &&
      latestInHorizon.reach !== null &&
      latestInHorizon.reach > 0
    );
  });
  return {
    baselineSampleCount: eligibleContents.length,
    segmentSampleCount: selected.content_opportunity_type
      ? eligibleContents.filter(
          (content) =>
            content.content_opportunity_type ===
            selected.content_opportunity_type,
        ).length
      : 0,
  };
}

function DateTimeInput({ label: text, name }: { label: string; name: string }) {
  const [value, setValue] = useState("");
  return (
    <label className="text-sm font-medium">
      {text}
      <Input
        className="mt-1.5"
        onChange={(event) => setValue(event.currentTarget.value)}
        required
        type="datetime-local"
        value={value}
      />
      <input name={name} type="hidden" value={localDateTimeToIso(value)} />
    </label>
  );
}

function Feedback({ state }: { state: typeof initialPerformanceActionState }) {
  const fieldError = Object.values(state.fieldErrors ?? {}).flat()[0];
  return state.message || fieldError ? (
    <p
      className={
        state.status === "error"
          ? "text-destructive text-sm"
          : "text-muted-foreground text-sm"
      }
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message ?? fieldError}
    </p>
  ) : null;
}

export function PerformanceWorkspace({
  briefs,
  contents,
  evidence,
  learnings,
  role,
  snapshots,
}: {
  briefs: MarketingReelBriefVersionRow[];
  contents: MarketingPublishedContentRow[];
  evidence: MarketingPerformanceLearningEvidenceRow[];
  learnings: MarketingPerformanceLearningRow[];
  role: OrganizationRole;
  snapshots: MarketingPerformanceSnapshotRow[];
}) {
  const editable = canMutateMarketing(role);
  const useLocalTime = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const activeContents = contents.filter((content) => !content.archived_at);
  const [tab, setTab] = useState<Tab>("CONTENT");
  const [selectedId, setSelectedId] = useState(activeContents[0]?.id ?? "");
  const selected = contents.find((content) => content.id === selectedId);
  const selectedSnapshots = snapshots
    .filter((snapshot) => snapshot.published_content_id === selectedId)
    .sort((left, right) => right.observed_at.localeCompare(left.observed_at));
  const comparableCount = useMemo(() => {
    return getLearningEvidenceStatus(selected, contents, snapshots)
      .baselineSampleCount;
  }, [contents, selected, snapshots]);

  return (
    <div className="space-y-6">
      <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
        {(
          [
            ["CONTENT", "Published content", BarChart3],
            ["DETAIL", "Performance detail", History],
            ["LEARNINGS", "Learnings", BookOpenCheck],
          ] as const
        ).map(([value, text, Icon]) => (
          <button
            aria-selected={tab === value}
            className={`flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm ${tab === value ? "border-primary font-medium" : "text-muted-foreground border-transparent"}`}
            key={value}
            onClick={() => setTab(value)}
            role="tab"
            type="button"
          >
            <Icon className="size-4" />
            {text}
          </button>
        ))}
      </div>

      {tab === "CONTENT" ? (
        <ContentTab
          briefs={briefs}
          contents={contents}
          editable={editable}
          onOpen={(id) => {
            setSelectedId(id);
            setTab("DETAIL");
          }}
          snapshots={snapshots}
          useLocalTime={useLocalTime}
        />
      ) : null}
      {tab === "DETAIL" ? (
        <DetailTab
          briefs={briefs}
          contents={activeContents}
          editable={editable}
          onSelect={setSelectedId}
          selected={selected}
          selectedId={selectedId}
          snapshots={selectedSnapshots}
          comparableCount={comparableCount}
          useLocalTime={useLocalTime}
        />
      ) : null}
      {tab === "LEARNINGS" ? (
        <LearningsTab
          contents={contents}
          editable={editable}
          evidence={evidence}
          learnings={learnings}
          useLocalTime={useLocalTime}
        />
      ) : null}
    </div>
  );
}

function ContentTab({
  briefs,
  contents,
  editable,
  onOpen,
  snapshots,
  useLocalTime,
}: {
  briefs: MarketingReelBriefVersionRow[];
  contents: MarketingPublishedContentRow[];
  editable: boolean;
  onOpen(id: string): void;
  snapshots: MarketingPerformanceSnapshotRow[];
  useLocalTime: boolean;
}) {
  const briefById = new Map(briefs.map((brief) => [brief.id, brief]));
  const [state, action, pending] = useActionState(
    registerPublishedContentAction,
    initialPerformanceActionState,
  );
  return (
    <div className="space-y-8">
      {editable ? (
        <form
          action={action}
          className="grid gap-4 border-y py-5 lg:grid-cols-2"
        >
          <div className="lg:col-span-2">
            <h2 className="font-semibold">
              Register a published Instagram Reel
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Manual registration only. Link an exact Reel Brief version when
              available.
            </p>
          </div>
          <label className="text-sm font-medium">
            Internal label
            <Input
              className="mt-1.5"
              maxLength={160}
              name="internalLabel"
              required
            />
          </label>
          <DateTimeInput label="Published at" name="publishedAt" />
          <label className="text-sm font-medium">
            Public HTTPS URL (optional)
            <Input
              className="mt-1.5"
              maxLength={500}
              name="canonicalUrl"
              type="url"
            />
          </label>
          <label className="text-sm font-medium">
            Instagram native ID (optional)
            <Input className="mt-1.5" maxLength={160} name="platformNativeId" />
          </label>
          <label className="text-sm font-medium">
            Source Reel Brief version (optional)
            <select
              className="border-input bg-background mt-1.5 h-10 w-full rounded-md border px-3 text-sm"
              name="sourceReelBriefVersionId"
            >
              <option value="">Unavailable</option>
              {briefs.map((brief) => (
                <option key={brief.id} value={brief.id}>
                  {brief.title} · v{brief.version_number}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Content opportunity type (optional)
            <select
              className="border-input bg-background mt-1.5 h-10 w-full rounded-md border px-3 text-sm"
              name="contentOpportunityType"
            >
              <option value="">Unavailable</option>
              {contentOpportunityTypes.map((type) => (
                <option key={type} value={type}>
                  {label(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Reel duration in seconds (optional)
            <Input
              className="mt-1.5"
              min="0.001"
              max="10800"
              name="durationSeconds"
              step="0.001"
              type="number"
            />
          </label>
          <div className="flex items-center gap-3 lg:col-span-2">
            <Button disabled={pending} type="submit">
              <Plus className="size-4" />
              {pending ? "Registering…" : "Register Reel"}
            </Button>
            <Feedback state={state} />
          </div>
        </form>
      ) : (
        <p className="text-muted-foreground border-y py-4 text-sm">
          Viewer access is read-only.
        </p>
      )}

      <section aria-labelledby="published-list-heading">
        <h2 className="font-semibold" id="published-list-heading">
          Published Reels
        </h2>
        {contents.length ? (
          <div className="mt-3 divide-y border-y">
            {contents.map((content) => {
              const history = snapshots.filter(
                (snapshot) => snapshot.published_content_id === content.id,
              );
              const latest = [...history].sort((a, b) =>
                b.observed_at.localeCompare(a.observed_at),
              )[0];
              const evidenceStatus = getLearningEvidenceStatus(
                content,
                contents,
                snapshots,
              );
              const evidenceReady =
                Boolean(content.content_opportunity_type) &&
                evidenceStatus.baselineSampleCount >= 5 &&
                evidenceStatus.segmentSampleCount >= 3;
              return (
                <div
                  className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                  key={content.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className="text-left font-medium underline-offset-4 hover:underline"
                        onClick={() => onOpen(content.id)}
                        type="button"
                      >
                        {content.internal_label}
                      </button>
                      {content.archived_at ? (
                        <span className="text-muted-foreground text-xs">
                          Archived
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Instagram Reel · Published{" "}
                      {localDate(content.published_at, useLocalTime)} ·{" "}
                      {history.length}{" "}
                      {history.length === 1 ? "snapshot" : "snapshots"}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Latest views: {metric(latest?.views ?? null)} · Latest
                      reach: {metric(latest?.reach ?? null)} · Creative type:{" "}
                      {content.content_opportunity_type
                        ? label(content.content_opportunity_type)
                        : "Unavailable"}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Source brief:{" "}
                      {content.source_reel_brief_version_id
                        ? `${briefById.get(content.source_reel_brief_version_id)?.title ?? "Exact Reel Brief"} · v${briefById.get(content.source_reel_brief_version_id)?.version_number ?? "?"}`
                        : "Unavailable"}{" "}
                      · Latest observation:{" "}
                      {latest
                        ? localDate(latest.observed_at, useLocalTime)
                        : "Unavailable"}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Learning evidence:{" "}
                      {evidenceReady ? "Eligible" : "Insufficient"} (
                      {evidenceStatus.baselineSampleCount}/5 baseline,{" "}
                      {evidenceStatus.segmentSampleCount}/3 segment)
                    </p>
                    {content.canonical_url ? (
                      <a
                        className="text-primary mt-2 inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                        href={content.canonical_url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open published Reel
                        <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onOpen(content.id)}
                      variant="secondary"
                    >
                      Open details
                    </Button>
                    {editable ? <ArchiveControl content={content} /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground mt-3 border-y py-8 text-center text-sm">
            No published content registered yet.
          </p>
        )}
      </section>
    </div>
  );
}

function ArchiveControl({
  content,
}: {
  content: MarketingPublishedContentRow;
}) {
  const [, action, pending] = useActionState(
    setPublishedContentArchivedAction,
    initialPerformanceActionState,
  );
  return (
    <form action={action}>
      <input name="publishedContentId" type="hidden" value={content.id} />
      <input
        name="archived"
        type="hidden"
        value={String(!content.archived_at)}
      />
      <Button
        aria-label={`${content.archived_at ? "Restore" : "Archive"} ${content.internal_label}`}
        disabled={pending}
        size="icon"
        type="submit"
        variant="ghost"
      >
        <Archive className="size-4" />
      </Button>
    </form>
  );
}

function DetailTab({
  briefs,
  contents,
  editable,
  onSelect,
  selected,
  selectedId,
  snapshots,
  comparableCount,
  useLocalTime,
}: {
  briefs: MarketingReelBriefVersionRow[];
  contents: MarketingPublishedContentRow[];
  editable: boolean;
  onSelect(id: string): void;
  selected?: MarketingPublishedContentRow;
  selectedId: string;
  snapshots: MarketingPerformanceSnapshotRow[];
  comparableCount: number;
  useLocalTime: boolean;
}) {
  const [state, action, pending] = useActionState(
    addPerformanceSnapshotAction,
    initialPerformanceActionState,
  );
  const sourceBrief = briefs.find(
    (brief) => brief.id === selected?.source_reel_brief_version_id,
  );
  const latestMetrics =
    snapshots[0] && selected
      ? derivePerformanceMetrics(snapshots[0], selected.duration_seconds)
      : null;
  return (
    <div className="space-y-6">
      <label className="block max-w-xl text-sm font-medium">
        Published Reel
        <select
          className="border-input bg-background mt-1.5 h-10 w-full rounded-md border px-3 text-sm"
          onChange={(event) => onSelect(event.target.value)}
          value={selectedId}
        >
          <option value="">Select a Reel</option>
          {contents.map((content) => (
            <option key={content.id} value={content.id}>
              {content.internal_label}
            </option>
          ))}
        </select>
      </label>
      {!selected ? (
        <p className="text-muted-foreground border-y py-8 text-center text-sm">
          Select published content to inspect performance.
        </p>
      ) : (
        <>
          <section className="grid gap-4 border-y py-5 sm:grid-cols-2 lg:grid-cols-4">
            <Info
              label="Published"
              value={localDate(selected.published_at, useLocalTime)}
            />
            <Info
              label="Source Reel Brief"
              value={
                sourceBrief
                  ? `${sourceBrief.title} · v${sourceBrief.version_number}`
                  : selected.source_reel_brief_version_id
                    ? "Linked immutable version"
                    : "Unavailable"
              }
            />
            <Info label="Comparable items" value={String(comparableCount)} />
            <Info label="Snapshots" value={String(snapshots.length)} />
          </section>
          {latestMetrics ? (
            <section aria-labelledby="derived-metrics-heading">
              <h2 className="font-semibold" id="derived-metrics-heading">
                Latest derived metrics
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Calculated from unrounded raw values. A rate is unavailable when
                its required value is missing or its denominator is zero.
              </p>
              <dl className="mt-3 grid gap-4 border-y py-4 sm:grid-cols-2 lg:grid-cols-4">
                <Info
                  label="Engagement rate by reach"
                  value={percent(latestMetrics.engagementRateByReach)}
                />
                <Info
                  label="Engagement rate by views"
                  value={percent(latestMetrics.engagementRateByViews)}
                />
                <Info
                  label="Save rate by reach"
                  value={percent(latestMetrics.saveRateByReach)}
                />
                <Info
                  label="Share rate by reach"
                  value={percent(latestMetrics.shareRateByReach)}
                />
                <Info
                  label="Comment rate by reach"
                  value={percent(latestMetrics.commentRateByReach)}
                />
                <Info
                  label="Like rate by reach"
                  value={percent(latestMetrics.likeRateByReach)}
                />
                <Info
                  label="Follow conversion by reach"
                  value={percent(latestMetrics.followConversionByReach)}
                />
                <Info
                  label="Average watch percentage"
                  value={percent(latestMetrics.averageWatchPercentage)}
                />
              </dl>
            </section>
          ) : null}
          {editable ? (
            <form action={action} className="space-y-4 border-b pb-6">
              <input
                name="publishedContentId"
                type="hidden"
                value={selected.id}
              />
              <div>
                <h2 className="font-semibold">Add performance snapshot</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Leave a metric blank when unavailable. A supplied zero remains
                  zero.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DateTimeInput label="Observed at" name="observedAt" />
                {[
                  ["views", "Views / plays", "1"],
                  ["reach", "Reach", "1"],
                  ["likes", "Likes", "1"],
                  ["comments", "Comments", "1"],
                  ["shares", "Shares", "1"],
                  ["saves", "Saves", "1"],
                  [
                    "totalWatchTimeSeconds",
                    "Total watch time (seconds)",
                    "0.001",
                  ],
                  [
                    "averageWatchTimeSeconds",
                    "Average watch time (seconds)",
                    "0.001",
                  ],
                  ["completionRate", "Completion rate (0–1)", "0.001"],
                  ["profileVisits", "Profile visits", "1"],
                  ["follows", "Follows", "1"],
                  ["linkClicks", "Link clicks", "1"],
                ].map(([name, text, step]) => (
                  <label className="text-sm font-medium" key={name}>
                    {text}
                    <Input
                      className="mt-1.5"
                      min="0"
                      name={name}
                      step={step}
                      type="number"
                    />
                  </label>
                ))}
                <label className="text-sm font-medium">
                  Source label (optional)
                  <Input
                    className="mt-1.5"
                    maxLength={160}
                    name="sourceLabel"
                  />
                </label>
                <label className="text-sm font-medium sm:col-span-2 lg:col-span-3">
                  Notes (optional)
                  <Textarea
                    className="mt-1.5"
                    maxLength={1000}
                    name="notes"
                    rows={2}
                  />
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Button disabled={pending} type="submit">
                  <Plus className="size-4" />
                  {pending ? "Adding…" : "Add snapshot"}
                </Button>
                <Feedback state={state} />
              </div>
            </form>
          ) : null}
          <SnapshotHistory
            content={selected}
            snapshots={snapshots}
            useLocalTime={useLocalTime}
          />
        </>
      )}
    </div>
  );
}

function SnapshotHistory({
  content,
  snapshots,
  useLocalTime,
}: {
  content: MarketingPublishedContentRow;
  snapshots: MarketingPerformanceSnapshotRow[];
  useLocalTime: boolean;
}) {
  return (
    <section>
      <h2 className="font-semibold">Historical snapshots</h2>
      {snapshots.length ? (
        <div className="mt-3 overflow-x-auto border-y">
          <table className="w-full min-w-[1500px] text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                {[
                  "Observed",
                  "Horizon",
                  "Views",
                  "Reach",
                  "Likes",
                  "Comments",
                  "Saves",
                  "Shares",
                  "Total watch seconds",
                  "Average watch seconds",
                  "Completion",
                  "Profile visits",
                  "Follows",
                  "Link clicks",
                  "Engagement / reach",
                  "Save / reach",
                ].map((heading) => (
                  <th className="px-3 py-2 font-medium" key={heading}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {snapshots.map((snapshot) => {
                const derived = derivePerformanceMetrics(
                  snapshot,
                  content.duration_seconds,
                );
                return (
                  <tr key={snapshot.id}>
                    <td className="px-3 py-3">
                      {localDate(snapshot.observed_at, useLocalTime)}
                    </td>
                    <td className="px-3 py-3">
                      {label(
                        deriveObservationHorizon(
                          content.published_at,
                          snapshot.observed_at,
                        ) ?? "Unavailable",
                      )}
                    </td>
                    <td className="px-3 py-3">{metric(snapshot.views)}</td>
                    <td className="px-3 py-3">{metric(snapshot.reach)}</td>
                    <td className="px-3 py-3">{metric(snapshot.likes)}</td>
                    <td className="px-3 py-3">{metric(snapshot.comments)}</td>
                    <td className="px-3 py-3">{metric(snapshot.saves)}</td>
                    <td className="px-3 py-3">{metric(snapshot.shares)}</td>
                    <td className="px-3 py-3">
                      {metric(snapshot.total_watch_time_seconds)}
                    </td>
                    <td className="px-3 py-3">
                      {metric(snapshot.average_watch_time_seconds)}
                    </td>
                    <td className="px-3 py-3">
                      {percent(snapshot.completion_rate)}
                    </td>
                    <td className="px-3 py-3">
                      {metric(snapshot.profile_visits)}
                    </td>
                    <td className="px-3 py-3">{metric(snapshot.follows)}</td>
                    <td className="px-3 py-3">
                      {metric(snapshot.link_clicks)}
                    </td>
                    <td className="px-3 py-3">
                      {percent(derived.engagementRateByReach)}
                    </td>
                    <td className="px-3 py-3">
                      {percent(derived.saveRateByReach)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted-foreground mt-3 border-y py-8 text-center text-sm">
          No performance snapshots yet.
        </p>
      )}
    </section>
  );
}

function LearningsTab({
  contents,
  editable,
  evidence,
  learnings,
  useLocalTime,
}: {
  contents: MarketingPublishedContentRow[];
  editable: boolean;
  evidence: MarketingPerformanceLearningEvidenceRow[];
  learnings: MarketingPerformanceLearningRow[];
  useLocalTime: boolean;
}) {
  const [state, action, pending] = useActionState(
    derivePerformanceLearningsAction,
    initialPerformanceActionState,
  );
  const contentById = new Map(contents.map((content) => [content.id, content]));
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-semibold">Performance Learnings</h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Organization-local, deterministic comparisons. At least five
            baseline Reels and three in one structured segment are required.
          </p>
        </div>
        {editable ? (
          <form action={action} className="flex flex-col items-start gap-2">
            <Button disabled={pending} type="submit">
              <RefreshCw
                className={`size-4 ${pending ? "animate-spin" : ""}`}
              />
              {pending ? "Deriving…" : "Derive learnings"}
            </Button>
            <Feedback state={state} />
          </form>
        ) : null}
      </div>
      {learnings.length ? (
        <div className="divide-y border-y">
          {learnings.map((learning) => {
            const support = evidence.filter(
              (item) => item.learning_id === learning.id,
            );
            return (
              <article className="space-y-3 py-5" key={learning.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">
                    {label(learning.subject_value)} · {label(learning.metric)}
                  </h3>
                  <span className="text-muted-foreground text-xs">
                    {learning.evidence_strength} evidence
                  </span>
                </div>
                <p className="text-sm">{learning.summary}</p>
                <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <Info
                    label="Horizon"
                    value={label(learning.observation_horizon)}
                  />
                  <Info
                    label="Segment / baseline"
                    value={`${learning.sample_count} / ${learning.baseline_sample_count}`}
                  />
                  <Info
                    label="Segment median"
                    value={percent(learning.segment_value)}
                  />
                  <Info
                    label="Baseline median"
                    value={percent(learning.baseline_value)}
                  />
                </dl>
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Exact provenance
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-sm">
                    {support.map((item) => (
                      <li key={item.snapshot_id}>
                        {contentById.get(item.published_content_id)
                          ?.internal_label ?? item.published_content_id}{" "}
                        · snapshot {item.snapshot_id.slice(0, 8)} ·{" "}
                        {label(item.evidence_role)}
                      </li>
                    ))}
                  </ul>
                </div>
                <ul className="text-muted-foreground list-disc pl-5 text-xs">
                  {learning.caveats.map((caveat) => (
                    <li key={caveat}>{caveat}</li>
                  ))}
                </ul>
                <p className="text-muted-foreground text-xs">
                  {learning.algorithm_version} · Generated{" "}
                  {localDate(learning.created_at, useLocalTime)}
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground border-y py-10 text-center text-sm">
          Insufficient evidence. No Performance Learning has been created.
        </p>
      )}
    </div>
  );
}

function Info({ label: text, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{text}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
