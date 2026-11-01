import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/notifications/actions", () => ({
  markAllNotificationsReadAction: vi.fn(),
  markNotificationReadAction: vi.fn(),
}));
const mocks = vi.hoisted(() => ({ refresh: vi.fn(), router: vi.fn() }));
vi.mock("@/modules/notifications/summary-action", () => ({
  refreshNotificationSummaryAction: mocks.refresh,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.router }),
}));

import { NotificationMenu } from "./notification-menu";

beforeEach(() => vi.clearAllMocks());

describe("notification menu", () => {
  it("offers a local retry when a fresh summary is unavailable", async () => {
    mocks.refresh.mockRejectedValueOnce(new Error("unavailable"));
    render(
      <NotificationMenu items={[]} unreadCount={0} organizationId="org" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument(),
    );
    mocks.refresh.mockResolvedValue({
      organizationId: "org",
      summary: { items: [], unreadCount: 1 },
    });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Notifications, 1 unread" }),
      ).toBeInTheDocument(),
    );
  });
  it("refreshes only the authorized summary when opened in a persistent shell", async () => {
    mocks.refresh.mockResolvedValue({
      organizationId: "org",
      summary: { items: [], unreadCount: 2 },
    });
    render(
      <NotificationMenu items={[]} unreadCount={0} organizationId="org" />,
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Notifications, 2 unread" }),
      ).toBeInTheDocument(),
    );
    expect(mocks.refresh).toHaveBeenCalledWith();
  });
  it("rejects a summary from another current organization instead of mixing shell identity", async () => {
    mocks.refresh.mockResolvedValue({
      organizationId: "other",
      summary: { items: [], unreadCount: 9 },
    });
    render(
      <NotificationMenu items={[]} unreadCount={0} organizationId="org" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    await waitFor(() => expect(mocks.router).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Notifications, 9 unread" }),
    ).not.toBeInTheDocument();
  });
  it("announces unread state and exposes compact read controls", () => {
    render(
      <NotificationMenu
        items={[
          {
            body: "Prepare launch notes is due in about one hour.",
            created_at: "2026-08-25T12:00:00.000Z",
            entity_id: "20000000-0000-4000-8000-000000000001",
            entity_type: "TASK",
            id: "30000000-0000-4000-8000-000000000001",
            organization_id: "10000000-0000-4000-8000-000000000001",
            read_at: null,
            recipient_id: "00000000-0000-4000-8000-000000000001",
            title: "Task due within an hour",
            type: "TASK_DUE_1H",
          },
        ]}
        unreadCount={1}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Notifications, 1 unread" }),
    );
    expect(screen.getByText("Task due within an hour")).toBeInTheDocument();
    expect(screen.getByText("Unread")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mark all read" }),
    ).toBeInTheDocument();
  });
});

afterEach(cleanup);
