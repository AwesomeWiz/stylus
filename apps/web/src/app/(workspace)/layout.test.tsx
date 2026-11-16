import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  notifications: vi.fn(),
  plugins: vi.fn(),
  shell: vi.fn(),
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.context,
}));
vi.mock("@/modules/notifications/server/data", () => ({
  getNotificationSummary: mocks.notifications,
}));
vi.mock("@/modules/plugins/server/data", () => ({
  getEnabledOrganizationPluginIds: mocks.plugins,
}));
vi.mock("@/modules/auth/actions", () => ({ logoutAction: vi.fn() }));
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: (props: { children: ReactNode }) => {
    mocks.shell(props);
    return <div>{props.children}</div>;
  },
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error("redirect:" + path);
  },
}));
import WorkspaceLayout from "./layout";
import Loading from "./loading";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.mockResolvedValue({
    user: { id: "user", displayName: "User", email: "user@example.test" },
    organization: { id: "org", name: "Company" },
    membership: { role: "VIEWER" },
  });
  mocks.notifications.mockResolvedValue({ items: [], unreadCount: 0 });
  mocks.plugins.mockResolvedValue([]);
});
describe("persistent workspace boundary", () => {
  it("owns only authorized shell data and preserves read-only identity", async () => {
    const element = await WorkspaceLayout({ children: <h1>Tasks</h1> });
    expect(element.key).toBe("user:org:VIEWER");
    render(element);
    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
    expect(mocks.notifications).toHaveBeenCalledExactlyOnceWith("org", "user");
    expect(mocks.plugins).toHaveBeenCalledExactlyOnceWith("org");
    expect(mocks.shell).toHaveBeenCalledWith(
      expect.objectContaining({
        organization: { id: "org", name: "Company", role: "VIEWER" },
        enabledPluginIds: [],
      }),
    );
  });
  it("does not load private shell data without an authorized organization", async () => {
    mocks.context.mockResolvedValue(null);
    await expect(WorkspaceLayout({ children: <p>Content</p> })).rejects.toThrow(
      "redirect:/organization/new",
    );
    expect(mocks.notifications).not.toHaveBeenCalled();
    expect(mocks.plugins).not.toHaveBeenCalled();
  });
  it("has an announced content-only fallback", () => {
    render(<Loading />);
    expect(
      screen.getByRole("status", { name: "Loading workspace" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});

afterEach(cleanup);
