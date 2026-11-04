import "server-only";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  entityReferenceKey,
  entitySearchPattern,
  type EntityContext,
  type EntityProvider,
  type EntityReference,
  type EntityProjection,
} from "@/core/entities/public";
import { createTaskSchema } from "../schemas";
import { recentCompletionThreshold } from "../filters";
import { createTaskRecord } from "./create";
import type { TaskRow } from "@/lib/supabase/database.types";
const columns =
  "id,organization_id,title,status,priority,assignee_id,due_at,completed_at";
type CardTask = Pick<
  TaskRow,
  | "id"
  | "organization_id"
  | "title"
  | "status"
  | "priority"
  | "assignee_id"
  | "due_at"
  | "completed_at"
>;
const reference = (
  organizationId: string,
  entityId: string,
): EntityReference => ({ organizationId, entityId, entityType: "core.task" });
function projection(row: CardTask): EntityProjection {
  const archived =
    row.status === "COMPLETED" &&
    !!row.completed_at &&
    Date.parse(row.completed_at) <
      recentCompletionThreshold(new Date()).getTime();
  return {
    title: row.title,
    archived,
    status: row.status.replaceAll("_", " "),
    href: `/tasks?task=${row.id}&view=${archived ? "archive" : "all"}`,
    details: [
      { label: "Priority", value: row.priority },
      {
        label: "Assignee",
        value: row.assignee_id ?? "Unassigned",
        kind: row.assignee_id ? "member" : "text",
      },
      ...(row.due_at
        ? [{ label: "Due", value: row.due_at, kind: "date" as const }]
        : []),
    ],
  };
}
function parseCreation(input: unknown) {
  const value = input as Record<string, unknown>;
  return createTaskSchema.parse({
    title: value.title,
    description: value.description ?? "",
    assigneeId: value.assigneeId ?? "",
    dueAt: value.dueAt ?? "",
    scheduledAt: value.scheduledAt ?? "",
    priority: value.priority ?? "MEDIUM",
  });
}
export const taskEntityProvider: EntityProvider = {
  metadata: {
    id: "core.task",
    label: "Task",
    icon: "task",
    binding: "live",
    routePrefix: "/tasks",
    creationSelection: "text-selection",
    fields: [
      {
        key: "title",
        label: "Title",
        kind: "text",
        required: true,
        maxLength: 200,
      },
      {
        key: "description",
        label: "Description",
        kind: "textarea",
        maxLength: 5000,
      },
      { key: "assigneeId", label: "Assignee", kind: "assignee" },
      { key: "dueAt", label: "Due", kind: "datetime" },
      {
        key: "priority",
        label: "Priority",
        kind: "select",
        options: ["LOW", "MEDIUM", "HIGH", "URGENT"],
        initial: "MEDIUM",
      },
    ],
  },
  async resolve(context, refs) {
    const db = await createServerSupabaseClient();
    const result = await db
      .from("tasks")
      .select(columns)
      .eq("organization_id", context.organizationId)
      .in(
        "id",
        refs.map((ref) => ref.entityId),
      );
    if (result.error) throw result.error;
    return new Map(
      (result.data ?? []).map((row) => [
        entityReferenceKey(reference(context.organizationId, row.id)),
        projection(row),
      ]),
    );
  },
  async search(context: EntityContext, query, afterId) {
    const db = await createServerSupabaseClient();
    let request = db
      .from("tasks")
      .select(columns)
      .eq("organization_id", context.organizationId)
      .ilike("title", entitySearchPattern(query))
      .order("id")
      .limit(26);
    if (afterId) request = request.gt("id", afterId);
    const result = await request;
    if (result.error) throw result.error;
    return {
      hasMore: (result.data?.length ?? 0) > 25,
      items: (result.data ?? []).slice(0, 25).map((row) => ({
        reference: reference(context.organizationId, row.id),
        status: "available" as const,
        projection: projection(row),
      })),
    };
  },
  parseCreation,
  async create(context, receipt) {
    if (
      receipt.organization_id !== context.organizationId ||
      receipt.created_by !== context.actorId
    )
      throw Error("Creation unavailable");
    const id = await createTaskRecord(parseCreation(receipt.input), receipt.id);
    if (!id) throw Error("Creation could not be confirmed");
    revalidatePath("/tasks");
    return reference(context.organizationId, id);
  },
};
