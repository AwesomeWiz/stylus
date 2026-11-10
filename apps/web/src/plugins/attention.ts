import "server-only";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getEnabledOrganizationPluginIds } from "@/modules/plugins/server/data";
import { marketingDailyAttention } from "@/modules/marketing/server/daily-attention";
import { attentionItemSchema } from "@/core/attention/public";
/** Trusted application composition; Core imports only this public host. */
export async function workspacePluginAttention(
  organizationId: string,
  now: string,
) {
  const current = await getCurrentOrganizationContext();
  if (!current || current.organization.id !== organizationId)
    throw { code: "42501" };
  const enabledPlugins = new Set(
    await getEnabledOrganizationPluginIds(organizationId),
  );
  if (!enabledPlugins.has("marketing")) return [];
  const rows = await marketingDailyAttention(
    {
      organizationId,
      actorId: current.user.id,
      role: current.membership.role,
      enabledPlugins,
    },
    now,
  );
  return attentionItemSchema.array().max(24).parse(rows);
}
