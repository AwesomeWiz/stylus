import "server-only";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canMutateTasks } from "@/modules/tasks/authorization";
export async function executionContext(edit = false) {
  const context = await getCurrentOrganizationContext();
  if (!context || (edit && !canMutateTasks(context.membership.role)))
    throw { code: "42501" };
  return {
    context,
    org: context.organization.id,
    db: await createServerSupabaseClient(),
  };
}
export function checked<T>(result: {
  data: T | null;
  error: unknown;
}): NonNullable<T> {
  if (result.error) throw result.error;
  if (result.data === null) throw Error("Work unavailable");
  return result.data as NonNullable<T>;
}
