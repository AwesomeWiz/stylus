import { describe, expect, it } from "vitest";
import { getApplicationNavigation } from "@/plugins";
import {
  globalNavigationPath,
  navigationContext,
  settingsNavigation,
  navigationGroups,
} from "./navigation";

describe("V2 application navigation", () => {
  it("keeps three Core work destinations and Settings utility", () => {
    expect(navigationGroups.map((group) => group.label)).toEqual([
      "Workspace",
      "Utility",
    ]);
    expect(
      getApplicationNavigation([])
        .flatMap((group) => group.items)
        .map((item) => item.label),
    ).toEqual(["Home", "Tasks", "Boards", "Settings"]);
  });
  it("contributes exactly one Marketing entry when enabled and hides development fixtures", () => {
    const items = getApplicationNavigation(["marketing", "example"]).flatMap(
      (group) => group.items,
    );
    expect(items.map((item) => item.label)).toEqual([
      "Home",
      "Tasks",
      "Boards",
      "Marketing",
      "Settings",
    ]);
    expect(items.find((item) => item.label === "Marketing")?.href).toBe(
      "/apps/marketing",
    );
    expect(
      getApplicationNavigation([])
        .flatMap((group) => group.items)
        .some((item) => item.href.startsWith("/apps/marketing")),
    ).toBe(false);
    expect(items.some((item) => item.href === "/apps/example")).toBe(false);
  });
  it("selects the owning area for nested and relocated routes", () => {
    expect(navigationContext("/apps/marketing/creative-studio")).toBe(
      "Marketing",
    );
    for (const route of [
      "/apps/marketing/council",
      "/apps/marketing/competitors/id",
    ])
      expect(globalNavigationPath(route)).toBe("/apps/marketing");
    for (const { href } of settingsNavigation)
      expect(globalNavigationPath(href)).toBe("/settings");
    expect(globalNavigationPath("/activity")).toBe("/");
    expect(globalNavigationPath("/whiteboards/id")).toBe("/whiteboards");
    expect(globalNavigationPath("/apps/marketing-forged")).toBe("/settings");
  });
});
