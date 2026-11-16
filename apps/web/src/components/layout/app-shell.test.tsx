import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ path: "/", refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.path,
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/modules/plugins/server/data", () => ({
  getEnabledOrganizationPluginIds: vi.fn().mockResolvedValue(["marketing"]),
}));
vi.mock("@/modules/notifications/summary-action", () => ({
  refreshNotificationSummaryAction: vi.fn().mockResolvedValue({
    organizationId: "organization",
    summary: { items: [], unreadCount: 0 },
  }),
}));
import { AppShell } from "./app-shell";
const props = {
  identity: { displayName: "Alex Morgan", email: "alex@example.test" },
  logoutAction: async () => undefined,
  organization: { id: "organization", name: "Acme", role: "OWNER" as const },
};

beforeEach(() => {
  localStorage.clear();
  mocks.path = "/";
  vi.clearAllMocks();
});
describe("AppShell", () => {
  it("exposes neutral global controls, a skip link and accessible mobile navigation without inert search", async () => {
    render(await AppShell({ ...props, children: <h1>Page content</h1> }));
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Skip to content" }),
    ).toHaveAttribute("href", "#main-content");
    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Marketing" })).toHaveAttribute(
      "href",
      "/apps/marketing",
    );
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = screen.getByRole("dialog", { name: "Main navigation" });
    expect(within(dialog).getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(dialog).getByText("Acme")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("collapses locally, preserves state across content transitions and restores it on remount", async () => {
    const view = render(await AppShell({ ...props, children: <h1>Home</h1> }));
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(localStorage.getItem("stylus-sidebar-collapsed")).toBe("true");
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toHaveAttribute("aria-expanded", "false");
    mocks.path = "/tasks";
    view.rerender(
      await AppShell({ ...props, children: <h1>Task content</h1> }),
    );
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("heading", { name: "Task content" })).toHaveFocus();
    view.unmount();
    render(await AppShell({ ...props, children: <h1>Task content</h1> }));
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(localStorage.getItem("stylus-sidebar-collapsed")).toBe("false");
  });
  it("responds to cross-tab preference changes and refreshes shell metadata on returning", async () => {
    render(await AppShell({ ...props, children: <p>Content</p> }));
    act(() => {
      localStorage.setItem("stylus-sidebar-collapsed", "true");
      window.dispatchEvent(new Event("storage"));
    });
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
    act(() => window.dispatchEvent(new Event("focus")));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});

afterEach(cleanup);
