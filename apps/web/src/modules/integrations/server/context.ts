import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getEnabledOrganizationPluginIds } from "@/modules/plugins/server/data";
import type {
  IntegrationTarget,
  ConnectionRow,
} from "@/core/integrations/public";
import { IntegrationError } from "./errors";

export async function integrationContext() {
  const context = await getCurrentOrganizationContext();
  if (!context) throw new IntegrationError("denied");
  return {
    org: context.organization.id,
    actor: context.user.id,
    role: context.membership.role,
    db: await createServerSupabaseClient(),
  };
}
export type IntegrationContext = Awaited<ReturnType<typeof integrationContext>>;
export function requireEditor(context: IntegrationContext) {
  if (context.role === "VIEWER") throw new IntegrationError("denied");
}
export function requireManager(context: IntegrationContext) {
  if (context.role !== "OWNER" && context.role !== "ADMIN")
    throw new IntegrationError("denied");
}
export async function authorizeTarget(
  context: IntegrationContext,
  target: IntegrationTarget,
  edit = false,
) {
  if (edit) requireEditor(context);
  if (target.entityType === "core.milestone") {
    const r = await context.db
      .from("milestones")
      .select("id,title,target_date,archived_at")
      .eq("organization_id", context.org)
      .eq("id", target.entityId)
      .maybeSingle();
    if (r.error || !r.data || (edit && r.data.archived_at))
      throw new IntegrationError("denied");
    return {
      title: r.data.title,
      href: `/tasks?view=milestones&milestone=${target.entityId}`,
      date: r.data.target_date,
    };
  }
  const enabledPlugins = new Set(
    await getEnabledOrganizationPluginIds(context.org),
  );
  // Trusted host, existing public entity projection. No plugin-private imports.
  const { getIntegrationEntityRegistry } = await import("@/plugins");
  const registry = await getIntegrationEntityRegistry();
  const result = await registry.resolve(
    {
      organizationId: context.org,
      actorId: context.actor,
      role: context.role,
      enabledPlugins,
    },
    [
      {
        ...target,
        organizationId: context.org,
        ...(target.entityType.startsWith("marketing.")
          ? { sourcePlugin: "marketing" }
          : {}),
      },
    ],
  );
  const row = result[0];
  if (row?.status !== "available" || (edit && row.projection.archived))
    throw new IntegrationError("denied");
  return {
    title: row.projection.title,
    href: row.projection.href,
    date:
      row.projection.details?.find(
        (d) =>
          d.kind === "date" && (d.label === "Due" || d.label === "Target end"),
      )?.value ?? null,
  };
}
export async function readConnection(
  context: IntegrationContext,
  id: string,
  browse = true,
): Promise<ConnectionRow> {
  const service = createServiceSupabaseClient();
  const r = await service
    .from("integration_connections")
    .select("*")
    .eq("organization_id", context.org)
    .eq("id", id)
    .maybeSingle();
  const row = r.data;
  if (
    r.error ||
    !row ||
    row.status !== "connected" ||
    (browse && row.provider !== "github" && row.owner_id !== context.actor)
  )
    throw new IntegrationError("denied");
  const owner = await context.db
    .from("memberships")
    .select("user_id")
    .eq("organization_id", context.org)
    .eq("user_id", row.owner_id ?? row.created_by)
    .is("removed_at", null)
    .maybeSingle();
  if (owner.error || !owner.data) throw new IntegrationError("denied");
  return row;
}
export async function readConnections(
  context: IntegrationContext,
  ids: string[],
) {
  const result = await createServiceSupabaseClient()
    .from("integration_connections")
    .select("*")
    .eq("organization_id", context.org)
    .in("id", ids)
    .eq("status", "connected");
  if (result.error) throw new IntegrationError("unavailable");
  const rows = result.data ?? [];
  if (!rows.length) return new Map<string, ConnectionRow>();
  const owners = await context.db
    .from("memberships")
    .select("user_id")
    .eq("organization_id", context.org)
    .in("user_id", [...new Set(rows.map((r) => r.owner_id ?? r.created_by))])
    .is("removed_at", null);
  if (owners.error) throw new IntegrationError("denied");
  const active = new Set(owners.data?.map((m) => m.user_id));
  return new Map(
    rows
      .filter((r) => active.has(r.owner_id ?? r.created_by))
      .map((r) => [r.id, r]),
  );
}
