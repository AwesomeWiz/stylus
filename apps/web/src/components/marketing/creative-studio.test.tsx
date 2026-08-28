import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  action: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/modules/marketing/creative-council-actions", () => ({
  runCreativeCouncilAction: mocks.action,
}));

import { CreativeStudio } from "./creative-studio";

const idea = {
  archived_at: null,
  call_to_action: "Try it",
  campaign_id: null,
  concept: "Show one focused workflow",
  content_angle: "Practical",
  created_at: "2026-08-28T10:00:00.000Z",
  created_by: "10000000-0000-4000-8000-000000000001",
  hook: "A clear hook",
  id: "20000000-0000-4000-8000-000000000001",
  notes: null,
  organization_id: "30000000-0000-4000-8000-000000000001",
  status: "READY" as const,
  title: "Focused workflow",
  updated_at: "2026-08-28T10:00:00.000Z",
  updated_by: "10000000-0000-4000-8000-000000000001",
};

const baseProps = {
  briefs: [],
  companyContext: {
    audience: { description: "Startup teams" },
    brand: { toneOfVoice: ["clear"] },
    identity: { companyName: "Stylus" },
    marketing: { primaryObjective: "AWARENESS" },
    positioning: null,
    problem: null,
    product: { concept: "Startup OS" },
  },
  eligibleEvidence: [1, 2, 3, 4].map((value) => ({
    analysisId: `40000000-0000-4000-8000-00000000000${value}`,
    analysisVersion: value,
    competitorName: `Competitor ${value}`,
  })),
  evidence: [],
  ideas: [idea],
  initialIdempotencyKey: "50000000-0000-4000-8000-000000000001",
  role: "MEMBER" as const,
  runs: [],
  stages: [],
};

describe("Creative Studio", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.action.mockResolvedValue({ status: "idle" });
  });

  it("renders one Reel Idea selector, bounded optional evidence, and the pending-safe action", () => {
    render(<CreativeStudio {...baseProps} />);
    expect(screen.getByLabelText("Reel Idea")).toHaveValue(idea.id);
    expect(
      screen.getByRole("button", { name: "Run Creative Council" }),
    ).toBeEnabled();
    expect(
      screen.getByText(/Durable Marketing memory is not retrieved/),
    ).toBeInTheDocument();

    const boxes = screen.getAllByRole("checkbox");
    fireEvent.click(boxes[0]!);
    fireEvent.click(boxes[1]!);
    fireEvent.click(boxes[2]!);
    expect(boxes[3]!).toBeDisabled();
  });

  it("keeps VIEWER read-only while retaining history access", () => {
    render(<CreativeStudio {...baseProps} role="VIEWER" />);
    expect(
      screen.queryByRole("button", { name: "Run Creative Council" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/VIEWER access is read-only/)).toBeInTheDocument();
    expect(screen.getByLabelText("Reel Idea")).toBeDisabled();
  });

  it("shows immutable brief content and safe structured stage history", () => {
    render(
      <CreativeStudio
        {...baseProps}
        briefs={[
          {
            call_to_action: "Try it",
            caption: "A useful caption",
            council_run_id: "60000000-0000-4000-8000-000000000001",
            created_at: "2026-08-28T10:05:00.000Z",
            created_by: "10000000-0000-4000-8000-000000000001",
            critique: {
              audienceFit: { rating: "STRONG", summary: "Relevant" },
              brandFit: { rating: "STRONG", summary: "Clear" },
              confidence: "HIGH",
              originality: { rating: "ACCEPTABLE", summary: "Distinct" },
              recommendations: ["Keep the example concrete."],
              risks: [],
              strengths: ["Specific hook"],
              verdict: "VIABLE",
              weaknesses: [],
            },
            id: "70000000-0000-4000-8000-000000000001",
            organization_id: idea.organization_id,
            primary_hook: "Stop losing startup context.",
            schema_version: "reel-brief-v1",
            script_sections: [
              {
                endSecond: 3,
                purpose: "Open",
                script: "Stop losing startup context.",
                startSecond: 0,
              },
            ],
            source_reel_idea_id: idea.id,
            spoken_script: "Stop losing startup context. Use one workflow.",
            title: "Focused workflow — Creative Council",
            version_number: 1,
            visual_directions: ["Show the workspace."],
          },
        ]}
        runs={[
          {
            completed_at: "2026-08-28T10:05:00.000Z",
            context_snapshot: {},
            created_at: "2026-08-28T10:00:00.000Z",
            created_by: "10000000-0000-4000-8000-000000000001",
            current_stage: "COMPLETE",
            failed_stage: null,
            failure_category: null,
            id: "60000000-0000-4000-8000-000000000001",
            idempotency_key: "80000000-0000-4000-8000-000000000001",
            organization_id: idea.organization_id,
            source_reel_idea_id: idea.id,
            status: "SUCCEEDED",
            workflow_version: "creative-council-v1",
          },
        ]}
        stages={[
          {
            ai_run_id: "90000000-0000-4000-8000-000000000001",
            completed_at: "2026-08-28T10:01:00.000Z",
            council_run_id: "60000000-0000-4000-8000-000000000001",
            created_at: "2026-08-28T10:01:00.000Z",
            failure_category: null,
            id: "a0000000-0000-4000-8000-000000000001",
            organization_id: idea.organization_id,
            stage: "HOOK",
            status: "SUCCEEDED",
            structured_output: {
              alternateHooks: [],
              assumptions: [],
              audienceTension: "Scattered context",
              confidence: "HIGH",
              evidenceSummary: "Selected source only",
              primaryHook: "Stop losing startup context.",
              rationale: "Names the pain clearly.",
            },
          },
        ]}
      />,
    );
    expect(
      screen.getByText("Focused workflow — Creative Council"),
    ).toBeInTheDocument();
    expect(screen.getByText("Version 1")).toBeInTheDocument();
    expect(screen.getByText(/Critic verdict: Viable/)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Stop losing startup context/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByText(/Private provider response/i),
    ).not.toBeInTheDocument();
  });
});
