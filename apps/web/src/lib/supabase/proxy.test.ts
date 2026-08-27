import { describe, expect, it } from "vitest";

import { getSessionRouteDecision, isWorkerBrokerPath } from "./proxy";

describe("session route decisions", () => {
  it("redirects unauthenticated application requests to login", () => {
    expect(getSessionRouteDecision("/", false)).toBe("/login");
    expect(getSessionRouteDecision("/organization/new", false)).toBe("/login");
    expect(getSessionRouteDecision("/onboarding/company", false)).toBe(
      "/login",
    );
    expect(getSessionRouteDecision("/company/profile", false)).toBe("/login");
    expect(getSessionRouteDecision("/tasks", false)).toBe("/login");
  });

  it("allows unauthenticated authentication routes", () => {
    expect(getSessionRouteDecision("/login", false)).toBeNull();
    expect(getSessionRouteDecision("/signup", false)).toBeNull();
    expect(getSessionRouteDecision("/auth/confirm", false)).toBeNull();
    expect(
      getSessionRouteDecision(`/invite/${"A".repeat(43)}`, false),
    ).toBeNull();
  });

  it("keeps authenticated users out of entry routes", () => {
    expect(getSessionRouteDecision("/login", true)).toBe("/");
    expect(getSessionRouteDecision("/signup", true)).toBe("/");
    expect(getSessionRouteDecision("/", true)).toBeNull();
  });

  it("bypasses human sessions only for the worker broker", () => {
    expect(isWorkerBrokerPath("/api/worker/pair")).toBe(true);
    expect(isWorkerBrokerPath("/api/worker/claim")).toBe(true);
    expect(isWorkerBrokerPath("/api/workers")).toBe(false);
    expect(isWorkerBrokerPath("/api/private")).toBe(false);
    expect(isWorkerBrokerPath("/workers")).toBe(false);
    expect(getSessionRouteDecision("/api/private", false)).toBe("/login");
    expect(getSessionRouteDecision("/workers", false)).toBe("/login");
  });
});
