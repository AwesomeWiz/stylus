import type { OrganizationRole } from "@/lib/supabase/database.types";

export class TaskMutationDeniedError extends Error {
  constructor() {
    super("Task mutation permission required");
    this.name = "TaskMutationDeniedError";
  }
}

export function canMutateTasks(role: OrganizationRole) {
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER";
}

export function assertCanMutateTasks(role: OrganizationRole) {
  if (!canMutateTasks(role)) throw new TaskMutationDeniedError();
}
