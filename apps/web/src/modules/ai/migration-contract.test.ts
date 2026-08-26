import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825000900_ai_foundation.sql",
  ),
  "utf8",
);

describe("AI foundation migration contract", () => {
  it("creates isolated policy and metadata-only run storage", () => {
    expect(migration).toContain("create table public.organization_ai_policies");
    expect(migration).toContain("create table public.ai_runs");
    expect(migration).toContain("trace_metadata jsonb");
    expect(migration).not.toMatch(/\bprompt\s+(text|jsonb)/i);
    expect(migration).not.toMatch(/\bresponse\s+(text|jsonb)/i);
    expect(migration).not.toMatch(/api_key|secret_key|access_token/i);
  });

  it("pins privileged functions and grants no direct writes", () => {
    expect(migration.match(/security definer/g)?.length).toBe(3);
    expect(migration.match(/set search_path = ''/g)?.length).toBe(4);
    expect(migration).toContain(
      "revoke all on table public.ai_runs from public, anon, authenticated",
    );
    expect(migration).toContain(
      "revoke all on table public.organization_ai_policies from public, anon, authenticated",
    );
    expect(migration).not.toMatch(/grant (insert|update|delete)/i);
  });

  it("repeats role, plugin enablement, provenance, and trace privacy checks", () => {
    expect(migration).toContain("array['OWNER', 'ADMIN', 'MEMBER']");
    expect(migration).toContain("organization_plugin.enabled");
    expect(migration).toContain("v_actor uuid := (select auth.uid())");
    expect(migration).toContain("not trace_metadata ?| array[");
    expect(migration).toContain("not jsonb_path_exists(");
  });
});
