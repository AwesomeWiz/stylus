"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

import { notificationDestination } from "./routing";

const notificationIdSchema = z.uuid();

export async function markNotificationReadAction(formData: FormData) {
  const notificationId = notificationIdSchema.parse(
    String(formData.get("notificationId") ?? ""),
  );
  const current = await getCurrentOrganizationContext();
  if (!current) redirect("/organization/new");

  const supabase = await createServerSupabaseClient();
  const { data: notification, error } = await supabase
    .from("notifications")
    .select("entity_id, entity_type")
    .eq("id", notificationId)
    .eq("organization_id", current.organization.id)
    .eq("recipient_id", current.user.id)
    .maybeSingle();
  if (error || !notification) return;

  const { data: marked, error: markError } = await supabase.rpc(
    "mark_notification_read",
    {
      p_notification_id: notificationId,
      p_organization_id: current.organization.id,
    },
  );
  if (markError || !marked) return;

  const destination = notificationDestination(notification);
  revalidatePath("/", "layout");
  if (destination) redirect(destination as Route);
}

export async function markAllNotificationsReadAction() {
  const current = await getCurrentOrganizationContext();
  if (!current) redirect("/organization/new");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("mark_all_notifications_read", {
    p_organization_id: current.organization.id,
  });
  if (!error) revalidatePath("/", "layout");
}
