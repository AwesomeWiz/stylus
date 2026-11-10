import { beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  context: vi.fn(),
  enabled: vi.fn(),
  attention: vi.fn(),
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: m.context,
}));
vi.mock("@/modules/plugins/server/data", () => ({
  getEnabledOrganizationPluginIds: m.enabled,
}));
vi.mock("@/modules/marketing/server/daily-attention", () => ({
  marketingDailyAttention: m.attention,
}));
import { workspacePluginAttention } from "./attention";
const org = crypto.randomUUID(),
  actor = crypto.randomUUID(),
  now = "2026-11-10T12:00:00Z";
beforeEach(() => {
  vi.clearAllMocks();
  m.context.mockResolvedValue({
    organization: { id: org },
    user: { id: actor },
    membership: { role: "VIEWER" },
  });
  m.enabled.mockResolvedValue(["marketing"]);
  m.attention.mockResolvedValue([]);
});
describe("trusted daily attention composition", () => {
  it("does not query disabled plugin persistence", async () => {
    m.enabled.mockResolvedValue([]);
    expect(await workspacePluginAttention(org, now)).toEqual([]);
    expect(m.attention).not.toHaveBeenCalled();
  });
  it("passes verified context and validates safe output", async () => {
    expect(await workspacePluginAttention(org, now)).toEqual([]);
    expect(m.attention).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: org,
        actorId: actor,
        role: "VIEWER",
      }),
      now,
    );
    m.attention.mockResolvedValue([
      { title: "Private", href: "https://example.test" },
    ]);
    await expect(workspacePluginAttention(org, now)).rejects.toBeDefined();
  });
  it("denies foreign requested organization and revoked identity", async () => {
    await expect(
      workspacePluginAttention(crypto.randomUUID(), now),
    ).rejects.toMatchObject({ code: "42501" });
    m.context.mockResolvedValue(null);
    await expect(workspacePluginAttention(org, now)).rejects.toMatchObject({
      code: "42501",
    });
    expect(m.attention).not.toHaveBeenCalled();
  });
});
