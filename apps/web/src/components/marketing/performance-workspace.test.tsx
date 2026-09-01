import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const actionMocks = vi.hoisted(() => ({
  addSnapshot: vi.fn(),
  archive: vi.fn(),
  derive: vi.fn(),
  register: vi.fn(),
}));

vi.mock("@/modules/marketing/performance-actions", () => ({
  addPerformanceSnapshotAction: actionMocks.addSnapshot,
  derivePerformanceLearningsAction: actionMocks.derive,
  registerPublishedContentAction: actionMocks.register,
  setPublishedContentArchivedAction: actionMocks.archive,
}));

import type {
  MarketingPerformanceLearningRow,
  MarketingPerformanceSnapshotRow,
  MarketingPublishedContentRow,
} from "@/lib/supabase/database.types";
import { PerformanceWorkspace } from "./performance-workspace";

afterEach(cleanup);

const content: MarketingPublishedContentRow = {
  archived_at: null,
  canonical_url: "https://instagram.com/reel/example",
  content_opportunity_type: "MYTH_BUSTING",
  content_type: "REEL",
  created_at: "2026-01-01T00:00:00.000Z",
  created_by: "10000000-0000-4000-8000-000000000001",
  duration_seconds: 30,
  id: "20000000-0000-4000-8000-000000000001",
  internal_label: "Sizing myth Reel",
  organization_id: "30000000-0000-4000-8000-000000000001",
  platform: "INSTAGRAM",
  platform_native_id: "native-1",
  published_at: "2026-01-01T00:00:00.000Z",
  source_reel_brief_version_id: "40000000-0000-4000-8000-000000000001",
  updated_at: "2026-01-01T00:00:00.000Z",
  updated_by: "10000000-0000-4000-8000-000000000001",
};

const snapshot: MarketingPerformanceSnapshotRow = {
  average_watch_time_seconds: 15,
  comments: 0,
  completion_rate: null,
  created_at: "2026-01-08T00:00:00.000Z",
  entered_by: content.created_by,
  follows: null,
  id: "50000000-0000-4000-8000-000000000001",
  likes: 20,
  link_clicks: null,
  notes: null,
  observed_at: "2026-01-08T00:00:00.000Z",
  organization_id: content.organization_id,
  profile_visits: null,
  published_content_id: content.id,
  reach: 100,
  saves: 10,
  shares: 5,
  source_label: "Manual QA",
  source_type: "MANUAL",
  total_watch_time_seconds: null,
  views: null,
};

const learning: MarketingPerformanceLearningRow = {
  algorithm_version: "marketing-performance-learning-v1",
  baseline_sample_count: 6,
  baseline_value: 0.05,
  caveats: ["Descriptive evidence only."],
  comparison_dimension: "CONTENT_OPPORTUNITY_TYPE",
  content_type: "REEL",
  created_at: "2026-01-08T00:00:00.000Z",
  created_by: content.created_by,
  difference: 0.03,
  evidence_strength: "WEAK",
  generation_key: "a".repeat(64),
  id: "60000000-0000-4000-8000-000000000001",
  metric: "SAVE_RATE_BY_REACH",
  observation_horizon: "SEVEN_DAY",
  organization_id: content.organization_id,
  platform: "INSTAGRAM",
  sample_count: 3,
  segment_value: 0.08,
  subject_value: "MYTH_BUSTING",
  summary: "Bounded evidence-backed statement.",
};

function renderWorkspace(
  overrides: Partial<Parameters<typeof PerformanceWorkspace>[0]> = {},
) {
  return render(
    <PerformanceWorkspace
      briefs={[]}
      contents={[]}
      evidence={[]}
      learnings={[]}
      role="MEMBER"
      snapshots={[]}
      {...overrides}
    />,
  );
}

describe("Marketing Performance workspace", () => {
  it("shows an honest empty state and manual registration form", () => {
    renderWorkspace();
    expect(
      screen.getByText("No published content registered yet."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Register Reel" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Published at")).toHaveAttribute(
      "type",
      "datetime-local",
    );
    expect(
      screen.getByText("Content opportunity type (optional)"),
    ).toBeInTheDocument();
  });

  it("shows pending state and a safe action error", async () => {
    let resolveAction: (value: {
      message: string;
      status: "error";
    }) => void = () => undefined;
    actionMocks.register.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAction = resolve;
      }),
    );
    renderWorkspace();
    fireEvent.submit(
      screen.getByRole("button", { name: "Register Reel" }).closest("form")!,
    );
    expect(
      await screen.findByRole("button", { name: "Registering…" }),
    ).toBeDisabled();
    await act(async () => {
      resolveAction({
        message: "Performance data could not be saved.",
        status: "error",
      });
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Performance data could not be saved.",
    );
  });

  it("removes mutation controls for VIEWER while preserving readable data", () => {
    renderWorkspace({
      contents: [content],
      role: "VIEWER",
      snapshots: [snapshot],
    });
    expect(screen.getByText("Sizing myth Reel")).toBeInTheDocument();
    expect(screen.getByText("Viewer access is read-only.")).toBeInTheDocument();
    expect(
      screen.getByText(/Learning evidence: Insufficient/),
    ).toHaveTextContent("1/5 baseline, 1/3 segment");
    expect(
      screen.getByRole("link", { name: "Open published Reel" }),
    ).toHaveAttribute("href", content.canonical_url);
    expect(
      screen.queryByRole("button", { name: "Register Reel" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Archive Sizing myth Reel"),
    ).not.toBeInTheDocument();
  });

  it("shows when the deterministic baseline and segment thresholds are met", () => {
    const contents = Array.from({ length: 5 }, (_, index) => ({
      ...content,
      id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      internal_label: `Reel ${index + 1}`,
    }));
    const snapshots = contents.map((item, index) => ({
      ...snapshot,
      id: `50000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      published_content_id: item.id,
    }));
    renderWorkspace({ contents, snapshots });
    expect(screen.getAllByText(/Learning evidence: Eligible/)).toHaveLength(5);
    expect(screen.getAllByText(/5\/5 baseline, 5\/3 segment/)).toHaveLength(5);
  });

  it("displays unavailable distinctly from a supplied zero in history", () => {
    renderWorkspace({ contents: [content], snapshots: [snapshot] });
    fireEvent.click(screen.getByRole("tab", { name: "Performance detail" }));
    expect(screen.getByText("Historical snapshots")).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10%").length).toBeGreaterThan(0);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("Seven Day")).toBeInTheDocument();
  });

  it("shows immutable learning provenance, sample values, caveats, and version", () => {
    renderWorkspace({
      contents: [content],
      evidence: [
        {
          created_at: learning.created_at,
          evidence_role: "SEGMENT",
          learning_id: learning.id,
          organization_id: content.organization_id,
          published_content_id: content.id,
          snapshot_id: snapshot.id,
          source_reel_brief_version_id: content.source_reel_brief_version_id,
        },
      ],
      learnings: [learning],
      snapshots: [snapshot],
    });
    fireEvent.click(screen.getByRole("tab", { name: "Learnings" }));
    expect(
      screen.getByText("Bounded evidence-backed statement."),
    ).toBeInTheDocument();
    expect(screen.getByText("3 / 6")).toBeInTheDocument();
    expect(screen.getByText("8%")).toBeInTheDocument();
    expect(screen.getByText("5%")).toBeInTheDocument();
    expect(screen.getByText(/snapshot 50000000/)).toBeInTheDocument();
    expect(screen.getByText("Descriptive evidence only.")).toBeInTheDocument();
    expect(
      screen.getByText(/marketing-performance-learning-v1/),
    ).toBeInTheDocument();
  });

  it("shows insufficient evidence without fabricating a learning", () => {
    renderWorkspace({ contents: [content], snapshots: [snapshot] });
    fireEvent.click(screen.getByRole("tab", { name: "Learnings" }));
    expect(
      screen.getByText(
        "Insufficient evidence. No Performance Learning has been created.",
      ),
    ).toBeInTheDocument();
  });
});
