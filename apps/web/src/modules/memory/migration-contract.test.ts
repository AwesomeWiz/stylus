import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825001000_company_knowledge_memory.sql",
  ),
  "utf8",
).toLowerCase();
const lifecycleMigration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825001010_company_memory_lifecycle.sql",
  ),
  "utf8",
).toLowerCase();
const combinedMigrations = `${migration}\n${lifecycleMigration}`;

describe("Company Knowledge and Memory migration", () => {
  it("creates provenance-aware organization/domain memory without duplicating profiles", () => {
    expect(migration).toContain("create table public.knowledge_memories");
    expect(migration).toContain("organization_id uuid not null");
    expect(migration).toContain("domain public.memory_domain not null");
    expect(migration).toContain("provenance public.memory_provenance not null");
    expect(migration).toContain("knowledge_memories_provenance_valid");
    expect(migration).not.toContain("create table public.company_knowledge");
  });

  it("uses bounded indexed retrieval and soft archival", () => {
    expect(lifecycleMigration).toContain(
      "least(greatest(coalesce(p_limit, 25), 1), 50)",
    );
    expect(lifecycleMigration).toContain(
      "order by memory.updated_at desc, memory.id desc",
    );
    expect(migration).toContain("knowledge_memories_search_idx");
    expect(migration).toContain("archived_at");
    expect(combinedMigrations).not.toContain(
      "delete from public.knowledge_memories",
    );
  });

  it("denies direct mutation and derives human provenance through narrow RPCs", () => {
    expect(migration).toContain(
      "revoke all on table public.knowledge_memories",
    );
    expect(migration).toContain("grant select (");
    expect(migration).not.toContain(
      "grant insert on table public.knowledge_memories",
    );
    expect(lifecycleMigration).toContain("private.assert_memory_collaborator");
    expect(lifecycleMigration).toContain("p_organization_id, 'company'");
    expect(lifecycleMigration).toContain("'human'");
    expect(lifecycleMigration).toContain("security definer");
    expect(lifecycleMigration).toContain("set search_path = ''");
  });

  it("keeps generic member reads in the company domain", () => {
    expect(migration).toContain(
      "knowledge_memories_company_select_for_members",
    );
    expect(migration).toContain("domain = 'company'");
    expect(migration).toContain("private.is_organization_member");
  });
});
