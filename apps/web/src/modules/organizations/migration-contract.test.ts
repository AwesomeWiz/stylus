import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const productionPolishMigration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825002010_final_production_polish.sql",
  ),
  "utf8",
);

describe("organization deletion migration contract", () => {
  it("keeps deletion owner-only, exact-confirmation, transactional, and narrowly granted", () => {
    expect(productionPolishMigration).toMatch(/security definer/);
    expect(productionPolishMigration).toMatch(/set search_path = ''/);
    expect(productionPolishMigration).toMatch(
      /membership_record\.role = 'OWNER'/,
    );
    expect(productionPolishMigration).toMatch(
      /p_confirmation_name is distinct from v_name/,
    );
    expect(productionPolishMigration).toMatch(
      /delete from public\.organizations/,
    );
    expect(productionPolishMigration).toMatch(
      /revoke all[\s\S]*from public, anon/,
    );
    expect(productionPolishMigration).toMatch(
      /grant execute[\s\S]*to authenticated/,
    );
  });
});

const migrationPath = resolve(
  process.cwd(),
  "../../supabase/migrations/20260825000100_auth_organizations.sql",
);
const migration = readFileSync(migrationPath, "utf8");
const invitationMigration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825000720_organization_team_invitations.sql",
  ),
  "utf8",
);

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

describe("organization invitation migration contract", () => {
  it("stores only hashed, expiring, organization-scoped invitations", () => {
    expect(invitationMigration).toMatch(
      /create table public\.organization_invitations/,
    );
    expect(invitationMigration).toMatch(/token_hash bytea not null unique/);
    expect(invitationMigration).not.toMatch(/\btoken text\b/);
    expect(invitationMigration).toMatch(
      /organization_invitations_active_email_key/,
    );
  });

  it("accepts atomically without client-controlled scope or role", () => {
    const acceptance = invitationMigration.match(
      /create function public\.accept_organization_invitation[\s\S]*?\$\$;/,
    )?.[0];
    expect(acceptance).toMatch(/\(p_token text\)/);
    expect(acceptance).toMatch(/for update/);
    expect(acceptance).toMatch(/insert into public\.memberships/);
    expect(acceptance).toMatch(/v_invitation\.role/);
    expect(acceptance).not.toMatch(/p_role|p_organization_id/);
  });

  it("keeps secrets out of lists and direct browser queries", () => {
    const listing = invitationMigration.match(
      /create function public\.list_organization_invitations[\s\S]*?\$\$;/,
    )?.[0];
    expect(listing).not.toMatch(/token_hash/);
    expect(invitationMigration).toMatch(
      /revoke all on table public\.organization_invitations/,
    );
    expect(invitationMigration).not.toMatch(
      /grant select on table public\.organization_invitations/,
    );
  });

  it("protects managers, owners and administrators", () => {
    expect(invitationMigration).toMatch(
      /Organization management permission required/,
    );
    expect(invitationMigration).toMatch(/OWNER roles cannot be changed here/);
    expect(invitationMigration).toMatch(/ADMIN cannot manage ADMIN/);
    expect(invitationMigration).toMatch(/OWNER cannot be removed/);
  });

  it("uses empty search paths and minimal grants", () => {
    expect(
      invitationMigration.match(/security definer/g)?.length,
    ).toBeGreaterThanOrEqual(9);
    expect(
      invitationMigration.match(/set search_path = ''/g)?.length,
    ).toBeGreaterThanOrEqual(9);
    expect(invitationMigration).toMatch(
      /grant execute on function public\.preview_organization_invitation\(text\) to anon, authenticated/,
    );
  });
});
