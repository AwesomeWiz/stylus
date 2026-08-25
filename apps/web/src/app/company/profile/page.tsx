import { redirect } from "next/navigation";
import type { Route } from "next";

import { OnboardingReview } from "@/components/onboarding/review";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { logoutAction } from "@/modules/auth/actions";
import { canManageOrganization } from "@/modules/organizations/authorization";
import { getCurrentOnboardingData } from "@/modules/onboarding/server/data";
import { getOnboardingPath } from "@/modules/onboarding/steps";
import { getNotificationSummary } from "@/modules/notifications/server/data";

export default async function CompanyProfilePage() {
  const data = await getCurrentOnboardingData();
  if (!data) redirect("/organization/new");
  if (!data.progress?.completed_at)
    redirect(getOnboardingPath(data.progress?.current_step ?? 1) as Route);

  const notifications = await getNotificationSummary(
    data.context.organization.id,
    data.context.user.id,
  );

  return (
    <AppShell
      activePath="/company/profile"
      identity={{
        displayName: data.context.user.displayName,
        email: data.context.user.email,
      }}
      logoutAction={logoutAction}
      notifications={notifications}
      organization={{
        name: data.context.organization.name,
        role: data.context.membership.role,
      }}
    >
      <PageHeader
        description="Authoritative company context used across Stylus. Owners and administrators can keep it current."
        title="Company profile"
      />
      <div className="mt-8 max-w-3xl">
        <OnboardingReview
          canEdit={canManageOrganization(data.context.membership.role)}
          data={data}
        />
      </div>
    </AppShell>
  );
}
