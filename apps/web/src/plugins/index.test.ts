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

describe("Marketing plugin", () => {
  it("is statically registered with the TASK-013 routes and bounded domains", () => {
    const manifest = builtInPluginRegistry.get("marketing")?.manifest;
    expect(manifest?.memoryDomains).toEqual(["company", "marketing"]);
    expect(manifest?.navigation.map((item) => item.route)).toEqual([
      "/apps/marketing",
      "/apps/marketing/competitors",
      "/apps/marketing/reel-ideas",
      "/apps/marketing/creative-studio",
      "/apps/marketing/campaigns",
      "/apps/marketing/research",
      "/apps/marketing/creative-briefs",
    ]);
    expect(builtInPluginRegistry.getNavigation([])).not.toContainEqual(
      expect.objectContaining({ pluginId: "marketing" }),
    );
    expect(
      builtInPluginRegistry
        .getNavigation(["marketing"])
        .filter((item) => item.pluginId === "marketing"),
    ).toHaveLength(7);
    expect(manifest?.capabilities).toContain(
      "marketing.creative-council.execute",
    );
  });
});
