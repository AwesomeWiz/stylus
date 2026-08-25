import { describe, expect, it } from "vitest";

import { navigationGroups } from "./navigation";

describe("application navigation", () => {
  it("keeps a single active destination", () => {
    const activeItems = navigationGroups
      .flatMap((group) => group.items)
      .filter((item) => item.active);

    expect(activeItems).toHaveLength(1);
    expect(activeItems[0]).toMatchObject({ label: "Home", href: "/" });
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
