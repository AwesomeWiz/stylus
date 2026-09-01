import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import type { OrganizationContext } from "@/modules/organizations/server/context";
import { logoutAction } from "@/modules/auth/actions";
import { getNotificationSummary } from "@/modules/notifications/server/data";

const links = [
  ["Overview", "/apps/marketing"],
  ["Competitors", "/apps/marketing/competitors"],
  ["Reel Ideas", "/apps/marketing/reel-ideas"],
  ["Creative Studio", "/apps/marketing/creative-studio"],
  ["Campaigns", "/apps/marketing/campaigns"],
  ["Research", "/apps/marketing/research"],
  ["Performance", "/apps/marketing/performance"],
  ["Creative Briefs", "/apps/marketing/creative-briefs"],
] as const;

export async function MarketingPage({
  activePath,
  children,
  context,
  description,
  title,
}: {
  activePath: string;
  children: ReactNode;
  context: OrganizationContext;
  description: string;
  title: string;
}) {
  const notifications = await getNotificationSummary(
    context.organization.id,
    context.user.id,
  );
  return (
    <AppShell
      activePath={activePath}
      identity={{
        displayName: context.user.displayName,
        email: context.user.email,
      }}
      logoutAction={logoutAction}
      notifications={notifications}
      organization={{
        id: context.organization.id,
        name: context.organization.name,
        role: context.membership.role,
      }}
    >
      <PageHeader description={description} title={title} />
      <nav
        aria-label="Marketing sections"
        className="mb-6 flex gap-1 overflow-x-auto border-b pb-2"
      >
        {links.map(([label, href]) => (
          <Link
            className={`shrink-0 rounded-md px-3 py-2 text-sm ${activePath === href ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}
            href={href as Route}
            key={href}
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </AppShell>
  );
}
