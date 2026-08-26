import { describe, expect, it } from "vitest";

import { builtInPluginRegistry } from ".";

describe("example plugin", () => {
  it("proves static capability and event registration without business logic", async () => {
    expect(
      builtInPluginRegistry.getCapability("example.hello")?.manifest.id,
    ).toBe("example");
    await expect(
      builtInPluginRegistry.dispatchEvent({
        enabledPluginIds: ["example"],
        event: "plugin.enabled",
        organizationId: "10000000-0000-4000-8000-000000000001",
        payload: { pluginId: "example" },
      }),
    ).resolves.toEqual({ failures: [], handledBy: ["example"] });
  });
});
