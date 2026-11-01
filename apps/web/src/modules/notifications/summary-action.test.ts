import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ context: vi.fn(), summary: vi.fn() }));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.context,
}));
vi.mock("./server/data", () => ({ getNotificationSummary: mocks.summary }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error("redirect:" + path);
  },
}));
import { refreshNotificationSummaryAction } from "./summary-action";
beforeEach(() => vi.clearAllMocks());
describe("on-demand notification shell read", () => {
  it("derives both organization and recipient from fresh server context", async () => {
    mocks.context.mockResolvedValue({
      organization: { id: "org" },
      user: { id: "recipient" },
    });
    mocks.summary.mockResolvedValue({ items: [], unreadCount: 3 });
    expect(await refreshNotificationSummaryAction()).toEqual({
      organizationId: "org",
      summary: { items: [], unreadCount: 3 },
    });
    expect(mocks.summary).toHaveBeenCalledExactlyOnceWith("org", "recipient");
  });
  it("never reads notifications when membership is unavailable", async () => {
    mocks.context.mockResolvedValue(null);
    await expect(refreshNotificationSummaryAction()).rejects.toThrow(
      "redirect:/organization/new",
    );
    expect(mocks.summary).not.toHaveBeenCalled();
  });
});
