import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825000300_fix_onboarding_progress_advance.sql",
  ),
  "utf8",
).toLowerCase();

describe("onboarding progress advancement migration", () => {
  it("advances to an absolute next step idempotently", () => {
    expect(migration).toContain("(p_completed_step + 1)::smallint");
    expect(migration).toContain("greatest(");
    expect(migration).not.toContain("current_step + 1");
    expect(migration).toContain("p_completed_step > coalesce(durable_step, 1)");
  });

  it("requires an authenticated organization manager", () => {
    expect(migration).toContain("auth.uid()");
    expect(migration).toContain("private.has_organization_role");
    expect(migration).toContain("'owner', 'admin'");
    expect(migration).toContain("security invoker");
  });

  it("does not expose progress advancement to anonymous callers", () => {
    expect(migration).toContain("from public, anon");
    expect(migration).toContain("to authenticated");
  });
});
