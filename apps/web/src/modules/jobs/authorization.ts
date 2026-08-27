import type { OrganizationRole } from "@/lib/supabase/database.types";

export class JobAuthorizationError extends Error {
  constructor() {
    super("Job execution permission required");
    this.name = "JobAuthorizationError";
  }
}

export function assertCanEnqueueJob(role: OrganizationRole) {
  if (role === "VIEWER") throw new JobAuthorizationError();
}

export function canRetryJob(role: OrganizationRole) {
  return role === "OWNER" || role === "ADMIN";
}

export function canCancelJob(input: {
  createdBy: string;
  role: OrganizationRole;
  userId: string;
}) {
  return (
    input.role === "OWNER" ||
    input.role === "ADMIN" ||
    (input.role === "MEMBER" && input.createdBy === input.userId)
  );
}
