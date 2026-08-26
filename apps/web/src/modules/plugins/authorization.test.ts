import { describe, expect, it } from "vitest";

import {
  authorizePluginAvailability,
  PluginUnavailableError,
} from "./authorization";

describe("plugin route authorization", () => {
  it("allows registered enabled plugins", () => {
    expect(
      authorizePluginAvailability({
        enabledPluginIds: ["example"],
        pluginId: "example",
        registeredPluginIds: ["example"],
      }),
    ).toBe("example");
  });

  it.each([
    {
      enabledPluginIds: [],
      pluginId: "example",
      registeredPluginIds: ["example"],
    },
    {
      enabledPluginIds: ["unknown"],
      pluginId: "unknown",
      registeredPluginIds: ["example"],
    },
  ])("denies disabled and unregistered direct routes", (input) => {
    expect(() => authorizePluginAvailability(input)).toThrow(
      PluginUnavailableError,
    );
  });
});
