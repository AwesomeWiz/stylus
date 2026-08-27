import { z } from "zod";
import { describe, expect, it } from "vitest";

import { createJobRegistry, defineJob } from "./public";

function job(overrides: Record<string, unknown> = {}) {
  return defineJob({
    capability: "core.jobs.test",
    description: "A deterministic job definition for registry verification.",
    executionClass: "SERVERLESS",
    handler: async (input) => input,
    hostedExecutionSupported: true,
    id: "core.test.registry",
    idempotency: "OPTIONAL",
    inputSchema: z.object({ value: z.string() }).strict(),
    maxAttempts: 2,
    origin: { kind: "core" },
    outputSchema: z.object({ value: z.string() }).strict(),
    priority: 50,
    retryableCategories: ["transient_failure"],
    sideEffect: "NONE",
    timeoutMs: 5_000,
    ...overrides,
  });
}

describe("JobRegistry", () => {
  it("registers and lists a valid trusted definition", () => {
    const registry = createJobRegistry([job()]);
    expect(registry.get("core.test.registry")?.executionClass).toBe(
      "SERVERLESS",
    );
    expect(registry.list()).toHaveLength(1);
  });

  it("rejects duplicate job types", () => {
    expect(() => createJobRegistry([job(), job()])).toThrow(
      "Duplicate job type",
    );
  });

  it.each(["unsafe", "../unsafe", "Core.test", "core..test"])(
    "rejects invalid job type %s",
    (id) => expect(() => job({ id })).toThrow(),
  );

  it("rejects a Core definition outside the Core namespace", () => {
    expect(() => job({ id: "example.test.job" })).toThrow(/not owned/);
  });

  it("rejects a plugin definition outside its plugin namespace", () => {
    expect(() =>
      job({
        capability: "example.jobs.test",
        id: "other.test.job",
        origin: { kind: "plugin", pluginId: "example" },
      }),
    ).toThrow(/not owned/);
  });

  it("requires a handler for non-database execution", () => {
    expect(() => job({ handler: undefined })).toThrow(
      /statically registered handler/,
    );
  });

  it("permits a database-native definition without a TypeScript handler", () => {
    expect(
      job({ executionClass: "DATABASE", handler: undefined }).handler,
    ).toBeUndefined();
  });

  it("keeps schemas authoritative for input validation", () => {
    const definition = job();
    expect(definition.inputSchema.safeParse({ value: "ok" }).success).toBe(
      true,
    );
    expect(definition.inputSchema.safeParse({ value: 7 }).success).toBe(false);
  });
});
