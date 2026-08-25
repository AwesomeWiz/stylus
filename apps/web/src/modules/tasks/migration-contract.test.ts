import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825000400_task_management.sql",
  ),
  "utf8",
).toLowerCase();

describe("task management migration", () => {
  it("defines controlled defaults, lifecycle consistency and useful indexes", () => {
    expect(migration).toContain("create type public.task_status");
    expect(migration).toContain("default 'todo'");
    expect(migration).toContain("default 'medium'");
    expect(migration).toContain("tasks_completion_consistency");
    expect(migration).toContain("tasks_organization_status_idx");
    expect(migration).toContain("tasks_organization_assignee_idx");
    expect(migration).toContain("tasks_organization_due_idx");
  });

  it("enforces same-organization assignment and immutable provenance", () => {
    expect(migration).toContain("tasks_assignee_membership_fkey");
    expect(migration).toContain("foreign key (organization_id, assignee_id)");
    expect(migration).toContain("task organization cannot be reassigned");
    expect(migration).toContain("task creator cannot be reassigned");
    expect(migration).toContain("task updater must match authenticated user");
    expect(migration).toContain("grant update (");
    expect(migration).not.toContain("grant select, insert, update");
  });

  it("lets collaborators mutate while VIEWER remains read-only", () => {
    expect(migration).toContain("array['owner', 'admin', 'member']");
    expect(migration).not.toContain(
      "array['owner', 'admin', 'member', 'viewer']",
    );
    expect(migration).toContain("tasks_select_for_members");
    expect(migration).toContain("tasks_insert_for_collaborators");
    expect(migration).toContain("tasks_update_for_collaborators");
    expect(migration).not.toContain("grant delete");
  });

  it("keeps completed history and manages completion timestamps in the database", () => {
    expect(migration).toContain("new.completed_at = now()");
    expect(migration).toContain("new.completed_at = old.completed_at");
    expect(migration).toContain("new.completed_at = null");
    expect(migration).not.toContain("delete from public.tasks");
  });

  it("restricts the teammate directory to authenticated organization members", () => {
    expect(migration).toContain("list_organization_task_members");
    expect(migration).toContain("security definer");
    expect(migration).toContain("private.is_organization_member");
    expect(migration).toContain("from public, anon");
    expect(migration).toContain("to authenticated");
  });
});
