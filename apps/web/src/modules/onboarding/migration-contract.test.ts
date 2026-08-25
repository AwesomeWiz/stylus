import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825000200_company_onboarding.sql",
  ),
  "utf8",
).toLowerCase();
const tables = [
  "company_profiles",
  "audience_profiles",
  "brand_profiles",
  "marketing_profiles",
  "competitors",
  "onboarding_progress",
];

describe("company onboarding migration security contract", () => {
  it.each(tables)("enables RLS and manager policies for %s", (table) => {
    expect(migration).toContain(
      `alter table public.${table} enable row level security`,
    );
    expect(migration).toContain(`'${table}'`);
    expect(migration).toContain("'_select_for_members'");
    expect(migration).toContain("'_insert_for_managers'");
    expect(migration).toContain("'_update_for_managers'");
  });

  it("prevents organization ownership reassignment on every owned table", () => {
    expect(migration).toContain(
      "create function private.enforce_onboarding_record_scope()",
    );
    for (const table of tables)
      expect(migration).toContain(`${table}_prevent_organization_reassignment`);
  });

  it("protects creator and updater provenance from mass assignment", () => {
    expect(migration).toContain("record creator cannot be reassigned");
    expect(migration).toContain("updater must match authenticated user");
    expect(migration).toContain("onboarding starter cannot be reassigned");
  });

  it("does not modify or introduce AI memory", () => {
    expect(migration).not.toContain("ai_memories");
    expect(migration).not.toContain("embedding");
  });
});
