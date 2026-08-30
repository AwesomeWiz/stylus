import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ action: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/modules/marketing/external-research-actions", () => ({
  enqueueExternalResearchAction: mocks.action,
}));

import { ExternalResearchWorkspace } from "./external-research-workspace";

const base = {
  evidence: [],
  initialInvocationKey: "00000000-0000-4000-8000-000000000001",
  reports: [],
  role: "MEMBER" as const,
  runs: [],
  sources: [],
};

describe("External Research workspace", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows bounded sources without arbitrary prompt or generic URL controls", () => {
    render(<ExternalResearchWorkspace {...base} />);
    expect(screen.getByLabelText("Research question")).toHaveAttribute(
      "maxlength",
      "500",
    );
    expect(screen.getByLabelText("Hacker News stream")).toBeInTheDocument();
    expect(
      screen.getAllByPlaceholderText("https://example.com/feed.xml"),
    ).toHaveLength(2);
    expect(
      screen.queryByLabelText(/provider|model|organization/i),
    ).not.toBeInTheDocument();
  });

  it("keeps VIEWER read-only", () => {
    render(<ExternalResearchWorkspace {...base} role="VIEWER" />);
    expect(
      screen.queryByRole("button", { name: "Run external research" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/VIEWER access is read-only/)).toBeInTheDocument();
  });

  it("disables submission while pending to prevent duplicate enqueue", async () => {
    let resolveAction:
      ((value: { runId: string; status: "success" }) => void) | undefined;
    mocks.action.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );
    render(<ExternalResearchWorkspace {...base} />);
    fireEvent.change(screen.getByLabelText("Research question"), {
      target: { value: "What pain points recur for startup teams?" },
    });
    fireEvent.change(screen.getByPlaceholderText("Required term"), {
      target: { value: "startup" },
    });
    const button = screen.getByRole("button", {
      name: "Run external research",
    });
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    fireEvent.click(button);
    expect(mocks.action).toHaveBeenCalledOnce();
    resolveAction?.({ runId: "run", status: "success" });
  });

  it("renders immutable findings with evidence-to-source provenance links", () => {
    render(
      <ExternalResearchWorkspace
        {...base}
        evidence={[
          {
            author: "founder",
            canonical_url: "https://news.ycombinator.com/item?id=1",
            content_hash: "a".repeat(64),
            created_at: "2026-08-29T00:00:00.000Z",
            evidence_id: "EVID-1",
            evidence_type: "HN_STORY",
            excerpt: "A public excerpt",
            fetched_at: "2026-08-29T00:00:00.000Z",
            id: "evidence-row",
            native_id: "1",
            organization_id: "org",
            parent_native_id: null,
            published_at: "2026-08-28T00:00:00.000Z",
            run_id: "run",
            safe_metadata: {},
            source_id: "source",
            title: "A public story",
          },
        ]}
        reports={[
          {
            created_at: "2026-08-29T00:01:00.000Z",
            created_by: "actor",
            id: "report",
            organization_id: "org",
            run_id: "run",
            schema_version: "marketing-external-research-report-v1",
            structured_report: report,
            version_number: 1,
          },
        ]}
        runs={[run]}
        sources={[
          {
            adapter: "hacker-news",
            author: null,
            canonical_url: "https://news.ycombinator.com/item?id=1",
            content_hash: "a".repeat(64),
            created_at: "2026-08-29T00:00:00.000Z",
            failure_category: null,
            fetched_at: "2026-08-29T00:00:00.000Z",
            id: "source",
            native_id: "1",
            organization_id: "org",
            published_at: null,
            run_id: "run",
            safe_metadata: {},
            source_key: "SRC-1",
            status: "SUCCEEDED",
            title: "Source",
          },
        ]}
      />,
    );
    expect(screen.getByText("Grounded finding")).toBeInTheDocument();
    expect(screen.getAllByText("EVID-1")[0]).toHaveAttribute(
      "href",
      "#run-EVID-1",
    );
    expect(screen.getByText("HN story")).toBeInTheDocument();
    expect(screen.getByText("news.ycombinator.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open source/ })).toHaveAttribute(
      "href",
      "https://news.ycombinator.com/item?id=1",
    );
  });

  it("distinguishes successful zero matches from a source retrieval failure", () => {
    render(
      <ExternalResearchWorkspace
        {...base}
        runs={[{ ...run, evidence_count: 0, status: "FAILED" }]}
        sources={[
          {
            adapter: "hacker-news",
            author: null,
            canonical_url: "https://news.ycombinator.com/top",
            content_hash: "b".repeat(64),
            created_at: "2026-08-29T00:00:00.000Z",
            failure_category: null,
            fetched_at: "2026-08-29T00:00:00.000Z",
            id: "empty-source",
            native_id: null,
            organization_id: "org",
            published_at: null,
            run_id: "run",
            safe_metadata: {
              candidateCount: 20,
              diagnosticCategory: "zero_matching_candidates",
              matchingCandidateCount: 0,
            },
            source_key: "SRC-1",
            status: "SUCCEEDED",
            title: null,
          },
        ]}
      />,
    );
    expect(
      screen.getByText(/SRC-1 · Hacker-news · SUCCEEDED/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Zero matching candidates/)).toBeInTheDocument();
    expect(screen.getByText(/20 candidates checked/)).toBeInTheDocument();
  });

  it("orders evidence identifiers numerically without changing identity", () => {
    render(
      <ExternalResearchWorkspace
        {...base}
        evidence={[evidenceRow("EVID-10"), evidenceRow("EVID-9")]}
        runs={[{ ...run, evidence_count: 2, status: "FAILED" }]}
      />,
    );
    expect(
      screen
        .getAllByText(/^EVID-(?:9|10)$/)
        .map((element) => element.textContent),
    ).toEqual(["EVID-9", "EVID-10"]);
    expect(document.getElementById("run-EVID-9")).toBeInTheDocument();
    expect(document.getElementById("run-EVID-10")).toBeInTheDocument();
  });
});

function evidenceRow(evidenceId: string) {
  return {
    author: "researcher",
    canonical_url: "https://example.test/article",
    content_hash: evidenceId.padEnd(64, "a").slice(0, 64),
    created_at: "2026-08-30T10:15:38.000Z",
    evidence_id: evidenceId,
    evidence_type: "ARTICLE_CONTENT" as const,
    excerpt: `Excerpt for ${evidenceId}`,
    fetched_at: "2026-08-30T10:15:35.000Z",
    id: `row-${evidenceId}`,
    native_id: `native-${evidenceId}`,
    organization_id: "org",
    parent_native_id: "story",
    published_at: null,
    run_id: "run",
    safe_metadata: {},
    source_id: "source",
    title: "Article",
  };
}

const run = {
  completed_at: "2026-08-29T00:01:00.000Z",
  created_at: "2026-08-29T00:00:00.000Z",
  created_by: "actor",
  dedupe_count: 0,
  evidence_count: 1,
  failed_source_count: 0,
  failure_category: null,
  failure_stage: null,
  fetched_bytes: 100,
  id: "run",
  invocation_key: "invocation",
  job_id: "job",
  normalized_characters: 20,
  organization_id: "org",
  partial: false,
  request_snapshot: { question: "What did founders report?" },
  requested_source_count: 1,
  retained_item_count: 1,
  retrieved_item_count: 1,
  started_at: "2026-08-29T00:00:00.000Z",
  status: "SUCCEEDED" as const,
  successful_source_count: 1,
  synthesis_ai_run_id: "ai-run",
  warning_categories: [],
};

const report = {
  confidence: "MEDIUM",
  disagreements: [],
  findings: [
    {
      confidence: "MEDIUM",
      id: "F-1",
      statement: "Grounded finding",
      supportedBy: ["EVID-1"],
    },
  ],
  freshnessAssessment: "Current",
  inferences: [],
  limitations: [],
  partialFailureWarnings: [],
  patterns: [],
  recommendations: [],
  summary: "Summary",
  unresolvedQuestions: [],
};
