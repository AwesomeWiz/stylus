import { describe, expect, it } from "vitest";

import {
  assertCanEnqueueJob,
  canCancelJob,
  canRetryJob,
} from "./authorization";

describe("job role policy", () => {
  it.each(["OWNER", "ADMIN", "MEMBER"] as const)(
    "allows %s to enqueue",
    (role) => {
      expect(() => assertCanEnqueueJob(role)).not.toThrow();
    },
  );
  it("denies VIEWER enqueue", () =>
    expect(() => assertCanEnqueueJob("VIEWER")).toThrow());
  it("allows managers to retry terminal work", () => {
    expect(canRetryJob("OWNER")).toBe(true);
    expect(canRetryJob("ADMIN")).toBe(true);
    expect(canRetryJob("MEMBER")).toBe(false);
  });
  it("allows members to cancel only their own work", () => {
    expect(canCancelJob({ createdBy: "a", role: "MEMBER", userId: "a" })).toBe(
      true,
    );
    expect(canCancelJob({ createdBy: "b", role: "MEMBER", userId: "a" })).toBe(
      false,
    );
  });
  it("keeps VIEWER cancellation read-only", () => {
    expect(canCancelJob({ createdBy: "a", role: "VIEWER", userId: "a" })).toBe(
      false,
    );
  });
});
