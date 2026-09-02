import "server-only";

import { getCompanyKnowledge } from "@/core/memory/server";
import type {
  MarketingAskCouncilMessageRow,
  MarketingExternalResearchEvidenceRow,
  MarketingExternalResearchReportRow,
  MarketingExternalResearchRunRow,
  MarketingPerformanceLearningRow,
  MarketingReelBriefVersionRow,
  MarketingStrategicCouncilReviewVersionRow,
} from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  askCouncilContextSchema,
  askCouncilLimits,
  type AskCouncilContext,
  type AskCouncilIntent,
} from "../ask-council";
import { projectCompanyCreativeContext } from "../creative-council";

export interface AskCouncilPersistenceReference {
  label: string;
  modelReferenceId: string;
  performanceLearningId?: string;
  reelBriefVersionId?: string;
  referenceType:
    | "RESEARCH_REPORT"
    | "RESEARCH_EVIDENCE"
    | "PERFORMANCE_LEARNING"
    | "REEL_BRIEF"
    | "STRATEGIC_REVIEW";
  researchEvidenceId?: string;
  researchReportId?: string;
  snapshot: Record<string, unknown>;
  strategicReviewId?: string;
}

const ignoredScoreWords = new Set([
  "about",
  "and",
  "are",
  "could",
  "from",
  "have",
  "marketing",
  "our",
  "that",
  "the",
  "this",
  "what",
  "which",
  "with",
]);

function keywords(value: string) {
  return [
    ...new Set(
      value
        .toLocaleLowerCase("en-US")
        .split(/[^a-z0-9_]+/)
        .filter((item) => item.length >= 3 && !ignoredScoreWords.has(item)),
    ),
  ];
}

function relevanceScore(question: string, candidate: unknown) {
  const text = JSON.stringify(candidate).toLocaleLowerCase("en-US");
  return keywords(question).reduce(
    (score, keyword) => score + (text.includes(keyword) ? 1 : 0),
    0,
  );
}

function text(value: unknown, max: number, fallback: string) {
  const result = typeof value === "string" ? value.trim() : "";
  return (result || fallback).slice(0, max);
}

function stringArray(value: unknown, maxItems: number, maxCharacters: number) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, maxCharacters))
        .filter(Boolean)
        .slice(0, maxItems)
    : [];
}

function findEvidenceIds(value: unknown, result = new Set<string>()) {
  if (typeof value === "string" && /^EVID-(?:[1-9]|1\d|20)$/.test(value))
    result.add(value);
  else if (Array.isArray(value))
    value.forEach((item) => findEvidenceIds(item, result));
  else if (value && typeof value === "object")
    Object.values(value).forEach((item) => findEvidenceIds(item, result));
  return result;
}

function reportSummary(structured: unknown) {
  if (!structured || typeof structured !== "object")
    return "Existing External Research report.";
  const report = structured as Record<string, unknown>;
  if (typeof report.summary === "string")
    return text(report.summary, 1_200, "External Research report.");
  const findings = Array.isArray(report.findings) ? report.findings : [];
  const statements = findings
    .map((finding) =>
      finding && typeof finding === "object"
        ? (finding as Record<string, unknown>).statement
        : null,
    )
    .filter((item): item is string => typeof item === "string");
  return text(
    statements.join(" "),
    1_200,
    "Existing External Research report.",
  );
}

function shouldAutoSelectResearch(intent: AskCouncilIntent, question: string) {
  return (
    [
      "AUDIENCE",
      "COMPETITOR",
      "CONTENT_IDEA",
      "GENERAL_MARKETING",
      "RESEARCH_EVIDENCE",
      "TREND",
    ].includes(intent) ||
    question.toLocaleLowerCase("en-US").includes("research")
  );
}

function shouldAutoSelectPerformance(
  intent: AskCouncilIntent,
  question: string,
) {
  return (
    ["CONTENT_IDEA", "GENERAL_MARKETING", "PERFORMANCE"].includes(intent) ||
    question.toLocaleLowerCase("en-US").includes("performance")
  );
}

export function boundCompanyContext(
  company: ReturnType<typeof projectCompanyCreativeContext>,
) {
  if (JSON.stringify(company).length <= askCouncilLimits.companyCharacters)
    return company;
  let bounded = JSON.parse(
    JSON.stringify(company, (_key, value: unknown) =>
      typeof value === "string" ? value.slice(0, 300) : value,
    ),
  ) as typeof company;
  const arrays: unknown[][] = [];
  for (const section of Object.values(bounded))
    if (section && typeof section === "object")
      for (const value of Object.values(section))
        if (Array.isArray(value)) arrays.push(value);
  while (
    JSON.stringify(bounded).length > askCouncilLimits.companyCharacters &&
    arrays.some((value) => value.length)
  )
    for (const value of arrays)
      if (
        value.length &&
        JSON.stringify(bounded).length > askCouncilLimits.companyCharacters
      )
        value.pop();
  if (JSON.stringify(bounded).length > askCouncilLimits.companyCharacters)
    bounded = JSON.parse(
      JSON.stringify(bounded, (_key, value: unknown) =>
        typeof value === "string" ? value.slice(0, 100) : value,
      ),
    ) as typeof company;
  if (JSON.stringify(bounded).length > askCouncilLimits.companyCharacters)
    throw new Error("ask_council_company_context_too_large");
  return bounded as typeof company;
}

async function loadResearch(input: {
  organizationId: string;
  question: string;
  reportId: string | null;
  selectAutomatically: boolean;
}) {
  const db = await createServerSupabaseClient();
  let query = db
    .from("marketing_external_research_reports")
    .select("*")
    .eq("organization_id", input.organizationId)
    .order("created_at", { ascending: false })
    .limit(input.reportId ? 1 : 8);
  if (input.reportId) query = query.eq("id", input.reportId);
  const { data, error } = await query;
  if (error) throw new Error("ask_council_research_context_failed");
  if (input.reportId && data?.length !== 1)
    throw new Error("ask_council_research_context_invalid");
  if (!input.reportId && !input.selectAutomatically)
    return { contexts: [], references: [] };
  const candidates = (data ?? []) as MarketingExternalResearchReportRow[];
  const selected = candidates
    .map((report) => ({
      report,
      score: relevanceScore(input.question, report.structured_report),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.report.created_at.localeCompare(left.report.created_at),
    )
    .filter((candidate) => input.reportId || candidate.score > 0)
    .slice(0, askCouncilLimits.researchReports)
    .map(({ report }) => report);
  if (!selected.length) return { contexts: [], references: [] };

  const runIds = selected.map((report) => report.run_id);
  const [
    { data: runs, error: runError },
    { data: evidence, error: evidenceError },
  ] = await Promise.all([
    db
      .from("marketing_external_research_runs")
      .select("*")
      .eq("organization_id", input.organizationId)
      .in("id", runIds),
    db
      .from("marketing_external_research_evidence")
      .select("*")
      .eq("organization_id", input.organizationId)
      .in("run_id", runIds)
      .order("evidence_id", { ascending: true }),
  ]);
  if (runError || evidenceError)
    throw new Error("ask_council_research_context_failed");
  const runById = new Map(
    ((runs ?? []) as MarketingExternalResearchRunRow[]).map((run) => [
      run.id,
      run,
    ]),
  );
  const evidenceRows = [
    ...((evidence ?? []) as MarketingExternalResearchEvidenceRow[]),
  ].sort(
    (left, right) =>
      Number(left.evidence_id.slice(5)) - Number(right.evidence_id.slice(5)),
  );
  const references: AskCouncilPersistenceReference[] = [];
  let evidenceOrdinal = 1;
  const contexts = selected.map((report, reportIndex) => {
    const reportReference = `RESEARCH-${reportIndex + 1}`;
    const run = runById.get(report.run_id);
    const request = run?.request_snapshot as
      Record<string, unknown> | undefined;
    const allowedEvidenceIds = findEvidenceIds(report.structured_report);
    const selectedEvidence = evidenceRows
      .filter(
        (item) =>
          item.run_id === report.run_id &&
          allowedEvidenceIds.has(item.evidence_id),
      )
      .slice(
        0,
        Math.max(0, askCouncilLimits.researchEvidence - evidenceOrdinal + 1),
      )
      .map((item) => {
        const modelReferenceId = `EVID-${evidenceOrdinal++}`;
        const projected = {
          evidenceType: item.evidence_type,
          excerpt: item.excerpt.slice(0, askCouncilLimits.evidenceCharacters),
          modelReferenceId,
          title: item.title?.slice(0, 200) ?? null,
        };
        references.push({
          label: item.title ?? item.evidence_id,
          modelReferenceId,
          referenceType: "RESEARCH_EVIDENCE",
          researchEvidenceId: item.id,
          snapshot: projected,
        });
        return projected;
      });
    const projected = {
      evidence: selectedEvidence,
      limitations: stringArray(
        (report.structured_report as Record<string, unknown>)?.limitations,
        4,
        300,
      ),
      modelReferenceId: reportReference,
      summary: reportSummary(report.structured_report),
      title: text(request?.question, 200, `Research report ${reportIndex + 1}`),
    };
    references.push({
      label: projected.title,
      modelReferenceId: reportReference,
      referenceType: "RESEARCH_REPORT",
      researchReportId: report.id,
      snapshot: projected,
    });
    return projected;
  });
  return { contexts, references };
}

async function loadPerformance(input: {
  learningIds: readonly string[];
  organizationId: string;
  question: string;
  selectAutomatically: boolean;
}) {
  const db = await createServerSupabaseClient();
  let query = db
    .from("marketing_performance_learnings")
    .select("*")
    .eq("organization_id", input.organizationId)
    .order("created_at", { ascending: false })
    .limit(input.learningIds.length ? input.learningIds.length : 12);
  if (input.learningIds.length) query = query.in("id", [...input.learningIds]);
  const { data, error } = await query;
  if (error) throw new Error("ask_council_performance_context_failed");
  if (input.learningIds.length && data?.length !== input.learningIds.length)
    throw new Error("ask_council_performance_context_invalid");
  if (!input.learningIds.length && !input.selectAutomatically)
    return { contexts: [], references: [] };
  const candidates = (data ?? []) as MarketingPerformanceLearningRow[];
  const selected = candidates
    .map((learning) => ({
      learning,
      score: relevanceScore(input.question, {
        subject: learning.subject_value,
        summary: learning.summary,
      }),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.learning.created_at.localeCompare(left.learning.created_at),
    )
    .filter((candidate) => input.learningIds.length || candidate.score > 0)
    .slice(0, askCouncilLimits.performanceLearnings)
    .map(({ learning }, index) => ({ learning, index }));
  const references: AskCouncilPersistenceReference[] = [];
  const contexts = selected.map(({ learning }, index) => {
    const projected = {
      algorithmVersion: learning.algorithm_version,
      baselineSampleCount: learning.baseline_sample_count,
      baselineValue: Number(learning.baseline_value),
      caveats: learning.caveats,
      difference: Number(learning.difference),
      evidenceStrength: learning.evidence_strength,
      horizon: learning.observation_horizon,
      metric: learning.metric,
      modelReferenceId: `PERF-${index + 1}`,
      sampleCount: learning.sample_count,
      segmentValue: Number(learning.segment_value),
      subjectValue: learning.subject_value,
      summary: learning.summary,
    } as const;
    references.push({
      label: `${learning.subject_value} · ${learning.evidence_strength}`,
      modelReferenceId: projected.modelReferenceId,
      performanceLearningId: learning.id,
      referenceType: "PERFORMANCE_LEARNING",
      snapshot: projected,
    });
    return projected;
  });
  return { contexts, references };
}

async function loadCreativeArtifacts(input: {
  organizationId: string;
  reelBriefVersionId: string | null;
  strategicReviewId: string | null;
}) {
  const db = await createServerSupabaseClient();
  const [briefResult, reviewResult] = await Promise.all([
    input.reelBriefVersionId
      ? db
          .from("marketing_reel_brief_versions")
          .select("*")
          .eq("organization_id", input.organizationId)
          .eq("id", input.reelBriefVersionId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    input.strategicReviewId
      ? db
          .from("marketing_strategic_council_review_versions")
          .select("*")
          .eq("organization_id", input.organizationId)
          .eq("id", input.strategicReviewId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (briefResult.error || (input.reelBriefVersionId && !briefResult.data))
    throw new Error("ask_council_reel_brief_context_invalid");
  if (reviewResult.error || (input.strategicReviewId && !reviewResult.data))
    throw new Error("ask_council_strategic_review_context_invalid");

  const references: AskCouncilPersistenceReference[] = [];
  const brief = briefResult.data as MarketingReelBriefVersionRow | null;
  const reelBrief = brief
    ? {
        callToAction: brief.call_to_action,
        modelReferenceId: "BRIEF-1",
        primaryHook: brief.primary_hook,
        schemaVersion: brief.schema_version,
        title: brief.title,
        versionNumber: brief.version_number,
      }
    : null;
  if (brief && reelBrief)
    references.push({
      label: `${brief.title} · v${brief.version_number}`,
      modelReferenceId: "BRIEF-1",
      reelBriefVersionId: brief.id,
      referenceType: "REEL_BRIEF",
      snapshot: reelBrief,
    });

  const review =
    reviewResult.data as MarketingStrategicCouncilReviewVersionRow | null;
  const strategicReview = review
    ? {
        modelReferenceId: "REVIEW-1",
        schemaVersion: review.schema_version,
        summary: text(
          (review.structured_review as Record<string, unknown>)
            ?.finalDecision ??
            (review.structured_review as Record<string, unknown>)?.summary,
          1_500,
          "Existing Strategic Council Review.",
        ),
        versionNumber: review.version_number,
      }
    : null;
  if (review && strategicReview)
    references.push({
      label: `Strategic Review · v${review.version_number}`,
      modelReferenceId: "REVIEW-1",
      referenceType: "STRATEGIC_REVIEW",
      snapshot: strategicReview,
      strategicReviewId: review.id,
    });
  return { reelBrief, references, strategicReview };
}

async function loadHistory(
  organizationId: string,
  conversationId: string | null,
) {
  if (!conversationId) return [];
  const db = await createServerSupabaseClient();
  const { data, error } = await db
    .from("marketing_ask_council_messages")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(askCouncilLimits.conversationHistoryMessages);
  if (error) throw new Error("ask_council_history_context_failed");
  return ((data ?? []) as MarketingAskCouncilMessageRow[])
    .reverse()
    .map((message) => ({
      content: message.content.slice(
        0,
        askCouncilLimits.priorMessageCharacters,
      ),
      role: message.role,
    }));
}

export function shrinkAskCouncilContext(context: AskCouncilContext) {
  const bounded = structuredClone(context);
  while (
    JSON.stringify(bounded).length > askCouncilLimits.totalContextCharacters &&
    bounded.history.length
  )
    bounded.history.shift();
  while (
    JSON.stringify(bounded).length > askCouncilLimits.totalContextCharacters &&
    bounded.research.some((report) => report.evidence.length)
  ) {
    const report = [...bounded.research]
      .reverse()
      .find((item) => item.evidence.length);
    report?.evidence.pop();
  }
  while (
    JSON.stringify(bounded).length > askCouncilLimits.totalContextCharacters &&
    bounded.research.length > 1
  )
    bounded.research.pop();
  while (
    JSON.stringify(bounded).length > askCouncilLimits.totalContextCharacters &&
    bounded.performance.length
  )
    bounded.performance.pop();
  if (JSON.stringify(bounded).length > askCouncilLimits.totalContextCharacters)
    throw new Error("ask_council_context_too_large");
  return bounded;
}

export async function loadAskCouncilContext(input: {
  conversationId: string | null;
  intent: AskCouncilIntent;
  organizationId: string;
  performanceLearningIds: readonly string[];
  question: string;
  reelBriefVersionId: string | null;
  researchReportId: string | null;
  strategicReviewId: string | null;
}) {
  const [knowledge, research, performance, artifacts, history] =
    await Promise.all([
      getCompanyKnowledge(input.organizationId),
      loadResearch({
        organizationId: input.organizationId,
        question: input.question,
        reportId: input.researchReportId,
        selectAutomatically: shouldAutoSelectResearch(
          input.intent,
          input.question,
        ),
      }),
      loadPerformance({
        learningIds: input.performanceLearningIds,
        organizationId: input.organizationId,
        question: input.question,
        selectAutomatically: shouldAutoSelectPerformance(
          input.intent,
          input.question,
        ),
      }),
      loadCreativeArtifacts(input),
      loadHistory(input.organizationId, input.conversationId),
    ]);
  const parsed = askCouncilContextSchema.parse({
    company: boundCompanyContext(projectCompanyCreativeContext(knowledge)),
    companyModelReferenceId: "CTX-COMPANY-1",
    history,
    performance: performance.contexts,
    reelBrief: artifacts.reelBrief,
    research: research.contexts,
    strategicReview: artifacts.strategicReview,
  });
  const context = shrinkAskCouncilContext(parsed);
  const retained = new Set([
    ...context.research.flatMap((report) => [
      report.modelReferenceId,
      ...report.evidence.map((item) => item.modelReferenceId),
    ]),
    ...context.performance.map((item) => item.modelReferenceId),
    ...(context.reelBrief ? [context.reelBrief.modelReferenceId] : []),
    ...(context.strategicReview
      ? [context.strategicReview.modelReferenceId]
      : []),
  ]);
  return {
    context,
    references: [
      ...research.references,
      ...performance.references,
      ...artifacts.references,
    ].filter((reference) => retained.has(reference.modelReferenceId)),
  };
}
