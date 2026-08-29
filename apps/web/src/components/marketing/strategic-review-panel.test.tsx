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
vi.mock("@/modules/marketing/strategic-review-actions", () => ({
  runStrategicReviewAction: mocks.action,
}));

import { StrategicReviewPanel } from "./strategic-review-panel";

const brief = {
  call_to_action: "Try it",
  caption: "A caption",
  council_run_id: "10000000-0000-4000-8000-000000000016",
  created_at: "2026-08-29T10:00:00.000Z",
  created_by: "20000000-0000-4000-8000-000000000016",
  critique: {},
  id: "30000000-0000-4000-8000-000000000016",
  organization_id: "40000000-0000-4000-8000-000000000016",
  primary_hook: "A hook",
  schema_version: "reel-brief-v1",
  script_sections: [],
  source_reel_idea_id: "50000000-0000-4000-8000-000000000016",
  spoken_script: "A script",
  title: "Exact Reel Brief",
  version_number: 2,
  visual_directions: [],
};

const baseProps = {
  briefs: [brief],
  initialIdempotencyKey: "60000000-0000-4000-8000-000000000016",
  reviews: [],
  role: "MEMBER" as const,
  runs: [],
  stages: [],
};

describe("Strategic Review panel", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.action.mockResolvedValue({
      runId: "70000000-0000-4000-8000-000000000016",
      status: "success",
    });
  });

  it("submits one exact Reel Brief version through the pending-safe action", async () => {
    render(<StrategicReviewPanel {...baseProps} />);
    expect(screen.getByLabelText("Reel Brief version")).toHaveValue(brief.id);
    fireEvent.click(
      screen.getByRole("button", { name: "Run strategic review" }),
    );
    await waitFor(() => expect(mocks.action).toHaveBeenCalledOnce());
    const submitted = mocks.action.mock.calls[0]?.[1] as FormData;
    expect(submitted.get("sourceReelBriefVersionId")).toBe(brief.id);
    expect(submitted.get("idempotencyKey")).toBe(
      baseProps.initialIdempotencyKey,
    );
    expect(submitted.get("organizationId")).toBeNull();
    expect(submitted.get("providerUrl")).toBeNull();
  });

  it("keeps VIEWER read-only and hides the execute control", () => {
    render(<StrategicReviewPanel {...baseProps} role="VIEWER" />);
    expect(
      screen.queryByRole("button", { name: "Run strategic review" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Reel Brief version")).toBeDisabled();
    expect(screen.getByText(/VIEWER access is read-only/)).toBeInTheDocument();
  });

  it("disables submission while pending so duplicate clicks do not execute twice", async () => {
    let resolveAction:
      ((value: { runId: string; status: "success" }) => void) | undefined;
    mocks.action.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );
    render(<StrategicReviewPanel {...baseProps} />);
    const button = screen.getByRole("button", { name: "Run strategic review" });
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    fireEvent.click(button);
    expect(mocks.action).toHaveBeenCalledOnce();
    resolveAction?.({
      runId: "70000000-0000-4000-8000-000000000016",
      status: "success",
    });
  });

  it("shows the exact source, five stages, and immutable final review", () => {
    const runId = "80000000-0000-4000-8000-000000000016";
    render(
      <StrategicReviewPanel
        {...baseProps}
        reviews={[
          {
            created_at: "2026-08-29T10:05:00.000Z",
            created_by: brief.created_by,
            id: "90000000-0000-4000-8000-000000000016",
            organization_id: brief.organization_id,
            schema_version: "strategic-council-review-v1",
            source_reel_brief_version_id: brief.id,
            source_reel_idea_id: brief.source_reel_idea_id,
            strategic_review_run_id: runId,
            structured_review: {
              approvedRecommendations: [
                {
                  evidenceStatus: "SUPPORTED",
                  recommendation: "Keep the direct opening.",
                  recommendationId: "REC-1",
                },
              ],
              challengeDispositions: [
                {
                  challengeReferenceId: "REC-1",
                  disposition: "PARTIALLY_ACCEPTED",
                  rationale: "Retain the verification need.",
                },
              ],
              confidence: "MEDIUM",
              finalAssessment: "Proceed with a grounded test.",
              rejectedOrRevisedRecommendations: [],
              risks: ["Audience preference is uncertain."],
              unresolvedUnknowns: ["Audience response"],
              verificationNeeds: ["Run an authorized audience test."],
            },
            version_number: 1,
          },
        ]}
        runs={[
          {
            completed_at: "2026-08-29T10:05:00.000Z",
            context_snapshot: {},
            created_at: "2026-08-29T10:00:00.000Z",
            created_by: brief.created_by,
            current_stage: "COMPLETE",
            failed_stage: null,
            failure_category: null,
            id: runId,
            idempotency_key: baseProps.initialIdempotencyKey,
            organization_id: brief.organization_id,
            plugin_id: "marketing",
            schema_version: "strategic-council-review-v1",
            source_reel_brief_version_id: brief.id,
            source_reel_idea_id: brief.source_reel_idea_id,
            status: "SUCCEEDED",
            workflow_version: "strategic-review-v1",
          },
        ]}
      />,
    );
    expect(screen.getByText(/Source version 2/)).toBeInTheDocument();
    for (const stage of ["Audience", "Brand", "Strategy", "Challenge", "Judge"])
      expect(screen.getByText(stage)).toBeInTheDocument();
    expect(screen.getByText("Strategic Council Review")).toBeInTheDocument();
    expect(screen.getByText("Review version 1")).toBeInTheDocument();
    expect(screen.getByText(/grounded test/)).toBeInTheDocument();
    expect(screen.getByText(/REC-1 · Supported/)).toBeInTheDocument();
    expect(screen.getByText(/REC-1 · Partially Accepted/)).toBeInTheDocument();
    expect(screen.getByText("Unresolved unknowns")).toBeInTheDocument();
    expect(screen.queryByText(/raw provider/i)).not.toBeInTheDocument();
  });

  it("does not render an execute control without an eligible brief", () => {
    render(<StrategicReviewPanel {...baseProps} briefs={[]} />);
    expect(screen.getByText("Generate a Reel Brief first")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Run strategic review" }),
    ).not.toBeInTheDocument();
  });
});
