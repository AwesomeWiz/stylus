import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enabledIds: vi.fn(),
  getContext: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: vi.fn(),
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.getContext,
}));
vi.mock("./data", () => ({
  getEnabledOrganizationPluginIds: mocks.enabledIds,
}));

import { requireEnabledPlugin } from "./guard";

describe("plugin server route guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getContext.mockResolvedValue({
      organization: { id: "10000000-0000-4000-8000-000000000001" },
    });
  });

  it("returns the registered definition for an enabled organization plugin", async () => {
    mocks.enabledIds.mockResolvedValue(["example"]);
    await expect(requireEnabledPlugin("example")).resolves.toEqual(
      expect.objectContaining({
        plugin: expect.objectContaining({
          manifest: expect.objectContaining({ id: "example" }),
        }),
      }),
    );
  });

  it("returns not found for a disabled direct plugin route", async () => {
    mocks.enabledIds.mockResolvedValue([]);
    await expect(requireEnabledPlugin("example")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });
});
