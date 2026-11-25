import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getSessionRouteDecision,
  isServerlessJobCronPath,
  isWorkerBrokerPath,
  isSessionApplicationPath,
} from "./proxy";

describe("session route decisions", () => {
  it("lets unmatched addresses reach a public 404 while known private roots stay gated", () => {
    expect(getSessionRouteDecision("/missing-example", false)).toBeNull();
    expect(getSessionRouteDecision("/tasks/private", false)).toBe("/login");
    expect(
      getSessionRouteDecision("/integrations/github/callback", false),
    ).toBe("/login");
  });

  it("covers every actual page and route handler in the session root inventory", () => {
    function inspect(folder: string, segments: string[] = []) {
      for (const entry of readdirSync(folder, { withFileTypes: true })) {
        if (entry.isDirectory())
          inspect(
            join(folder, entry.name),
            entry.name.startsWith("(") ? segments : [...segments, entry.name],
          );
        else if (entry.name === "page.tsx" || entry.name === "route.ts") {
          const path =
            "/" +
            segments.map((s) => (s.startsWith("[") ? "example" : s)).join("/");
          if (path === "/about") {
            expect(isSessionApplicationPath(path)).toBe(false);
            expect(getSessionRouteDecision(path, false)).toBeNull();
          } else {
            expect(isSessionApplicationPath(path), path).toBe(true);
          }
        }
      }
    }
    inspect(join(dirname(fileURLToPath(import.meta.url)), "../../app"));
  });
  it("redirects unauthenticated application requests to login", () => {
    expect(getSessionRouteDecision("/home", false)).toBe("/login");
    expect(getSessionRouteDecision("/", false)).toBeNull();
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
    expect(getSessionRouteDecision("/login", true)).toBe("/home");
    expect(getSessionRouteDecision("/signup", true)).toBe("/home");
    expect(getSessionRouteDecision("/", true)).toBe("/home");
    expect(getSessionRouteDecision("/home", true)).toBeNull();
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

  it("recognizes only the exact authenticated serverless Cron route", () => {
    expect(isServerlessJobCronPath("/api/cron/serverless-jobs")).toBe(true);
    expect(isServerlessJobCronPath("/api/cron/serverless-jobs/extra")).toBe(
      false,
    );
    expect(isServerlessJobCronPath("/api/cron/private")).toBe(false);
    expect(getSessionRouteDecision("/api/private", false)).toBe("/login");
  });
});
