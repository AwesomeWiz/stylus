"use server";

import { redirect } from "next/navigation";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getNotificationSummary } from "./server/data";

// On-demand shell read. Browser input supplies no recipient or tenant authority.
export async function refreshNotificationSummaryAction() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/organization/new");
  return {
    organizationId: context.organization.id,
    summary: await getNotificationSummary(
      context.organization.id,
      context.user.id,
    ),
  };
}
