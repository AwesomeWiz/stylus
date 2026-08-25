import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { HomePlaceholder } from "@/components/home/home-placeholder";
import { logoutAction } from "@/modules/auth/actions";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

export default async function HomePage() {
  const context = await getCurrentOrganizationContext();

  if (!context) {
    redirect("/organization/new");
  }

  return (
    <AppShell
      identity={{
        displayName: context.user.displayName,
        email: context.user.email,
      }}
      logoutAction={logoutAction}
      organization={{
        name: context.organization.name,
        role: context.membership.role,
      }}
    >
      <HomePlaceholder />
    </AppShell>
  );
}
