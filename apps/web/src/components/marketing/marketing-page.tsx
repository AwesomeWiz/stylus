import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import type { OrganizationContext } from "@/modules/organizations/server/context";
import { NavigationLink } from "@/components/layout/navigation-link";

const primary = [
  ["Overview", "/apps/marketing"],
  ["Ideas", "/apps/marketing/reel-ideas"],
  ["Studio", "/apps/marketing/creative-studio"],
  ["Research", "/apps/marketing/research"],
  ["Campaigns", "/apps/marketing/campaigns"],
] as const;
const secondary = [
  ["Performance", "/apps/marketing/performance"],
  ["Competitors", "/apps/marketing/competitors"],
  ["Ask Council", "/apps/marketing/council"],
  ["Creative Briefs", "/apps/marketing/creative-briefs"],
] as const;
function parentArea(path: string) {
  if (path.startsWith("/apps/marketing/competitors"))
    return "/apps/marketing/research";
  if (
    ["/apps/marketing/council", "/apps/marketing/creative-briefs"].includes(
      path,
    )
  )
    return "/apps/marketing/creative-studio";
  if (path === "/apps/marketing/performance") return "/apps/marketing";
  return path;
}
export function MarketingPage({
  activePath,
  children,
  description,
  title,
}: {
  activePath: string;
  children: ReactNode;
  context: OrganizationContext;
  description: string;
  title: string;
}) {
  return (
    <>
      <PageHeader description={description} title={title} />
      <nav
        aria-label="Marketing sections"
        className="mb-3 flex gap-1 overflow-x-auto border-b py-3"
      >
        {primary.map(([label, href]) => (
          <NavigationLink
            key={href}
            href={href}
            current={parentArea(activePath) === href}
            className={
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm " +
              (parentArea(activePath) === href
                ? "bg-primary-subtle text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted")
            }
          >
            {label}
          </NavigationLink>
        ))}
      </nav>
      <nav
        aria-label="More Marketing destinations"
        className="mb-6 flex flex-wrap gap-x-5 gap-y-1"
      >
        {secondary.map(([label, href]) => (
          <NavigationLink
            key={href}
            href={href}
            current={activePath === href}
            className="text-muted-foreground hover:text-foreground flex min-h-10 items-center gap-2 text-sm underline-offset-4 hover:underline"
          >
            {label}
          </NavigationLink>
        ))}
      </nav>
      {children}
    </>
  );
}
