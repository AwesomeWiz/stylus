import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getContext: vi.fn(),
  getNotifications: vi.fn(),
  getOnboarding: vi.fn(),
  getPolicy: vi.fn(),
  getRuns: vi.fn(),
  routeDecision: vi.fn(),
}));

vi.mock("@/modules/ai/actions", () => ({
  testAIConnectionAction: vi.fn(async () => ({ status: "idle" })),
  updateOrganizationAIPolicyAction: vi.fn(async () => ({ status: "idle" })),
}));
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@/modules/ai/server/configured", () => ({
  getConfiguredAIProviderIds: vi.fn(() => ["ollama"]),
}));
vi.mock("@/modules/ai/server/data", () => ({
  getOrganizationAIPolicy: mocks.getPolicy,
  getOrganizationAIRuns: mocks.getRuns,
}));
vi.mock("@/modules/auth/actions", () => ({ logoutAction: vi.fn() }));
vi.mock("@/modules/notifications/server/data", () => ({
  getNotificationSummary: mocks.getNotifications,
}));
vi.mock("@/modules/onboarding/server/data", () => ({
  getOnboardingData: mocks.getOnboarding,
}));
vi.mock("@/modules/onboarding/routing", () => ({
  getWorkspaceRouteDecision: mocks.routeDecision,
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.getContext,
}));

import AIPage from "./page";

describe("AI page", () => {
  it("loads a missing policy as the valid disabled default", async () => {
    mocks.getContext.mockResolvedValue({
      membership: { role: "OWNER" },
      organization: {
        id: "10000000-0000-4000-8000-000000000001",
        name: "Example",
      },
      user: { displayName: "Owner", email: "owner@example.test", id: "user" },
    });
    mocks.getOnboarding.mockResolvedValue({
      progress: { completed_at: "2026-08-26T00:00:00Z", current_step: 7 },
    });
    mocks.routeDecision.mockReturnValue(null);
    mocks.getPolicy.mockResolvedValue(null);
    mocks.getRuns.mockResolvedValue([]);
    mocks.getNotifications.mockResolvedValue({ items: [], unreadCount: 0 });

    render(await AIPage());

    expect(screen.getByRole("heading", { name: "AI" })).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Execution mode" }),
    ).toHaveValue("DISABLED");
    expect(mocks.getPolicy).toHaveBeenCalledWith(
      "10000000-0000-4000-8000-000000000001",
    );
  });
});
