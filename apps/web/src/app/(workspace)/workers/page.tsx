import { redirect } from "next/navigation";
import { WorkersWorkspace } from "@/components/workers/workers-workspace";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getOrganizationWorkers } from "@/modules/workers/server/data";

export default async function WorkersPage() {
  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/organization/new");
  const workers = await getOrganizationWorkers(context.organization.id);
  return <WorkersWorkspace role={context.membership.role} workers={workers} />;
}
