import { z } from "zod";

export const pluginIdSchema = z
  .string()
  .min(2)
  .max(50)
  .regex(
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/,
    "Plugin IDs must use lowercase URL-safe segments.",
  );

const extensionIdSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(
    /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/,
    "Extension identifiers must use dot-separated lowercase segments.",
  );

export const pluginIconIds = ["blocks", "flask-conical", "megaphone"] as const;
export const pluginIconIdSchema = z.enum(pluginIconIds);
export type PluginIconId = z.infer<typeof pluginIconIdSchema>;

export const pluginEventIds = [
  "board.comment.created",
  "plugin.disabled",
  "plugin.enabled",
  "task.completed",
] as const;
export const pluginEventIdSchema = z.enum(pluginEventIds);
export type PluginEventId = z.infer<typeof pluginEventIdSchema>;

export const pluginMemoryDomains = ["agency", "company", "marketing"] as const;
export const pluginMemoryDomainSchema = z.enum(pluginMemoryDomains);
export type PluginMemoryDomain = z.infer<typeof pluginMemoryDomainSchema>;

const pluginNavigationSchema = z.object({
  icon: pluginIconIdSchema,
  label: z.string().trim().min(2).max(40),
  order: z.number().int().min(0).max(1000),
  route: z.string().regex(/^\/apps\/[a-z0-9/-]+$/),
});

const pluginToolSchema = z.object({
  description: z.string().trim().min(10).max(240),
  id: extensionIdSchema,
  name: z.string().trim().min(2).max(60),
});

function unique(values: string[]) {
  return new Set(values).size === values.length;
}

export const pluginManifestSchema = z
  .object({
    capabilities: z.array(extensionIdSchema).max(30).default([]),
    category: z.enum(["business", "development", "integration"]),
    description: z.string().trim().min(10).max(280),
    eventSubscriptions: z.array(pluginEventIdSchema).max(20).default([]),
    icon: pluginIconIdSchema,
    id: pluginIdSchema,
    memoryDomains: z.array(pluginMemoryDomainSchema).max(3).default([]),
    name: z.string().trim().min(2).max(60),
    navigation: z.array(pluginNavigationSchema).max(10).default([]),
    permissions: z.array(extensionIdSchema).max(30).default([]),
    tools: z.array(pluginToolSchema).max(20).default([]),
    version: z.string().regex(/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/),
  })
  .strict()
  .superRefine((manifest, context) => {
    const prefixedGroups = [
      ["permissions", manifest.permissions],
      ["tools", manifest.tools.map((tool) => tool.id)],
    ] as const;
    if (!unique(manifest.capabilities))
      context.addIssue({
        code: "custom",
        message: "capabilities must not contain duplicates.",
        path: ["capabilities"],
      });
    for (const [field, values] of prefixedGroups) {
      if (!unique(values))
        context.addIssue({
          code: "custom",
          message: `${field} must not contain duplicates.`,
          path: [field],
        });
      values.forEach((value, index) => {
        if (!value.startsWith(`${manifest.id}.`))
          context.addIssue({
            code: "custom",
            message: `${field} identifiers must be owned by the plugin ID.`,
            path: [field, index],
          });
      });
    }
    if (!unique(manifest.eventSubscriptions))
      context.addIssue({
        code: "custom",
        message: "Event subscriptions must not contain duplicates.",
        path: ["eventSubscriptions"],
      });
    if (!unique(manifest.memoryDomains))
      context.addIssue({
        code: "custom",
        message: "Memory domains must not contain duplicates.",
        path: ["memoryDomains"],
      });
    manifest.navigation.forEach((item, index) => {
      if (!item.route.startsWith(`/apps/${manifest.id}`))
        context.addIssue({
          code: "custom",
          message: "Plugin routes must remain under the plugin namespace.",
          path: ["navigation", index, "route"],
        });
    });
    const allowedMemoryDomains =
      manifest.id === "marketing"
        ? new Set<PluginMemoryDomain>(["company", "marketing"])
        : manifest.id === "web-agency"
          ? new Set<PluginMemoryDomain>(["agency"])
          : null;
    if (
      allowedMemoryDomains &&
      manifest.memoryDomains.some((domain) => !allowedMemoryDomains.has(domain))
    )
      context.addIssue({
        code: "custom",
        message:
          "The plugin requested a memory domain outside its core policy.",
        path: ["memoryDomains"],
      });
  });

export type PluginManifest = z.infer<typeof pluginManifestSchema>;

export interface PluginEventContext {
  event: PluginEventId;
  organizationId: string;
  payload: Readonly<Record<string, unknown>>;
}

export type PluginEventHandler = (
  context: PluginEventContext,
) => Promise<void> | void;

export interface PluginDefinition {
  eventHandlers: Readonly<Partial<Record<PluginEventId, PluginEventHandler>>>;
  manifest: Readonly<PluginManifest>;
}

export function definePlugin(input: {
  eventHandlers?: Partial<Record<PluginEventId, PluginEventHandler>>;
  manifest: z.input<typeof pluginManifestSchema>;
}): PluginDefinition {
  const manifest = pluginManifestSchema.parse(input.manifest);
  const handlers = input.eventHandlers ?? {};
  const handlerEvents = Object.keys(handlers) as PluginEventId[];
  if (
    handlerEvents.some(
      (event) => !manifest.eventSubscriptions.includes(event),
    ) ||
    manifest.eventSubscriptions.some((event) => !handlers[event])
  )
    throw new Error(
      `Plugin "${manifest.id}" event subscriptions and handlers must match.`,
    );
  return Object.freeze({
    eventHandlers: Object.freeze({ ...handlers }),
    manifest: Object.freeze(manifest),
  });
}

export interface PluginEventFailure {
  error: unknown;
  event: PluginEventId;
  pluginId: string;
}

export interface PluginEventDispatchResult {
  failures: PluginEventFailure[];
  handledBy: string[];
}

export class PluginRegistry {
  readonly #capabilities = new Map<string, string>();
  readonly #plugins = new Map<string, PluginDefinition>();

  constructor(definitions: PluginDefinition[] = []) {
    definitions.forEach((definition) => this.register(definition));
  }

  register(definition: PluginDefinition) {
    const normalized = definePlugin(definition);
    const { id } = normalized.manifest;
    if (this.#plugins.has(id)) throw new Error(`Duplicate plugin ID: ${id}`);
    normalized.manifest.capabilities.forEach((capability) => {
      const owner = this.#capabilities.get(capability);
      if (owner)
        throw new Error(
          `Capability "${capability}" is already provided by "${owner}".`,
        );
    });
    this.#plugins.set(id, normalized);
    normalized.manifest.capabilities.forEach((capability) =>
      this.#capabilities.set(capability, id),
    );
    return this;
  }

  get(pluginId: string) {
    return this.#plugins.get(pluginId);
  }

  list() {
    return [...this.#plugins.values()].sort((left, right) =>
      left.manifest.id.localeCompare(right.manifest.id),
    );
  }

  getCapability(capabilityId: string) {
    const owner = this.#capabilities.get(capabilityId);
    return owner ? this.#plugins.get(owner) : undefined;
  }

  getPermissions(pluginId: string) {
    return this.get(pluginId)?.manifest.permissions ?? [];
  }

  getEventSubscriptions(pluginId: string) {
    return this.get(pluginId)?.manifest.eventSubscriptions ?? [];
  }

  isEnabled(pluginId: string, enabledPluginIds: Iterable<string>) {
    return (
      this.#plugins.has(pluginId) && new Set(enabledPluginIds).has(pluginId)
    );
  }

  getAvailableCapability(
    capabilityId: string,
    enabledPluginIds: Iterable<string>,
  ) {
    const definition = this.getCapability(capabilityId);
    if (!definition) return undefined;
    return this.isEnabled(definition.manifest.id, enabledPluginIds)
      ? definition
      : undefined;
  }

  getNavigation(enabledPluginIds: Iterable<string>) {
    const enabled = new Set(enabledPluginIds);
    return this.list()
      .filter((definition) => enabled.has(definition.manifest.id))
      .flatMap((definition) =>
        definition.manifest.navigation.map((item) => ({
          ...item,
          pluginId: definition.manifest.id,
        })),
      )
      .sort(
        (left, right) =>
          left.order - right.order ||
          left.pluginId.localeCompare(right.pluginId),
      );
  }

  async dispatchEvent(input: {
    enabledPluginIds: Iterable<string>;
    event: PluginEventId;
    onFailure?: (failure: PluginEventFailure) => void;
    organizationId: string;
    payload?: Readonly<Record<string, unknown>>;
  }): Promise<PluginEventDispatchResult> {
    const enabled = new Set(input.enabledPluginIds);
    const result: PluginEventDispatchResult = { failures: [], handledBy: [] };
    for (const definition of this.list()) {
      if (!enabled.has(definition.manifest.id)) continue;
      const handler = definition.eventHandlers[input.event];
      if (!handler) continue;
      try {
        await handler({
          event: input.event,
          organizationId: input.organizationId,
          payload: input.payload ?? {},
        });
        result.handledBy.push(definition.manifest.id);
      } catch (error) {
        const failure = {
          error,
          event: input.event,
          pluginId: definition.manifest.id,
        };
        result.failures.push(failure);
        input.onFailure?.(failure);
      }
    }
    return result;
  }
}

export function createPluginRegistry(definitions: PluginDefinition[]) {
  return new PluginRegistry(definitions);
}
