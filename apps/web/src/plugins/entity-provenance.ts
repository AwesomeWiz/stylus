import "server-only";
import { z } from "zod";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getEnabledOrganizationPluginIds } from "@/modules/plugins/server/data";
import {
  entityProjectionSchema,
  type EntityContext,
  type EntityProvenanceLink,
} from "@/core/entities/public";
import { boardEntityRegistry } from "./board-entities";
import { marketingExecutionProvenance } from "@/modules/marketing/server/growth-provenance";
const inputSchema = z
  .object({
    entityType: z.enum([
      "core.task",
      "marketing.campaign",
      "marketing.reel-idea",
      "marketing.creative-brief",
    ]),
    entityId: z.uuid(),
  })
  .strict();
/** Stable host boundary: Core never imports Marketing implementation. */
export async function readEntityProvenance(
  input: unknown,
): Promise<EntityProvenanceLink[]> {
  const value = inputSchema.parse(input),
    current = await getCurrentOrganizationContext();
  if (!current) return [];
  const enabledPlugins = new Set(
    await getEnabledOrganizationPluginIds(current.organization.id),
  );
  if (!enabledPlugins.has("marketing")) return [];
  const context: EntityContext = {
    organizationId: current.organization.id,
    actorId: current.user.id,
    role: current.membership.role,
    enabledPlugins,
  };
  const resolved = await boardEntityRegistry.resolve(context, [
    {
      organizationId: context.organizationId,
      entityType: value.entityType,
      entityId: value.entityId,
      ...(value.entityType.startsWith("marketing.")
        ? { sourcePlugin: "marketing" }
        : {}),
    },
  ]);
  if (resolved[0]?.status !== "available") return [];
  const links = await marketingExecutionProvenance(
    context,
    value.entityType,
    value.entityId,
  );
  return z
    .array(
      z
        .object({
          title: z.string().min(1).max(200),
          label: z.string().max(40),
          href: entityProjectionSchema.shape.href,
        })
        .strict(),
    )
    .max(41)
    .parse(links);
}
