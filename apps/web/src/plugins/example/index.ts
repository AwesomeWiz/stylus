import { defineJob, z } from "@/core/jobs/public";
import { definePlugin } from "@/core/plugins/public";

export const examplePlugin = definePlugin({
  eventHandlers: {
    "plugin.enabled": () => undefined,
  },
  jobDefinitions: [
    defineJob({
      capability: "example.hello",
      description:
        "A deterministic plugin job used to verify trusted registration and enablement.",
      executionClass: "SERVERLESS",
      handler: async (input) => ({ greeting: `Hello ${input.name}` }),
      hostedExecutionSupported: false,
      id: "example.test.greeting",
      idempotency: "OPTIONAL",
      inputSchema: z
        .object({ name: z.string().trim().min(1).max(40) })
        .strict(),
      maxAttempts: 1,
      origin: { kind: "plugin", pluginId: "example" },
      outputSchema: z.object({ greeting: z.string().max(80) }).strict(),
      priority: 50,
      retryableCategories: [],
      sideEffect: "NONE",
      timeoutMs: 10_000,
    }),
  ],
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
