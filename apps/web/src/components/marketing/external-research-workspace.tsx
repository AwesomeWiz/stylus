"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Lightbulb,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  MarketingExternalResearchEvidenceRow,
  MarketingExternalResearchReportRow,
  MarketingExternalResearchRunRow,
  MarketingExternalResearchSourceRow,
  OrganizationRole,
} from "@/lib/supabase/database.types";
import { canMutateMarketing } from "@/modules/marketing/authorization";
import { enqueueExternalResearchAction } from "@/modules/marketing/external-research-actions";
import {
  externalResearchReportSchema,
  initialExternalResearchActionState,
  marketingResearchIntents,
  type ExternalResearchActionState,
  type FashionResearchPlanPreview,
  type FashionResearchReport,
} from "@/modules/marketing/external-research";

export function ExternalResearchWorkspace({
  evidence,
  initialInvocationKey,
  reports,
  role,
  runs,
  sourcePlanPreviews = [],
  sources,
}: {
  evidence: MarketingExternalResearchEvidenceRow[];
  initialInvocationKey: string;
  reports: MarketingExternalResearchReportRow[];
  role: OrganizationRole;
  runs: MarketingExternalResearchRunRow[];
  sourcePlanPreviews?: FashionResearchPlanPreview[];
  sources: MarketingExternalResearchSourceRow[];
}) {
  const router = useRouter();
  const editable = canMutateMarketing(role);
  const [invocationKey, setInvocationKey] = useState(initialInvocationKey);
  const [intent, setIntent] =
    useState<(typeof marketingResearchIntents)[number]>("AUDIENCE_PAIN");
  const sourcePlan = sourcePlanPreviews.find(
    (preview) => preview.intent === intent,
  );
  const execute = useCallback(
    async (state: ExternalResearchActionState, form: FormData) => {
      const result = await enqueueExternalResearchAction(state, form);
      if (result.status === "success") setInvocationKey(crypto.randomUUID());
      return result;
    },
    [],
  );
  const [state, action, pending] = useActionState(
    execute,
    initialExternalResearchActionState,
  );
  const active = runs.some((run) =>
    ["QUEUED", "RUNNING", "SYNTHESIZING"].includes(run.status),
  );
  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state.runId, state.status]);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => router.refresh(), 3_000);
    return () => window.clearInterval(timer);
  }, [active, router]);

  return (
    <section aria-labelledby="external-research-heading" className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold" id="external-research-heading">
          External research
        </h2>
        <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
          Turn bounded consumer, editorial, and public-web evidence into
          fashion-marketing signals and strategic content opportunity
          candidates.
        </p>
      </div>
      {editable ? (
        <form
          action={action}
          className="grid gap-4 border-y py-5 lg:grid-cols-2"
        >
          <input name="invocationKey" type="hidden" value={invocationKey} />
          <Field label="Research question">
            <textarea
              className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm"
              disabled={pending || active}
              maxLength={500}
              name="question"
              required
            />
          </Field>
          <div className="space-y-4">
            <Field label="Primary marketing intent">
              <select
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                disabled={pending || active}
                name="intent"
                onChange={(event) =>
                  setIntent(
                    event.target
                      .value as (typeof marketingResearchIntents)[number],
                  )
                }
                value={intent}
              >
                {marketingResearchIntents.map((researchIntent) => (
                  <option key={researchIntent} value={researchIntent}>
                    {label(researchIntent)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Query terms (1–5)">
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 5 }, (_, index) => (
                  <input
                    className="border-input bg-background h-10 rounded-md border px-3 text-sm"
                    disabled={pending || active}
                    key={index}
                    maxLength={80}
                    name="queryTerm"
                    placeholder={
                      index === 0 ? "Required term" : "Optional term"
                    }
                    required={index === 0}
                  />
                ))}
              </div>
            </Field>
          </div>
          {intent === "FASHION_TECH" ? (
            <Field label="Hacker News stream">
              <select
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                defaultValue="new"
                disabled={pending || active}
                name="hackerNewsStream"
              >
                <option value="new">New stories</option>
                <option value="top">Top stories</option>
                <option value="ask">Ask HN</option>
              </select>
            </Field>
          ) : null}
          <div className="space-y-2 lg:col-span-2">
            <p className="text-sm font-medium">Deterministic source plan</p>
            <div className="flex flex-wrap gap-2">
              {sourcePlan?.sources.map((source) => (
                <span
                  className="border-input bg-muted/40 rounded-md border px-2.5 py-1.5 text-xs"
                  key={source.family}
                >
                  {label(source.family)} · {source.labels.join(", ")}
                  {!source.available
                    ? source.family === "SOCIAL"
                      ? " · unavailable"
                      : source.family === "WEB"
                        ? ` · ${label(source.providerStatus ?? "UNCONFIGURED")}`
                        : " · configuration required"
                    : ""}
                  {source.statuses?.length
                    ? ` · ${source.statuses
                        .map(
                          (status) =>
                            `${label(status.platform)}: ${label(status.status)}`,
                        )
                        .join("; ")}`
                    : ""}
                </span>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              Stylus selects these allowlisted sources before retrieval. Source
              domains, communities, provider settings, and credentials cannot be
              supplied from this form.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
            <Button disabled={pending || active} type="submit">
              {pending || active ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <FileSearch className="size-4" />
              )}
              {active ? "Research in progress" : "Run external research"}
            </Button>
            <p
              aria-live="polite"
              className={
                state.status === "error"
                  ? "text-destructive text-sm"
                  : "text-muted-foreground text-sm"
              }
              role={state.status === "error" ? "alert" : undefined}
            >
              {state.message}
            </p>
          </div>
        </form>
      ) : (
        <p className="text-muted-foreground flex items-center gap-2 border-y py-5 text-sm">
          <ShieldCheck className="size-4" />
          VIEWER access is read-only. Existing research remains available.
        </p>
      )}
      <ResearchHistory
        evidence={evidence}
        reports={reports}
        runs={runs}
        sources={sources}
      />
    </section>
  );
}

function ResearchHistory({
  evidence,
  reports,
  runs,
  sources,
}: {
  evidence: MarketingExternalResearchEvidenceRow[];
  reports: MarketingExternalResearchReportRow[];
  runs: MarketingExternalResearchRunRow[];
  sources: MarketingExternalResearchSourceRow[];
}) {
  const reportByRun = useMemo(
    () => new Map(reports.map((report) => [report.run_id, report])),
    [reports],
  );
  return runs.length ? (
    <div className="divide-y border-y">
      {runs.map((run) => {
        const report = externalResearchReportSchema.safeParse(
          reportByRun.get(run.id)?.structured_report,
        );
        const runEvidence = evidence
          .filter((item) => item.run_id === run.id)
          .sort(compareEvidenceIds);
        const sourceById = new Map(
          sources
            .filter((item) => item.run_id === run.id)
            .map((item) => [item.id, item]),
        );
        return (
          <article className="space-y-4 py-5" key={run.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-medium">
                  {requestQuestion(run.request_snapshot)}
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatDate(run.created_at)} · {run.evidence_count} evidence
                  item(s)
                  {run.partial ? " · partial source coverage" : ""}
                </p>
              </div>
              <Status status={run.status} />
            </div>
            {report.success ? (
              "schemaVersion" in report.data ? (
                <FashionReport report={report.data} runId={run.id} />
              ) : (
                <LegacyReport report={report.data} runId={run.id} />
              )
            ) : null}
            {runEvidence.length ? (
              <details>
                <summary className="cursor-pointer text-sm font-medium">
                  Evidence and sources
                </summary>
                <ol className="mt-3 space-y-3">
                  {runEvidence.map((item) => {
                    const source = sourceById.get(item.source_id);
                    const canonicalUrl =
                      item.canonical_url ?? source?.canonical_url;
                    const contextLabel = evidenceSourceContext(item, source);
                    return (
                      <li
                        className="border-l pl-3 text-sm"
                        id={`${run.id}-${item.evidence_id}`}
                        key={item.id}
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <strong>{item.evidence_id}</strong>
                          <span className="text-muted-foreground text-xs font-medium">
                            {evidenceTypeLabel(item.evidence_type)}
                          </span>
                          {item.author ? (
                            <span className="text-muted-foreground text-xs">
                              by {item.author}
                            </span>
                          ) : null}
                          {contextLabel ? (
                            <span className="text-muted-foreground text-xs">
                              {contextLabel}
                            </span>
                          ) : null}
                          {evidenceMetadataLabel(item) ? (
                            <span className="text-muted-foreground text-xs">
                              {evidenceMetadataLabel(item)}
                            </span>
                          ) : null}
                          {canonicalUrl ? (
                            <span className="text-muted-foreground text-xs">
                              {sourceDomain(canonicalUrl)}
                            </span>
                          ) : null}
                          {item.published_at ? (
                            <span className="text-muted-foreground text-xs">
                              {formatDate(item.published_at)}
                            </span>
                          ) : null}
                        </div>
                        {item.title ? (
                          <p className="mt-1 font-medium">{item.title}</p>
                        ) : null}
                        <p className="mt-1 whitespace-pre-line">
                          {item.excerpt}
                        </p>
                        {canonicalUrl ? (
                          <a
                            className="text-primary mt-1 inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                            href={canonicalUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Open source <ExternalLink className="size-3" />
                          </a>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </details>
            ) : null}
            <SourceHistory
              sources={sources.filter((item) => item.run_id === run.id)}
            />
          </article>
        );
      })}
    </div>
  ) : (
    <div className="border-y py-10 text-center">
      <FileSearch className="text-muted-foreground mx-auto size-5" />
      <p className="mt-2 font-medium">No external research runs yet</p>
    </div>
  );
}

function SourceHistory({
  sources,
}: {
  sources: MarketingExternalResearchSourceRow[];
}) {
  if (!sources.length) return null;
  return (
    <details>
      <summary className="cursor-pointer text-sm font-medium">
        Source retrieval details
      </summary>
      <ul className="text-muted-foreground mt-3 space-y-2 text-xs">
        {sources.map((source) => (
          <li key={source.id}>
            <span className="text-foreground font-medium">
              {source.source_key} · {label(source.adapter)} · {source.status}
            </span>
            {diagnosticCategory(source)
              ? ` · ${label(diagnosticCategory(source)!)}`
              : ""}
            {source.failure_category
              ? ` · ${label(source.failure_category)}`
              : ""}
            {candidateCount(source) !== null
              ? ` · ${candidateCount(source)} candidates checked`
              : ""}
            {source.safe_metadata.providerId
              ? ` · provider ${label(String(source.safe_metadata.providerId))}`
              : ""}
            {source.safe_metadata.sourceClass
              ? ` · ${label(String(source.safe_metadata.sourceClass))}`
              : ""}
            {source.published_at
              ? ` · published ${formatDate(source.published_at)}`
              : " · publication time unknown"}
            {` · fetched ${formatDate(source.fetched_at)}`}
          </li>
        ))}
      </ul>
    </details>
  );
}

function diagnosticCategory(source: MarketingExternalResearchSourceRow) {
  const value = source.safe_metadata.diagnosticCategory;
  return typeof value === "string" ? value : null;
}

function compareEvidenceIds(
  left: MarketingExternalResearchEvidenceRow,
  right: MarketingExternalResearchEvidenceRow,
) {
  const leftNumber = Number(left.evidence_id.replace(/^EVID-/, ""));
  const rightNumber = Number(right.evidence_id.replace(/^EVID-/, ""));
  return leftNumber - rightNumber;
}

function candidateCount(source: MarketingExternalResearchSourceRow) {
  const value = source.safe_metadata.candidateCount;
  return typeof value === "number" && Number.isSafeInteger(value)
    ? value
    : null;
}

function StatementList({
  heading,
  items,
  runId,
}: {
  heading: string;
  items: Array<{ statement: string; supportedBy: string[] }>;
  runId: string;
}) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold">{heading}</h4>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
        {items.map((item, index) => (
          <li key={`${heading}-${index}`}>
            {item.statement}{" "}
            {item.supportedBy
              .map((reference) => (
                <a
                  className="text-primary text-xs hover:underline"
                  href={`#${runId}-${reference}`}
                  key={reference}
                >
                  {reference}
                </a>
              ))
              .reduce<React.ReactNode[]>(
                (nodes, node, index) =>
                  index ? [...nodes, ", ", node] : [node],
                [],
              )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LegacyReport({
  report,
  runId,
}: {
  report: Extract<
    ReturnType<typeof externalResearchReportSchema.parse>,
    { findings: unknown }
  >;
  runId: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm">{report.summary}</p>
      <StatementList heading="Findings" items={report.findings} runId={runId} />
      <StatementList heading="Patterns" items={report.patterns} runId={runId} />
      <p className="text-muted-foreground text-xs">
        Freshness: {report.freshnessAssessment}
      </p>
      {report.limitations.length ? (
        <p className="text-muted-foreground text-xs">
          Limitations: {report.limitations.join("; ")}
        </p>
      ) : null}
      {report.partialFailureWarnings.length ? (
        <p className="text-muted-foreground text-xs">
          Partial coverage: {report.partialFailureWarnings.join("; ")}
        </p>
      ) : null}
    </div>
  );
}

function FashionReport({
  report,
  runId,
}: {
  report: FashionResearchReport;
  runId: string;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm">{report.summary}</p>
      <FashionSignalList
        heading="Audience signals"
        items={report.audienceSignals.map((item) => ({
          evidenceRefs: item.evidenceRefs,
          label: label(item.signalType),
          text: item.statement,
        }))}
        runId={runId}
      />
      <FashionSignalList
        heading="Audience language"
        items={report.languageSignals.map((item) => ({
          evidenceRefs: item.evidenceRefs,
          label: item.phraseOrPattern,
          text: item.interpretation,
        }))}
        runId={runId}
      />
      <FashionSignalList
        heading="Trend signals"
        items={report.trendSignals.map((item) => ({
          evidenceRefs: item.evidenceRefs,
          label: label(item.confidence),
          text: item.statement,
        }))}
        runId={runId}
      />
      <FashionSignalList
        heading="Content patterns"
        items={report.contentPatterns.map((item) => ({
          evidenceRefs: item.evidenceRefs,
          label: label(item.confidence),
          text: item.pattern,
        }))}
        runId={runId}
      />
      <FashionSignalList
        heading="Visual patterns"
        items={report.visualPatterns.map((item) => ({
          evidenceRefs: item.evidenceRefs,
          label: label(item.confidence),
          text: item.pattern,
        }))}
        runId={runId}
      />
      <FashionSignalList
        heading="Competitor signals"
        items={report.competitorSignals.map((item) => ({
          evidenceRefs: item.evidenceRefs,
          label: label(item.confidence),
          text: item.statement,
        }))}
        runId={runId}
      />
      <FashionSignalList
        heading="Purchase objections"
        items={report.objections.map((item) => ({
          evidenceRefs: item.evidenceRefs,
          text: item.objection,
        }))}
        runId={runId}
      />
      <FashionSignalList
        heading="Debates"
        items={report.debates.map((item) => ({
          evidenceRefs: item.evidenceRefs,
          text: item.positionSummary,
        }))}
        runId={runId}
      />
      {report.contentOpportunities.length ? (
        <section
          aria-label="Content opportunity candidates"
          className="space-y-3"
        >
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="size-4" /> Content opportunity candidates
          </h4>
          <div className="divide-y border-y">
            {report.contentOpportunities.map((opportunity, index) => (
              <article
                className="space-y-2 py-3"
                key={`${opportunity.title}-${index}`}
              >
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h5 className="text-sm font-semibold">{opportunity.title}</h5>
                  <span className="text-muted-foreground text-xs">
                    {label(opportunity.opportunityType)} ·{" "}
                    {label(opportunity.confidence)} confidence
                  </span>
                </div>
                <p className="text-sm">{opportunity.suggestedAngle}</p>
                <dl className="grid gap-1 text-xs sm:grid-cols-[8rem_1fr]">
                  <dt className="text-muted-foreground">Audience tension</dt>
                  <dd>{opportunity.audienceTension}</dd>
                  <dt className="text-muted-foreground">Why it matters</dt>
                  <dd>{opportunity.whyItMatters}</dd>
                  <dt className="text-muted-foreground">Freshness</dt>
                  <dd>{opportunity.freshness}</dd>
                </dl>
                {opportunity.caveats.length ? (
                  <p className="text-muted-foreground text-xs">
                    Caveats: {opportunity.caveats.join("; ")}
                  </p>
                ) : null}
                <EvidenceLinks
                  references={opportunity.evidenceRefs}
                  runId={runId}
                />
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <div className="space-y-1 text-xs">
        <p className="font-medium">Source diversity</p>
        {report.sourceCoverage.map((coverage) => (
          <p className="text-muted-foreground" key={coverage.family}>
            {label(coverage.family)} · {label(coverage.status)} ·{" "}
            {coverage.evidenceCount} evidence ·{" "}
            {coverage.sourceLabels.join(", ") || "No retained source"}
          </p>
        ))}
        {report.sourceDiversity.socialPlatformCount ? (
          <p className="text-muted-foreground">
            Social scope · {report.sourceDiversity.socialPlatformCount}{" "}
            platform(s) · {report.sourceDiversity.socialAccountCount} public
            account(s) · {report.sourceDiversity.socialIndependentContentCount}{" "}
            independent item(s) ·{" "}
            {report.sourceDiversity.socialCommentThreadCount} comment thread(s)
          </p>
        ) : null}
        {report.sourceDiversity.sourceClassCount ? (
          <p className="text-muted-foreground">
            Web scope · {report.sourceDiversity.uniqueSourceCount} unique
            source(s) · {report.sourceDiversity.sourceClassCount} source
            class(es) · {report.sourceDiversity.snippetEvidenceCount}{" "}
            snippet-only item(s)
          </p>
        ) : null}
      </div>
      {report.limitations.length ? (
        <p className="text-muted-foreground text-xs">
          Limitations: {report.limitations.join("; ")}
        </p>
      ) : null}
    </div>
  );
}

function FashionSignalList({
  heading,
  items,
  runId,
}: {
  heading: string;
  items: Array<{ evidenceRefs: string[]; label?: string; text: string }>;
  runId: string;
}) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold">{heading}</h4>
      <ul className="mt-2 space-y-2 text-sm">
        {items.map((item, index) => (
          <li key={`${heading}-${index}`}>
            {item.label ? <strong>{item.label}: </strong> : null}
            {item.text}{" "}
            <EvidenceLinks references={item.evidenceRefs} runId={runId} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvidenceLinks({
  references,
  runId,
}: {
  references: string[];
  runId: string;
}) {
  return (
    <span className="inline-flex gap-1">
      {references.map((reference) => (
        <a
          className="text-primary text-xs hover:underline"
          href={`#${runId}-${reference}`}
          key={reference}
        >
          {reference}
        </a>
      ))}
    </span>
  );
}

function Field({
  children,
  label: text,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{text}</span>
      {children}
    </label>
  );
}

function Status({ status }: { status: string }) {
  const Icon =
    status === "SUCCEEDED"
      ? CheckCircle2
      : status === "FAILED" || status === "CANCELLED"
        ? TriangleAlert
        : LoaderCircle;
  return (
    <span
      className={`flex items-center gap-1.5 text-xs font-medium ${
        status === "SUCCEEDED"
          ? "text-success"
          : status === "FAILED" || status === "CANCELLED"
            ? "text-destructive"
            : "text-info"
      }`}
    >
      <Icon
        className={`size-4 ${["QUEUED", "RUNNING", "SYNTHESIZING"].includes(status) ? "animate-spin" : ""}`}
      />
      {label(status)}
    </span>
  );
}

function requestQuestion(snapshot: unknown) {
  return snapshot &&
    typeof snapshot === "object" &&
    "question" in snapshot &&
    typeof snapshot.question === "string"
    ? snapshot.question
    : "External research run";
}

function label(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function evidenceTypeLabel(value: string) {
  return label(value).replace(/^Hn\b/, "HN");
}

function sourceDomain(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return "External source";
  }
}

function evidenceSourceContext(
  evidence: MarketingExternalResearchEvidenceRow,
  source: MarketingExternalResearchSourceRow | undefined,
) {
  for (const value of [
    evidence.safe_metadata.community,
    evidence.safe_metadata.sourceName,
    source?.safe_metadata.community,
    source?.safe_metadata.sourceName,
  ])
    if (typeof value === "string" && value.trim()) return value;
  return null;
}

function evidenceMetadataLabel(evidence: MarketingExternalResearchEvidenceRow) {
  const platform = evidence.safe_metadata.platform;
  const modality = evidence.safe_metadata.modality;
  const sourceClass = evidence.safe_metadata.sourceClass;
  const evidenceQuality = evidence.safe_metadata.evidenceQuality;
  const values = [platform, modality, sourceClass, evidenceQuality].filter(
    (value): value is string => typeof value === "string" && Boolean(value),
  );
  return values.length ? values.map(label).join(" · ") : null;
}
