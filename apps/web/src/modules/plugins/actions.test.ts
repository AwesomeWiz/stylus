import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getContext: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.getContext,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));

import { setPluginEnabledAction } from "./actions";

const organizationId = "10000000-0000-4000-8000-000000000001";

function enablementForm(enabled: boolean, pluginId = "example") {
  const form = new FormData();
  form.set("enabled", String(enabled));
  form.set("pluginId", pluginId);
  return form;
}

describe("plugin enablement action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: {}, error: null });
  });

  it.each(["OWNER", "ADMIN"] as const)(
    "allows %s to enable a registered plugin in the current organization",
    async (role) => {
      mocks.getContext.mockResolvedValue({
        membership: { role },
        organization: { id: organizationId },
      });
      await expect(
        setPluginEnabledAction({ status: "idle" }, enablementForm(true)),
      ).resolves.toEqual({ message: "Plugin enabled.", status: "success" });
      expect(mocks.rpc).toHaveBeenCalledWith(
        "set_organization_plugin_enabled",
        {
          p_enabled: true,
          p_organization_id: organizationId,
          p_plugin_id: "example",
        },
      );
    },
  );

  it.each(["MEMBER", "VIEWER"] as const)(
    "blocks %s before opening the mutation RPC",
    async (role) => {
      mocks.getContext.mockResolvedValue({ membership: { role } });
      const result = await setPluginEnabledAction(
        { status: "idle" },
        enablementForm(false),
      );
      expect(result.status).toBe("error");
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );

  it("rejects unknown or tampered plugin IDs before persistence", async () => {
    const result = await setPluginEnabledAction(
      { status: "idle" },
      enablementForm(true, "unknown-plugin"),
    );
    expect(result).toEqual({
      message: "The plugin selection is invalid.",
      status: "error",
    });
    expect(mocks.getContext).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
