import { describe, expect, it } from "vitest";

import type { OrganizationAIPolicyRow } from "@/lib/supabase/database.types";

import { authorizeAIExecution } from "./execution";

const policy: OrganizationAIPolicyRow = {
  allowed_provider_ids: [],
  created_at: "2026-08-26T00:00:00Z",
  default_tier: "FAST",
  execution_mode: "LOCAL_ONLY",
  monthly_remote_cost_limit_usd: null,
  organization_id: "10000000-0000-4000-8000-000000000001",
  updated_at: "2026-08-26T00:00:00Z",
  updated_by: "00000000-0000-4000-8000-000000000001",
};

describe("AI execution authorization", () => {
  it.each(["OWNER", "ADMIN", "MEMBER"] as const)(
    "permits an active %s to use an explicit Core capability",
    (role) => {
      expect(
        authorizeAIExecution({
          capability: "core.ai.test",
          enabledPluginIds: [],
          pluginId: null,
          policy,
          removedAt: null,
          role,
        }),
      ).toEqual({ memoryDomains: [] });
    },
  );

  it("denies VIEWER execution and disabled organization AI", () => {
    expect(() =>
      authorizeAIExecution({
        capability: "core.ai.test",
        enabledPluginIds: [],
        pluginId: null,
        policy,
        removedAt: null,
        role: "VIEWER",
      }),
    ).toThrow();
    expect(() =>
      authorizeAIExecution({
        capability: "core.ai.test",
        enabledPluginIds: [],
        pluginId: null,
        policy: { ...policy, execution_mode: "DISABLED" },
        removedAt: null,
        role: "OWNER",
      }),
    ).toThrow();
  });

  it("requires a registered enabled plugin and declared capability", () => {
    expect(
      authorizeAIExecution({
        capability: "example.hello",
        enabledPluginIds: ["example"],
        pluginId: "example",
        policy,
        removedAt: null,
        role: "MEMBER",
      }),
    ).toEqual({ memoryDomains: [] });
    expect(() =>
      authorizeAIExecution({
        capability: "example.hello",
        enabledPluginIds: [],
        pluginId: "example",
        policy,
        removedAt: null,
        role: "MEMBER",
      }),
    ).toThrow();
    expect(() =>
      authorizeAIExecution({
        capability: "example.undeclared",
        enabledPluginIds: ["example"],
        pluginId: "example",
        policy,
        removedAt: null,
        role: "MEMBER",
      }),
    ).toThrow();
  });

  it("rejects a removed membership even if its former role could execute", () => {
    expect(() =>
      authorizeAIExecution({
        capability: "core.ai.test",
        enabledPluginIds: [],
        pluginId: null,
        policy,
        removedAt: "2026-08-26T00:00:00Z",
        role: "MEMBER",
      }),
    ).toThrow();
  });
});
