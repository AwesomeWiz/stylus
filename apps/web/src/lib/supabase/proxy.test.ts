import { describe, expect, it } from "vitest";

import { getSessionRouteDecision } from "./proxy";

describe("session route decisions", () => {
  it("redirects unauthenticated application requests to login", () => {
    expect(getSessionRouteDecision("/", false)).toBe("/login");
    expect(getSessionRouteDecision("/organization/new", false)).toBe("/login");
    expect(getSessionRouteDecision("/onboarding/company", false)).toBe(
      "/login",
    );
    expect(getSessionRouteDecision("/company/profile", false)).toBe("/login");
  });

  it("allows unauthenticated authentication routes", () => {
    expect(getSessionRouteDecision("/login", false)).toBeNull();
    expect(getSessionRouteDecision("/signup", false)).toBeNull();
    expect(getSessionRouteDecision("/auth/confirm", false)).toBeNull();
  });

  it("keeps authenticated users out of entry routes", () => {
    expect(getSessionRouteDecision("/login", true)).toBe("/");
    expect(getSessionRouteDecision("/signup", true)).toBe("/");
    expect(getSessionRouteDecision("/", true)).toBeNull();
  });
});
