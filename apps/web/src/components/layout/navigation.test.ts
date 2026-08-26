import { describe, expect, it } from "vitest";

import { getApplicationNavigation } from "@/plugins";

import { navigationGroups } from "./navigation";

describe("application navigation", () => {
  it("links task management from the core navigation", () => {
    expect(navigationGroups[0]?.items).toContainEqual(
      expect.objectContaining({ label: "Tasks", href: "/tasks" }),
    );
    expect(navigationGroups[0]?.items).toContainEqual(
      expect.objectContaining({ label: "Activity", href: "/activity" }),
    );
  });

  it("contains the required navigation sections", () => {
    expect(navigationGroups.map((group) => group.label)).toEqual([
      "Core",
      "Platform",
      "System",
    ]);
  });

  it("keeps Core navigation and adds only enabled plugin contributions", () => {
    expect(
      getApplicationNavigation([]).flatMap((group) => group.items),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "/tasks", label: "Tasks" }),
        expect.objectContaining({ href: "/apps", label: "Apps" }),
      ]),
    );
    expect(
      getApplicationNavigation([])
        .flatMap((group) => group.items)
        .some((item) => item.href === "/apps/example"),
    ).toBe(false);
    expect(
      getApplicationNavigation(["example"])
        .flatMap((group) => group.items)
        .some((item) => item.href === "/apps/example"),
    ).toBe(true);
  });
});
