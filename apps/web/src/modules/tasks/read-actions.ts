"use server";

import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { canMutateTasks } from "./authorization";

const selectionSchema = z.object({
  organizationId: z.uuid(),
  taskId: z.uuid(),
});
const commentSchema = selectionSchema.extend({
  before: z.object({ createdAt: z.iso.datetime(), id: z.uuid() }).optional(),
});

export async function loadTaskDetail(input: unknown) {
  try {
    const parsed = selectionSchema.safeParse(input);
    if (!parsed.success) return { status: "unavailable" } as const;
    const context = await getCurrentOrganizationContext();
    if (!context || context.organization.id !== parsed.data.organizationId)
      return { status: "unavailable" } as const;
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("id", parsed.data.taskId)
      .maybeSingle();
    if (error) return { status: "error" } as const;
    if (!data) return { status: "unavailable" } as const;
    return {
      status: "success",
      task: data,
      canMutate: canMutateTasks(context.membership.role),
    } as const;
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error" } as const;
  }
}

export async function loadTaskComments(input: unknown) {
  try {
    const parsed = commentSchema.safeParse(input);
    if (!parsed.success) return { status: "unavailable" } as const;
    const context = await getCurrentOrganizationContext();
    if (!context || context.organization.id !== parsed.data.organizationId)
      return { status: "unavailable" } as const;
    const supabase = await createServerSupabaseClient();
    // The cached layout never grants access to a fresh data boundary.
    const task = await supabase
      .from("tasks")
      .select("id")
      .eq("organization_id", context.organization.id)
      .eq("id", parsed.data.taskId)
      .maybeSingle();
    if (task.error) return { status: "error" } as const;
    if (!task.data) return { status: "unavailable" } as const;
    let query = supabase
      .from("task_comments")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("task_id", parsed.data.taskId);
    const before = parsed.data.before;
    if (before) {
      // Both cursor fields are strictly validated before PostgREST interpolation.
      query = query.or(
        `created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id})`,
      );
    }
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(51);
    if (error) return { status: "error" } as const;
    const newest = (data ?? []).slice(0, 50);
    const oldest = newest.at(-1);
    return {
      status: "success",
      comments: newest.reverse(),
      before:
        (data?.length ?? 0) > 50 && oldest
          ? { createdAt: oldest.created_at, id: oldest.id }
          : null,
    } as const;
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error" } as const;
  }
}
