import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { attentionItemSchema } from "@/core/attention/public";
export async function getHomeCoreData(organizationId: string, now: Date) {
  const db = await createServerSupabaseClient();
  const [attention, activity, members] = await Promise.all([
    db.rpc("daily_core_attention", {
      p_organization_id: organizationId,
      p_now: now.toISOString(),
    }),
    db
      .from("activity_events")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(6),
    db.rpc("list_organization_task_members", {
      p_organization_id: organizationId,
    }),
  ]);
  if (attention.error || activity.error || members.error)
    throw Error("Daily work could not load.");
  return {
    attention: attentionItemSchema.array().max(18).parse(attention.data),
    activity: activity.data ?? [],
    members: members.data ?? [],
  };
}
