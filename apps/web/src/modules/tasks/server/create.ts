import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { assertCanMutateTasks } from "../authorization";
import { createTaskSchema } from "../schemas";
import { validateTaskAssignee } from "./data";

/** Shared Task creation domain. Database triggers own notification/activity/lifecycle. */
export async function createTaskRecord(input: unknown, receiptId?: string) {
  const raw = input as Record<string, unknown>;
  const parsed = createTaskSchema.parse({
    ...raw,
    assigneeId: raw.assigneeId ?? "",
    dueAt: raw.dueAt ?? "",
    scheduledAt: raw.scheduledAt ?? "",
  });
  const current = await getCurrentOrganizationContext();
  if (!current) redirect("/organization/new");
  assertCanMutateTasks(current.membership.role);
  const db = await createServerSupabaseClient();
  if (receiptId) {
    const result = await db.rpc("create_task_from_board", {
      p_conversion_id: receiptId,
    });
    if (result.error) throw result.error;
    return result.data;
  }
  await validateTaskAssignee(current.organization.id, parsed.assigneeId);
  const result = await db.from("tasks").insert({
    assignee_id: parsed.assigneeId,
    created_by: current.user.id,
    description: parsed.description.trim() || null,
    due_at: parsed.dueAt,
    organization_id: current.organization.id,
    priority: parsed.priority,
    scheduled_at: parsed.scheduledAt,
    title: parsed.title,
    updated_by: current.user.id,
  });
  if (result.error) throw result.error;
}
