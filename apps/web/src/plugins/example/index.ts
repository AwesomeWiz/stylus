import { definePlugin } from "@/core/plugins/public";

export const examplePlugin = definePlugin({
  eventHandlers: {
    "plugin.enabled": () => undefined,
  },
  manifest: {
    capabilities: ["example.hello"],
    category: "development",
    description:
      "A minimal built-in module that verifies Stylus plugin registration and isolation.",
    eventSubscriptions: ["plugin.enabled"],
    icon: "blocks",
    id: "example",
    memoryDomains: [],
    name: "Example Plugin",
    navigation: [
      {
        icon: "blocks",
        label: "Example Plugin",
        order: 900,
        route: "/apps/example",
      },
    ],
    permissions: ["example.read"],
    tools: [
      {
        description:
          "Declares a harmless future tool extension without providing execution infrastructure.",
        id: "example.greeting.preview",
        name: "Preview greeting",
      },
    ],
    version: "0.1.0",
  },
});
