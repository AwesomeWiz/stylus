import { getWorkspaceContext } from "@/modules/onboarding/server/workspace";
import { ArrowRight, Building2, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { ThemeSelector } from "@/components/appearance/theme-selector";
import { DeleteOrganizationPanel } from "@/components/organizations/delete-organization-panel";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsNavigation } from "@/components/layout/settings-navigation";
import { serverEnv } from "@/lib/env/server";

export default async function SettingsPage() {
  const context = await getWorkspaceContext();

  return (
    <>
      <PageHeader
        description="Manage your personal appearance and organization controls."
        title="Settings"
      />
      <SettingsNavigation />
      <div className="mt-8 max-w-4xl space-y-10">
        <section className="border-pastel-lilac-border bg-pastel-lilac rounded-xl border p-5 sm:p-6">
          <ThemeSelector />
        </section>
        <section aria-labelledby="account-heading" className="border-b pb-8">
          <h2
            className="flex items-center gap-2 font-semibold"
            id="account-heading"
          >
            <UserRound aria-hidden="true" className="size-4" /> Account
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs uppercase">Name</dt>
              <dd className="mt-1 text-sm font-medium">
                {context.user.displayName}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase">Email</dt>
              <dd className="mt-1 text-sm font-medium">{context.user.email}</dd>
            </div>
          </dl>
        </section>
        <section
          aria-labelledby="organization-heading"
          className="border-pastel-mint-border bg-pastel-mint rounded-xl border p-5 sm:p-6"
        >
          <h2
            className="flex items-center gap-2 font-semibold"
            id="organization-heading"
          >
            <Building2 aria-hidden="true" className="size-4" /> Organization
          </h2>
          <p className="mt-3 text-sm font-medium">
            {context.organization.name}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Your role is {context.membership.role.toLowerCase()}.
          </p>
          <Link
            className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-medium hover:underline"
            href="/company/profile"
          >
            Open company profile{" "}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>
        <section aria-labelledby="team-heading" className="border-b pb-8">
          <h2
            className="flex items-center gap-2 font-semibold"
            id="team-heading"
          >
            <Users aria-hidden="true" className="size-4" /> Team access
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Review members, roles, invitations, and account activity.
          </p>
          <Link
            className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-medium hover:underline"
            href="/team"
          >
            Manage team <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>
        <section aria-labelledby="source-heading" className="border-b pb-8">
          <h2 className="font-semibold" id="source-heading">
            Open source
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Stylus is licensed under AGPL-3.0-only.
          </p>
          <a
            className="text-primary mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium underline"
            href={
              serverEnv.STYLUS_SOURCE_URL ??
              "https://github.com/AwesomeWiz/stylus"
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            View source code{" "}
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        </section>
        {context.membership.role === "OWNER" ? (
          <DeleteOrganizationPanel
            organizationName={context.organization.name}
          />
        ) : null}
      </div>
    </>
  );
}

export const metadata = { title: "Settings" };
