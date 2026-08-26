import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825000800_plugin_framework.sql",
  ),
  "utf8",
);

describe("plugin framework migration security contract", () => {
  it("persists non-destructive organization-scoped enablement", () => {
    expect(migration).toMatch(/create table public\.organization_plugins/);
    expect(migration).toMatch(/primary key \(organization_id, plugin_id\)/);
    expect(migration).toMatch(/enabled boolean not null/);
    expect(migration).toMatch(/enabled_at timestamptz/);
    expect(migration).toMatch(/disabled_at timestamptz/);
    expect(migration).not.toMatch(/delete from public\.organization_plugins/);
  });

  it("derives actor provenance and repeats manager authorization", () => {
    expect(migration).toMatch(/v_actor uuid := \(select auth\.uid\(\)\)/);
    expect(migration).toMatch(/array\['OWNER', 'ADMIN'\]/);
    expect(migration).toMatch(/updated_by = v_actor/);
    expect(migration).toMatch(/security definer[\s\S]*set search_path = ''/);
  });

  it("allows member reads but no direct browser writes", () => {
    expect(migration).toMatch(/organization_plugins_member_select/);
    expect(migration).toMatch(
      /private\.is_organization_member\(organization_id\)/,
    );
    expect(migration).toMatch(
      /revoke all on table public\.organization_plugins from public, anon, authenticated/,
    );
    expect(migration).toMatch(
      /grant select on table public\.organization_plugins to authenticated/,
    );
    expect(migration).not.toMatch(
      /grant (insert|update|delete)[^;]*organization_plugins[^;]*authenticated/,
    );
  });
});
