"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import type { TaskStatus } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

import { assertCanMutateTasks } from "./authorization";
import {
  createTaskSchema,
  taskCommentSchema,
  taskIdSchema,
  type TaskActionState,
  updateTaskSchema,
} from "./schemas";
import { validateTaskAssignee } from "./server/data";

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

function nullable(valueToNormalize: string) {
  const trimmed = valueToNormalize.trim();
  return trimmed || null;
}

function fields(formData: FormData) {
  return {
    assigneeId: value(formData, "assigneeId"),
    description: value(formData, "description"),
    dueAt: value(formData, "dueAt"),
    priority: value(formData, "priority"),
    scheduledAt: value(formData, "scheduledAt"),
    title: value(formData, "title"),
  };
}

function errorState(error: unknown): TaskActionState {
  if (error && typeof error === "object" && "flatten" in error) {
    const flattened = (
      error as { flatten(): { fieldErrors: Record<string, string[]> } }
    ).flatten();
    return { fieldErrors: flattened.fieldErrors, status: "error" };
  }
  if (error instanceof Error && error.message.includes("assignee")) {
    return { message: error.message, status: "error" };
  }
  return {
    message: "The task could not be saved. Please try again.",
    status: "error",
  };
}

async function mutationContext() {
  const current = await getCurrentOrganizationContext();
  if (!current) redirect("/organization/new");
  assertCanMutateTasks(current.membership.role);
  return current;
}

export async function createTaskAction(
  _previousState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  try {
    const parsed = createTaskSchema.parse(fields(formData));
    const current = await mutationContext();
    await validateTaskAssignee(current.organization.id, parsed.assigneeId);
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("tasks").insert({
      assignee_id: parsed.assigneeId,
      created_by: current.user.id,
      description: nullable(parsed.description),
      due_at: parsed.dueAt,
      organization_id: current.organization.id,
      priority: parsed.priority,
      scheduled_at: parsed.scheduledAt,
      title: parsed.title,
      updated_by: current.user.id,
    });
    if (error) throw error;
  } catch (error) {
    unstable_rethrow(error);
    return errorState(error);
  }

  revalidatePath("/tasks");
  return { status: "success" };
}

export async function updateTaskAction(
  _previousState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  try {
    const parsed = updateTaskSchema.parse({
      ...fields(formData),
      status: value(formData, "status"),
      taskId: value(formData, "taskId"),
    });
    const current = await mutationContext();
    await validateTaskAssignee(current.organization.id, parsed.assigneeId);
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("tasks")
      .update({
        assignee_id: parsed.assigneeId,
        description: nullable(parsed.description),
        due_at: parsed.dueAt,
        priority: parsed.priority,
        scheduled_at: parsed.scheduledAt,
        status: parsed.status,
        title: parsed.title,
        updated_by: current.user.id,
      })
      .eq("id", parsed.taskId)
      .eq("organization_id", current.organization.id)
      .select("id")
      .maybeSingle();
    if (error || !data) throw error ?? new Error("Task not found.");
  } catch (error) {
    unstable_rethrow(error);
    return errorState(error);
  }

  revalidatePath("/tasks");
  return { status: "success" };
}

export async function setTaskCompletionAction(
  _previousState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  try {
    const taskId = taskIdSchema.parse(value(formData, "taskId"));
    const completed = value(formData, "completed") === "true";
    const current = await mutationContext();
    const supabase = await createServerSupabaseClient();
    const status: TaskStatus = completed ? "COMPLETED" : "TODO";
    const { data, error } = await supabase
      .from("tasks")
      .update({ status, updated_by: current.user.id })
      .eq("id", taskId)
      .eq("organization_id", current.organization.id)
      .select("id")
      .maybeSingle();
    if (error || !data) throw error ?? new Error("Task not found.");
  } catch (error) {
    unstable_rethrow(error);
    return errorState(error);
  }

  revalidatePath("/tasks");
  return { status: "success" };
}

export async function addTaskCommentAction(
  _previousState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  try {
    const parsed = taskCommentSchema.parse({
      body: value(formData, "body"),
      taskId: value(formData, "taskId"),
    });
    const current = await mutationContext();
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("task_comments").insert({
      body: parsed.body,
      created_by: current.user.id,
      organization_id: current.organization.id,
      task_id: parsed.taskId,
    });
    if (error) throw error;
  } catch (error) {
    unstable_rethrow(error);
    return errorState(error);
  }

  revalidatePath("/tasks");
  return { status: "success" };
}
