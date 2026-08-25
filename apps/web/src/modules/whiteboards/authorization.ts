import type { OrganizationRole } from "@/lib/supabase/database.types";

export class WhiteboardMutationDeniedError extends Error {
  constructor() {
    super("Whiteboard mutation permission required");
    this.name = "WhiteboardMutationDeniedError";
  }
}

export function canMutateWhiteboards(role: OrganizationRole) {
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER";
}

export function assertCanMutateWhiteboards(role: OrganizationRole) {
  if (!canMutateWhiteboards(role)) throw new WhiteboardMutationDeniedError();
}
