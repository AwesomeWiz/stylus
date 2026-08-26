import { describe, expect, it } from "vitest";

import { createMemorySchema, memoryFilterSchema } from "./schemas";

describe("memory schemas", () => {
  it("accepts bounded human memory fields", () => {
    expect(
      createMemorySchema.parse({
        content: "  An approved durable fact.  ",
        kind: "FACT",
        sourceReference: "  Decision log  ",
        title: "  Company fact  ",
      }),
    ).toEqual({
      content: "An approved durable fact.",
      kind: "FACT",
      sourceReference: "Decision log",
      title: "Company fact",
    });
  });

  it("rejects unbounded content and unsupported filters", () => {
    expect(
      createMemorySchema.safeParse({
        content: "x".repeat(10_001),
        kind: "FACT",
        sourceReference: "",
        title: "Company fact",
      }).success,
    ).toBe(false);
    expect(memoryFilterSchema.safeParse({ provenance: "FORGED" }).success).toBe(
      false,
    );
  });
});
