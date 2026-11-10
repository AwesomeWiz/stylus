import "server-only";
import { attentionItemSchema } from "@/core/attention/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { EntityContext } from "@/core/entities/public";
export async function marketingDailyAttention(
  context: EntityContext,
  now: string,
) {
  if (!context.enabledPlugins.has("marketing")) return [];
  const db = await createServerSupabaseClient(),
    result = await db.rpc("marketing_daily_attention", {
      p_organization_id: context.organizationId,
      p_now: now,
    });
  if (result.error) throw Error("Daily Marketing work could not load.");
  return attentionItemSchema.array().max(21).parse(result.data);
}
