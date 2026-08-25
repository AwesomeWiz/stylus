import { describe, expect, it } from "vitest";

import {
  assertCanMutateTasks,
  canMutateTasks,
  TaskMutationDeniedError,
} from "./authorization";

describe("task authorization", () => {
  it.each(["OWNER", "ADMIN", "MEMBER"] as const)(
    "allows %s to collaborate on tasks",
    (role) => expect(canMutateTasks(role)).toBe(true),
  );

  it("keeps VIEWER read-only", () => {
    expect(canMutateTasks("VIEWER")).toBe(false);
    expect(() => assertCanMutateTasks("VIEWER")).toThrow(
      TaskMutationDeniedError,
    );
  });
});
