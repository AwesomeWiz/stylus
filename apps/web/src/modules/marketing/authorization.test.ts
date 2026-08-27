import { describe, expect, it } from "vitest";
import { assertCanMutateMarketing, canMutateMarketing } from "./authorization";

describe("Marketing role policy", () => {
  it.each(["OWNER", "ADMIN", "MEMBER"] as const)(
    "allows %s ordinary CRUD",
    (role) => {
      expect(canMutateMarketing(role)).toBe(true);
      expect(() => assertCanMutateMarketing(role)).not.toThrow();
    },
  );
  it("keeps VIEWER read-only", () => {
    expect(canMutateMarketing("VIEWER")).toBe(false);
    expect(() => assertCanMutateMarketing("VIEWER")).toThrow(
      "Marketing write permission required",
    );
  });
});
