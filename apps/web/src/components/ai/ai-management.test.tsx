import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  testConnection: vi.fn(),
  updatePolicy: vi.fn(),
}));

vi.mock("@/modules/ai/actions", () => ({
  testAIConnectionAction: actions.testConnection,
  updateOrganizationAIPolicyAction: actions.updatePolicy,
}));

import type {
  AIRunRow,
  OrganizationAIPolicyRow,
} from "@/lib/supabase/database.types";

import { AIManagement } from "./ai-management";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const policy: OrganizationAIPolicyRow = {
  allowed_provider_ids: ["ollama"],
  created_at: "2026-08-26T00:00:00Z",
  default_tier: "FAST",
  execution_mode: "LOCAL_ONLY",
  monthly_remote_cost_limit_usd: 10,
  organization_id: "10000000-0000-4000-8000-000000000001",
  updated_at: "2026-08-26T00:00:00Z",
  updated_by: "00000000-0000-4000-8000-000000000001",
};
const run: AIRunRow = {
  actor_id: "00000000-0000-4000-8000-000000000001",
  capability: "example.hello",
  completed_at: "2026-08-26T00:00:01Z",
  duration_ms: 1000,
  error_category: null,
  estimated_cost_usd: 0,
  id: "20000000-0000-4000-8000-000000000001",
  input_tokens: 10,
  is_remote: false,
  memory_domains: [],
  operation: "generate_text",
  organization_id: policy.organization_id,
  output_tokens: 5,
  parent_run_id: null,
  plugin_id: "example",
  provider_id: "ollama",
  requested_tier: "FAST",
  selected_model_id: "ollama-default",
  started_at: "2026-08-26T00:00:00Z",
  status: "SUCCEEDED",
  total_tokens: 15,
  trace_metadata: { promptContentStored: false },
};

describe("AIManagement", () => {
  it.each(["OWNER", "ADMIN"] as const)(
    "allows %s to manage non-secret policy",
    (role) => {
      render(
        <AIManagement
          configuredProviderIds={["ollama"]}
          currentRole={role}
          policy={policy}
          runs={[run]}
        />,
      );
      expect(
        screen.getByRole("button", { name: "Save policy" }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/API key/i)).not.toBeInTheDocument();
      expect(screen.getByText("example.hello")).toBeInTheDocument();
      expect(screen.getByText(/ollama-default.*ollama/)).toBeInTheDocument();
      expect(screen.getByText(/15 tokens/)).toBeInTheDocument();
    },
  );

  it.each(["MEMBER", "VIEWER"] as const)(
    "keeps %s policy read-only",
    (role) => {
      render(
        <AIManagement
          configuredProviderIds={["ollama"]}
          currentRole={role}
          policy={policy}
          runs={[]}
        />,
      );
      expect(screen.getByText("Local only")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Save policy" }),
      ).not.toBeInTheDocument();
      if (role === "VIEWER")
        expect(
          screen.queryByRole("button", { name: "Test connection" }),
        ).not.toBeInTheDocument();
      else
        expect(
          screen.getByRole("button", { name: "Test connection" }),
        ).toBeInTheDocument();
    },
  );

  it("shows only safe connection metadata after a successful test", async () => {
    actions.testConnection.mockResolvedValue({
      durationMs: 42,
      message: "AI connection succeeded.",
      modelId: "ollama-default",
      providerId: "ollama",
      status: "success",
    });
    render(
      <AIManagement
        configuredProviderIds={["ollama"]}
        currentRole="OWNER"
        policy={policy}
        runs={[]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Test connection" }));
    await waitFor(() =>
      expect(screen.getByText("AI connection succeeded.")).toBeInTheDocument(),
    );
    const result = screen.getByRole("status");
    expect(within(result).getByText("ollama-default")).toBeInTheDocument();
    expect(within(result).getByText("ollama")).toBeInTheDocument();
    expect(within(result).getByText("42 ms")).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /prompt/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Private provider response"),
    ).not.toBeInTheDocument();
  });

  it("renders a missing persisted policy as the disabled default", () => {
    render(
      <AIManagement
        configuredProviderIds={[]}
        currentRole="OWNER"
        policy={null}
        runs={[]}
      />,
    );
    expect(
      screen.getByRole("combobox", { name: "Execution mode" }),
    ).toHaveValue("DISABLED");
    expect(screen.getByRole("button", { name: "Save policy" })).toBeEnabled();
  });

  it("does not render prompt or response content from trace metadata", () => {
    render(
      <AIManagement
        configuredProviderIds={[]}
        currentRole="OWNER"
        policy={policy}
        runs={[{ ...run, trace_metadata: { safe: "Private prompt text" } }]}
      />,
    );
    expect(screen.queryByText("Private prompt text")).not.toBeInTheDocument();
  });
});
