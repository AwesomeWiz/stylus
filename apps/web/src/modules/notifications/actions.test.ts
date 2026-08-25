import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  getContext: vi.fn(),
  maybeSingle: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createClient,
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.getContext,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "./actions";

const organizationId = "10000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000001";
const notificationId = "30000000-0000-4000-8000-000000000001";

describe("notification actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const chain = {
      eq: vi.fn(() => chain),
      maybeSingle: mocks.maybeSingle,
      select: vi.fn(() => chain),
    };
    mocks.from.mockReturnValue(chain);
    mocks.maybeSingle.mockResolvedValue({
      data: {
        entity_id: "20000000-0000-4000-8000-000000000001",
        entity_type: "TASK",
      },
      error: null,
    });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    mocks.createClient.mockResolvedValue({ from: mocks.from, rpc: mocks.rpc });
    mocks.getContext.mockResolvedValue({
      organization: { id: organizationId },
      user: { id: userId },
    });
  });

  it("marks only a server-derived recipient notification and navigates internally", async () => {
    const form = new FormData();
    form.set("notificationId", notificationId);
    form.set("organizationId", "90000000-0000-4000-8000-000000000009");
    await markNotificationReadAction(form);

    const chain = mocks.from.mock.results[0]?.value;
    expect(chain.eq).toHaveBeenCalledWith("organization_id", organizationId);
    expect(chain.eq).toHaveBeenCalledWith("recipient_id", userId);
    expect(mocks.rpc).toHaveBeenCalledWith("mark_notification_read", {
      p_notification_id: notificationId,
      p_organization_id: organizationId,
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/tasks?view=all&task=20000000-0000-4000-8000-000000000001",
    );
  });

  it("marks all only within the current recipient organization", async () => {
    await markAllNotificationsReadAction();
    expect(mocks.rpc).toHaveBeenCalledWith("mark_all_notifications_read", {
      p_organization_id: organizationId,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("does not mark a notification unavailable to the current recipient", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    const form = new FormData();
    form.set("notificationId", notificationId);
    await markNotificationReadAction(form);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
