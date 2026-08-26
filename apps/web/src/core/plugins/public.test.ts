import { describe, expect, it, vi } from "vitest";

import {
  createPluginRegistry,
  definePlugin,
  pluginManifestSchema,
} from "./public";

function plugin(
  id: string,
  options: {
    capability?: string;
    eventHandler?: () => Promise<void> | void;
  } = {},
) {
  return definePlugin({
    eventHandlers: options.eventHandler
      ? { "plugin.enabled": options.eventHandler }
      : {},
    manifest: {
      capabilities: options.capability ? [options.capability] : [],
      category: "business",
      description: `A valid ${id} plugin used by the registry test suite.`,
      eventSubscriptions: options.eventHandler ? ["plugin.enabled"] : [],
      icon: "blocks",
      id,
      memoryDomains: [],
      name: `${id} plugin`,
      navigation: [
        {
          icon: "blocks",
          label: `${id} page`,
          order: 10,
          route: `/apps/${id}`,
        },
      ],
      permissions: [`${id}.read`],
      tools: [],
      version: "1.0.0",
    },
  });
}

describe("plugin manifest and registry", () => {
  it("registers valid manifests and lists them deterministically", () => {
    const registry = createPluginRegistry([plugin("zeta"), plugin("alpha")]);
    expect(registry.list().map(({ manifest }) => manifest.id)).toEqual([
      "alpha",
      "zeta",
    ]);
    expect(registry.get("alpha")?.manifest.name).toBe("alpha plugin");
    expect(registry.getPermissions("alpha")).toEqual(["alpha.read"]);
    expect(registry.getEventSubscriptions("alpha")).toEqual([]);
    expect(registry.isEnabled("alpha", ["alpha"])).toBe(true);
    expect(registry.isEnabled("missing", ["missing"])).toBe(false);
  });

  it("rejects duplicate plugin IDs", () => {
    expect(() =>
      createPluginRegistry([plugin("alpha"), plugin("alpha")]),
    ).toThrow("Duplicate plugin ID: alpha");
  });

  it.each(["Marketing", "two words", "../plugin", "a_thing"])(
    "rejects unsafe plugin ID %s",
    (id) => {
      expect(() => plugin(id)).toThrow();
    },
  );

  it("rejects malformed manifests and icons", () => {
    expect(() =>
      pluginManifestSchema.parse({
        ...plugin("alpha").manifest,
        icon: "arbitrary-component",
      }),
    ).toThrow();
  });

  it("rejects exclusive capability collisions instead of choosing a winner", () => {
    expect(() =>
      createPluginRegistry([
        plugin("alpha", { capability: "shared.export" }),
        plugin("beta", { capability: "shared.export" }),
      ]),
    ).toThrow('Capability "shared.export" is already provided by "alpha".');
  });

  it("discovers capabilities only while their owner is enabled", () => {
    const registry = createPluginRegistry([
      plugin("alpha", { capability: "alpha.report" }),
    ]);
    expect(registry.getCapability("alpha.report")?.manifest.id).toBe("alpha");
    expect(registry.getAvailableCapability("alpha.report", [])).toBeUndefined();
    expect(
      registry.getAvailableCapability("alpha.report", ["alpha"])?.manifest.id,
    ).toBe("alpha");
  });

  it("returns navigation only for enabled plugins in declared order", () => {
    const registry = createPluginRegistry([plugin("alpha"), plugin("beta")]);
    expect(registry.getNavigation([])).toEqual([]);
    expect(
      registry.getNavigation(["beta"]).map((item) => item.pluginId),
    ).toEqual(["beta"]);
  });

  it("invokes relevant enabled handlers and ignores unrelated events", async () => {
    const handler = vi.fn();
    const registry = createPluginRegistry([
      plugin("alpha", { eventHandler: handler }),
    ]);
    await registry.dispatchEvent({
      enabledPluginIds: ["alpha"],
      event: "task.completed",
      organizationId: "organization",
    });
    expect(handler).not.toHaveBeenCalled();
    const result = await registry.dispatchEvent({
      enabledPluginIds: ["alpha"],
      event: "plugin.enabled",
      organizationId: "organization",
      payload: { pluginId: "alpha" },
    });
    expect(handler).toHaveBeenCalledOnce();
    expect(result.handledBy).toEqual(["alpha"]);
  });

  it("isolates handler failures and makes them observable", async () => {
    const failure = new Error("handler failed");
    const observer = vi.fn();
    const succeeding = vi.fn();
    const registry = createPluginRegistry([
      plugin("alpha", {
        eventHandler: () => {
          throw failure;
        },
      }),
      plugin("beta", { eventHandler: succeeding }),
    ]);
    const result = await registry.dispatchEvent({
      enabledPluginIds: ["alpha", "beta"],
      event: "plugin.enabled",
      onFailure: observer,
      organizationId: "organization",
    });
    expect(succeeding).toHaveBeenCalledOnce();
    expect(result.handledBy).toEqual(["beta"]);
    expect(result.failures).toEqual([
      expect.objectContaining({ error: failure, pluginId: "alpha" }),
    ]);
    expect(observer).toHaveBeenCalledWith(result.failures[0]);
  });

  it("requires declared subscriptions to have exactly one handler", () => {
    expect(() =>
      definePlugin({
        manifest: {
          ...plugin("alpha").manifest,
          eventSubscriptions: ["plugin.enabled"],
        },
      }),
    ).toThrow("event subscriptions and handlers must match");
  });

  it("keeps future Marketing and Web Agency memory declarations isolated", () => {
    expect(() =>
      pluginManifestSchema.parse({
        ...plugin("marketing").manifest,
        memoryDomains: ["company", "marketing"],
      }),
    ).not.toThrow();
    expect(() =>
      pluginManifestSchema.parse({
        ...plugin("marketing").manifest,
        memoryDomains: ["agency"],
      }),
    ).toThrow("outside its core policy");
    expect(() =>
      pluginManifestSchema.parse({
        ...plugin("web-agency").manifest,
        memoryDomains: ["company"],
      }),
    ).toThrow("outside its core policy");
  });
});
