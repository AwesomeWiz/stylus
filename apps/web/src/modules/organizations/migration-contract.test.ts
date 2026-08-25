import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "../../supabase/migrations/20260825000100_auth_organizations.sql",
);
const migration = readFileSync(migrationPath, "utf8");

describe("organization migration security contract", () => {
  it("enables RLS and restricts unauthenticated table access", () => {
    expect(migration).toContain(
      "alter table public.organizations enable row level security",
    );
    expect(migration).toContain(
      "alter table public.memberships enable row level security",
    );
    expect(migration).toMatch(
      /revoke all on table public\.organizations from anon, authenticated/i,
    );
    expect(migration).toMatch(
      /revoke all on table public\.memberships from anon, authenticated/i,
    );
  });

  it("creates organizations and OWNER memberships in one function", () => {
    expect(migration).toMatch(
      /create function public\.create_organization\(p_name text\)[\s\S]*security definer[\s\S]*set search_path = ''/i,
    );
    expect(migration).toMatch(
      /insert into public\.organizations[\s\S]*insert into public\.memberships[\s\S]*'OWNER'/i,
    );
  });

  it("does not grant direct membership mutation privileges", () => {
    expect(migration).toContain(
      "grant select on table public.memberships to authenticated",
    );
    expect(migration).not.toMatch(
      /grant\s+(insert|update|delete)[^;]*public\.memberships\s+to\s+authenticated/i,
    );
  });

  it("requires membership for organization reads and manager roles for updates", () => {
    expect(migration).toContain("organizations_select_for_members");
    expect(migration).toContain("private.is_organization_member(id)");
    expect(migration).toContain("organizations_update_for_managers");
    expect(migration).toContain("array['OWNER', 'ADMIN']");
  });
});
