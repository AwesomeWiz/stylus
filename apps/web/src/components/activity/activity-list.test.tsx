import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ActivityEventRow } from "@/lib/supabase/database.types";

import { ActivityList } from "./activity-list";

const event: ActivityEventRow = {
  actor_id: "00000000-0000-4000-8000-000000000001",
  created_at: "2026-08-25T12:00:00.000Z",
  entity_id: "20000000-0000-4000-8000-000000000001",
  entity_type: "TASK",
  event_type: "TASK_COMPLETED",
  id: "30000000-0000-4000-8000-000000000001",
  metadata: { title: "Prepare launch Reel script" },
  organization_id: "10000000-0000-4000-8000-000000000001",
};

describe("activity list", () => {
  it("renders actor-aware task history with safe internal context", () => {
    render(
      <ActivityList
        events={[event]}
        members={[
          {
            display_name: "Alex",
            member_user_id: event.actor_id,
            role: "MEMBER",
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("link", {
        name: "Alex completed “Prepare launch Reel script”",
      }),
    ).toHaveAttribute(
      "href",
      "/tasks?view=all&task=20000000-0000-4000-8000-000000000001",
    );
  });

  it("provides a useful empty state", () => {
    render(<ActivityList events={[]} members={[]} />);
    expect(screen.getByText("No activity yet.")).toBeInTheDocument();
  });

  it("routes memory lifecycle activity to the Core memory workspace", () => {
    render(
      <ActivityList
        events={[
          {
            ...event,
            entity_type: "KNOWLEDGE",
            event_type: "MEMORY_ARCHIVED",
            metadata: { title: "Approved positioning" },
          },
        ]}
        members={[
          {
            display_name: "Alex",
            member_user_id: event.actor_id,
            role: "MEMBER",
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("link", {
        name: "Alex archived company memory “Approved positioning”",
      }),
    ).toHaveAttribute("href", "/memory");
  });
});
