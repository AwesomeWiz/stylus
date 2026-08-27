import type { OrganizationRole } from "@/lib/supabase/database.types";

export function canMutateMarketing(role: OrganizationRole) {
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER";
}

export function assertCanMutateMarketing(role: OrganizationRole) {
  if (!canMutateMarketing(role))
    throw new Error("Marketing write permission required.");
}
