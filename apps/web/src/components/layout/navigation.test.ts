import { describe, expect, it } from "vitest";

import { navigationGroups } from "./navigation";

describe("application navigation", () => {
  it("links task management from the core navigation", () => {
    expect(navigationGroups[0]?.items).toContainEqual(
      expect.objectContaining({ label: "Tasks", href: "/tasks" }),
    );
  });

  it("contains the required navigation sections", () => {
    expect(navigationGroups.map((group) => group.label)).toEqual([
      "Core",
      "Marketing",
      "Platform",
      "System",
    ]);
  });
});
