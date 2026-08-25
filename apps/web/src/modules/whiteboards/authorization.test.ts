import { describe, expect, it } from "vitest";

import {
  assertCanMutateWhiteboards,
  canMutateWhiteboards,
} from "./authorization";

describe("whiteboard authorization", () => {
  it.each(["OWNER", "ADMIN", "MEMBER"] as const)(
    "allows %s collaboration",
    (role) => {
      expect(canMutateWhiteboards(role)).toBe(true);
      expect(() => assertCanMutateWhiteboards(role)).not.toThrow();
    },
  );

  it("keeps VIEWER read-only", () => {
    expect(canMutateWhiteboards("VIEWER")).toBe(false);
    expect(() => assertCanMutateWhiteboards("VIEWER")).toThrow(
      "Whiteboard mutation permission required",
    );
  });
});
