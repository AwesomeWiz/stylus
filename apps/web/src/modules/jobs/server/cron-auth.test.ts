import { describe, expect, it } from "vitest";

import { isAuthorizedCronRequest } from "./cron-auth";

describe("serverless Cron authentication", () => {
  it("accepts only an exact configured bearer secret", () => {
    expect(isAuthorizedCronRequest("Bearer secret-value", "secret-value")).toBe(
      true,
    );
    expect(isAuthorizedCronRequest("Bearer wrong-value", "secret-value")).toBe(
      false,
    );
    expect(isAuthorizedCronRequest("Basic secret-value", "secret-value")).toBe(
      false,
    );
    expect(isAuthorizedCronRequest(null, "secret-value")).toBe(false);
    expect(isAuthorizedCronRequest("Bearer secret-value", undefined)).toBe(
      false,
    );
  });
});
