import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { OrganizationSetupForm } from "@/components/organizations/organization-setup-form";
import { requireAuthenticatedUser } from "@/modules/auth/server/session";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

export default async function OrganizationSetupPage() {
  await requireAuthenticatedUser();

  if (await getCurrentOrganizationContext()) {
    redirect("/");
  }

  return (
    <AuthShell
      description="This organization is the secure boundary for your team’s data and future workspaces."
      title="Set up your organization"
    >
      <div className="bg-muted mb-5 flex gap-3 rounded-md px-3 py-3 text-sm leading-5">
        <Building2
          aria-hidden="true"
          className="text-primary mt-0.5 size-4 shrink-0"
        />
        <p>
          You will become the organization owner. Team invitations come in a
          later phase.
        </p>
      </div>
      <OrganizationSetupForm />
    </AuthShell>
  );
}
