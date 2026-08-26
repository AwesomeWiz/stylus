import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/plugins/server/data", () => ({
  getEnabledOrganizationPluginIds: vi.fn().mockResolvedValue([]),
}));

import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("exposes global controls and opens accessible mobile navigation", async () => {
    render(
      await AppShell({
        activePath: "/",
        children: <p>Page content</p>,
        identity: { displayName: "Alex Morgan", email: "alex@example.test" },
        logoutAction: async () => undefined,
        organization: { id: "organization", name: "Acme", role: "OWNER" },
      }),
    );

    expect(
      screen.getByRole("searchbox", { name: "Search" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    const navigationDialog = screen.getByRole("dialog", {
      name: "Main navigation",
    });
    expect(navigationDialog).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("button", { name: "Close navigation" }),
    ).toBeInTheDocument();
    expect(within(navigationDialog).getByText("Acme")).toBeInTheDocument();
  });
});
