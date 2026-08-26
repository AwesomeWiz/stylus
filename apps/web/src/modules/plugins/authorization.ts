export class PluginUnavailableError extends Error {
  constructor() {
    super("Plugin is not available for this organization");
    this.name = "PluginUnavailableError";
  }
}

export function authorizePluginAvailability(input: {
  enabledPluginIds: Iterable<string>;
  pluginId: string;
  registeredPluginIds: Iterable<string>;
}) {
  const registered = new Set(input.registeredPluginIds);
  const enabled = new Set(input.enabledPluginIds);
  if (!registered.has(input.pluginId) || !enabled.has(input.pluginId))
    throw new PluginUnavailableError();
  return input.pluginId;
}
