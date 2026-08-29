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
            created_at: "2026-08-29T00:00:00.000Z",
            evidence_id: "EVID-1",
            evidence_type: "DISCUSSION",
            excerpt: "A public excerpt",
            id: "evidence-row",
            organization_id: "org",
            run_id: "run",
            source_id: "source",
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
    expect(screen.getByRole("link", { name: /Source/ })).toHaveAttribute(
      "href",
      "https://news.ycombinator.com/item?id=1",
    );
  });
});

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
