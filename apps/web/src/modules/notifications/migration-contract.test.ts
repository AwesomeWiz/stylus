import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825000500_reminders_notifications_activity.sql",
  ),
  "utf8",
).toLowerCase();
const processorFixMigration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825000510_fix_reminder_processor.sql",
  ),
  "utf8",
).toLowerCase();

describe("reminders, notifications and activity migration", () => {
  it("defines focused organization-scoped records with deadline-version deduplication", () => {
    expect(migration).toContain("create table public.notifications");
    expect(migration).toContain("create table public.activity_events");
    expect(migration).toContain("create table public.task_reminder_deliveries");
    expect(migration).toContain(
      "unique (task_id, recipient_id, reminder_kind, deadline_at, channel)",
    );
    expect(migration).toContain("notifications_recipient_membership_fkey");
    expect(migration).toContain("notification_channel as enum ('in_app')");
    expect(migration).toContain("activity_events_actor_membership_fkey");
  });

  it("uses current task state and database timestamps in an idempotent processor", () => {
    expect(migration).toContain("process_task_reminders");
    expect(migration).toContain("task.status in ('todo', 'in_progress')");
    expect(migration).toContain("task.assignee_id is not null");
    expect(migration).toContain("task.due_at <= p_now + interval '24 hours'");
    expect(migration).toContain("on conflict (");
    expect(migration).toContain("candidate.due_at,");
    expect(migration).toContain("created_at\n      ) values");
    expect(migration).not.toContain("setinterval");
  });

  it("keeps trusted writes unavailable to browser roles", () => {
    expect(migration).toContain(
      "revoke all on table public.notifications from anon, authenticated",
    );
    expect(migration).toContain(
      "revoke all on table public.activity_events from anon, authenticated",
    );
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).not.toContain(
      "grant insert on table public.activity_events to authenticated",
    );
  });

  it("isolates notification recipients and organization activity with RLS", () => {
    expect(migration).toContain("notifications_select_for_recipient");
    expect(migration).toContain("recipient_id = (select auth.uid())");
    expect(migration).toContain("activity_events_select_for_members");
    expect(migration).toContain("private.is_organization_member");
    expect(migration).toContain("mark_all_notifications_read");
    expect(migration).toContain("and recipient_id = (select auth.uid())");
  });

  it("records meaningful task transitions without duplicating unchanged completion", () => {
    expect(migration).toContain("new.status is distinct from old.status");
    expect(migration).toContain(
      "new.assignee_id is distinct from old.assignee_id",
    );
    expect(migration).toContain("'task_completed'");
    expect(migration).toContain("'task_reopened'");
    expect(migration).toContain("'task_cancelled'");
    expect(migration).toContain("'task_commented'");
  });
});

describe("reminder processor corrective migration", () => {
  it("replaces the applied function without ambiguous local variable names", () => {
    expect(processorFixMigration).toContain(
      "create or replace function public.process_task_reminders",
    );
    expect(processorFixMigration).toContain(
      "v_reminder_kind public.task_reminder_kind",
    );
    expect(processorFixMigration).toContain("v_reminder_kind,");
    expect(processorFixMigration).not.toContain(
      "\n  reminder_kind public.task_reminder_kind",
    );
    expect(processorFixMigration).toContain(
      "returning reminder_delivery.id into v_delivery_id",
    );
  });

  it("preserves trusted execution and current-state eligibility checks", () => {
    expect(processorFixMigration).toContain("security definer");
    expect(processorFixMigration).toContain("set search_path = ''");
    expect(processorFixMigration).toContain("from public, anon, authenticated");
    expect(processorFixMigration).toContain("to service_role");
    expect(processorFixMigration).toContain(
      "task.status in ('todo', 'in_progress')",
    );
    expect(processorFixMigration).toContain(
      "membership.user_id = task.assignee_id",
    );
    expect(processorFixMigration).toContain(
      "on conflict (task_id, recipient_id, reminder_kind, deadline_at, channel)",
    );
  });
});
