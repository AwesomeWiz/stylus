import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/notifications/actions", () => ({
  markAllNotificationsReadAction: vi.fn(),
  markNotificationReadAction: vi.fn(),
}));

import { NotificationMenu } from "./notification-menu";

describe("notification menu", () => {
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
