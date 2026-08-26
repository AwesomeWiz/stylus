import { z } from "zod";
import { describe, expect, it, vi } from "vitest";

import { AIToolRegistry } from "./tools";

function tool(execute = vi.fn()) {
  return {
    description: "Reads a safe test record.",
    execute,
    id: "example.record.read",
    inputSchema: z.object({ id: z.uuid() }),
    outputSchema: z.object({ found: z.boolean() }),
    owningPluginId: "example",
    requiredCapability: "example.hello",
    sideEffect: "read" as const,
  };
}

describe("AIToolRegistry", () => {
  it("registers trusted schemas and preserves side-effect metadata", () => {
    const registry = new AIToolRegistry().register(tool());
    expect(registry.get("example.record.read")).toMatchObject({
      requiredCapability: "example.hello",
      sideEffect: "read",
    });
  });

  it("does not execute arbitrary model-produced tool names", () => {
    const execute = vi.fn();
    const registry = new AIToolRegistry().register(tool(execute));
    expect(() =>
      registry.getAvailable({
        capability: "example.hello",
        enabledPluginIds: ["example"],
        pluginId: "example",
        toolId: "model.supplied.function",
      }),
    ).toThrow();
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects disabled plugins, capability mismatches, and malformed input", () => {
    const registry = new AIToolRegistry().register(tool());
    expect(() =>
      registry.getAvailable({
        capability: "example.hello",
        enabledPluginIds: [],
        pluginId: "example",
        toolId: "example.record.read",
      }),
    ).toThrow();
    const available = registry.getAvailable({
      capability: "example.hello",
      enabledPluginIds: ["example"],
      pluginId: "example",
      toolId: "example.record.read",
    });
    expect(() => registry.parseInput(available, { id: "forged" })).toThrow();
  });
});
