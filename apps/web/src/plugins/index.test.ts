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
  it("registers the six growth destinations and retains bounded domains and execution capabilities", () => {
    const manifest = builtInPluginRegistry.get("marketing")?.manifest;
    expect(manifest?.memoryDomains).toEqual(["company", "marketing"]);
    expect(manifest?.navigation.map((item) => item.route)).toEqual([
      "/apps/marketing",
      "/apps/marketing/research",
      "/apps/marketing/experiments",
      "/apps/marketing/creative-studio",
      "/apps/marketing/campaigns",
      "/apps/marketing/learn",
    ]);
    expect(manifest?.navigation.map((item) => item.label)).toEqual([
      "Overview",
      "Research",
      "Experiments",
      "Create",
      "Campaigns",
      "Learn",
    ]);
    expect(builtInPluginRegistry.getNavigation([])).not.toContainEqual(
      expect.objectContaining({ pluginId: "marketing" }),
    );
    expect(
      builtInPluginRegistry
        .getNavigation(["marketing"])
        .filter((item) => item.pluginId === "marketing"),
    ).toHaveLength(6);
    expect(manifest?.capabilities).toEqual(
      expect.arrayContaining([
        "marketing.competitors.read",
        "marketing.reels.read",
        "marketing.briefs.read",
        "marketing.research.read",
        "marketing.campaigns.read",
        "marketing.external-research.execute",
        "marketing.hypotheses.read",
        "marketing.hypotheses.write",
        "marketing.experiments.read",
        "marketing.experiments.write",
        "marketing.learnings.read",
        "marketing.learnings.write",
      ]),
    );
    expect(manifest?.capabilities).toContain(
      "marketing.creative-council.execute",
    );
    expect(manifest?.capabilities).toContain("marketing.ask-council.execute");
  });
});
