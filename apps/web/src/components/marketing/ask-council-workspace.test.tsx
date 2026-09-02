import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  action: vi.fn(),
  archive: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("@/modules/marketing/ask-council-actions", () => ({
  askCouncilAction: mocks.action,
  setAskCouncilConversationArchivedAction: mocks.archive,
}));

import type {
  MarketingAskCouncilContextRefRow,
  MarketingAskCouncilConversationRow,
  MarketingAskCouncilMessageRow,
  MarketingAskCouncilSpecialistResultRow,
  MarketingAskCouncilTurnRow,
} from "@/lib/supabase/database.types";
import { AskCouncilWorkspace } from "./ask-council-workspace";

afterEach(cleanup);

const organizationId = "10000000-0000-4000-8000-000000000020";
const conversation: MarketingAskCouncilConversationRow = {
  archived_at: null,
  created_at: "2026-09-02T00:00:00.000Z",
  created_by: "20000000-0000-4000-8000-000000000020",
  id: "30000000-0000-4000-8000-000000000020",
  organization_id: organizationId,
  title: "What have we learned from performance?",
  updated_at: "2026-09-02T00:01:00.000Z",
  workflow_version: "marketing-ask-council-v1",
};
const userMessage: MarketingAskCouncilMessageRow = {
  ai_run_id: null,
  authored_by: conversation.created_by,
  content: conversation.title,
  conversation_id: conversation.id,
  created_at: conversation.created_at,
  id: "40000000-0000-4000-8000-000000000020",
  organization_id: organizationId,
  role: "USER",
  structured_output: null,
};
const assistantMessage: MarketingAskCouncilMessageRow = {
  ai_run_id: "50000000-0000-4000-8000-000000000020",
  authored_by: null,
  content: "Treat the difference as a weak directional signal, not causation.",
  conversation_id: conversation.id,
  created_at: "2026-09-02T00:01:00.000Z",
  id: "60000000-0000-4000-8000-000000000020",
  organization_id: organizationId,
  role: "ASSISTANT",
  structured_output: {
    answer: "Treat the difference as a weak directional signal, not causation.",
    disagreements: [],
    keyRecommendations: ["Test one controlled direction."],
    suggestedNextSteps: ["Review the Performance Learning."],
    supportingReferenceIds: ["PERF-1"],
    uncertainties: ["The segment contains three items."],
  },
};
const turn: MarketingAskCouncilTurnRow = {
  assistant_message_id: assistantMessage.id,
  completed_at: assistantMessage.created_at,
  context_snapshot: {},
  context_version: "marketing-ask-council-context-v1",
  conversation_id: conversation.id,
  created_at: conversation.created_at,
  created_by: conversation.created_by,
  failed_specialist_id: null,
  failure_category: null,
  id: "70000000-0000-4000-8000-000000000020",
  idempotency_key: "80000000-0000-4000-8000-000000000020",
  intent: "PERFORMANCE",
  organization_id: organizationId,
  routing_version: "marketing-ask-council-routing-v1",
  schema_version: "marketing-ask-council-answer-v1",
  selected_specialists: [
    "marketing.content-strategist",
    "marketing.creative-critic",
  ],
  status: "SUCCEEDED",
  user_message_id: userMessage.id,
  workflow_version: "marketing-ask-council-v1",
};
const result: MarketingAskCouncilSpecialistResultRow = {
  ai_run_id: "90000000-0000-4000-8000-000000000020",
  created_at: conversation.created_at,
  id: "a0000000-0000-4000-8000-000000000020",
  ordinal: 1,
  organization_id: organizationId,
  specialist_id: "marketing.content-strategist",
  structured_output: { recommendation: "Run one controlled content test." },
  turn_id: turn.id,
};
const reference: MarketingAskCouncilContextRefRow = {
  created_at: conversation.created_at,
  id: "b0000000-0000-4000-8000-000000000020",
  label: "RELATABLE PAIN · WEAK",
  model_reference_id: "PERF-1",
  organization_id: organizationId,
  performance_learning_id: "c0000000-0000-4000-8000-000000000020",
  reel_brief_version_id: null,
  reference_type: "PERFORMANCE_LEARNING",
  research_evidence_id: null,
  research_report_id: null,
  snapshot: {},
  strategic_review_id: null,
  turn_id: turn.id,
};

function renderWorkspace(
  overrides: Partial<Parameters<typeof AskCouncilWorkspace>[0]> = {},
) {
  return render(
    <AskCouncilWorkspace
      briefs={[]}
      contextReferences={[]}
      conversations={[]}
      idempotencyKey="d0000000-0000-4000-8000-000000000020"
      messages={[]}
      performance={[]}
      reports={[]}
      reviews={[]}
      role="MEMBER"
      selectedConversation={null}
      specialistResults={[]}
      turns={[]}
      {...overrides}
    />,
  );
}

describe("Ask Council workspace", () => {
  it("presents a distinct new advisory conversation with bounded controls", () => {
    renderWorkspace();
    expect(
      screen.getByText("New Ask Council conversation"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Marketing question")).toHaveAttribute(
      "maxlength",
      "2000",
    );
    expect(
      screen.getByRole("button", { name: "Ask Council" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Create Reel remains a separate workflow/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/provider|model id/i)).not.toBeInTheDocument();
  });

  it("renders final advice first with consulted specialists and exact context labels", () => {
    renderWorkspace({
      contextReferences: [reference],
      conversations: [conversation],
      messages: [userMessage, assistantMessage],
      selectedConversation: conversation,
      specialistResults: [result],
      turns: [turn],
    });
    expect(screen.getByText(assistantMessage.content)).toBeInTheDocument();
    expect(screen.getByText("Council consulted")).toBeInTheDocument();
    expect(screen.getAllByText("Content Strategist").length).toBeGreaterThan(0);
    expect(screen.getByText(/RELATABLE PAIN · WEAK/)).toBeInTheDocument();
    expect(
      screen.getByText("The segment contains three items."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Review the Performance Learning."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create reel/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps VIEWER read-only while preserving conversation access", () => {
    renderWorkspace({
      conversations: [conversation],
      messages: [userMessage, assistantMessage],
      role: "VIEWER",
      selectedConversation: conversation,
      turns: [turn],
    });
    expect(screen.getByText("Read-only access")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ask Council" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(assistantMessage.content)).toBeInTheDocument();
  });
});
