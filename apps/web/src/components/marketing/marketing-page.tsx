import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import type { OrganizationContext } from "@/modules/organizations/server/context";
import { NavigationLink } from "@/components/layout/navigation-link";

const primary = [
  ["Overview", "/apps/marketing"],
  ["Research", "/apps/marketing/research"],
  ["Experiments", "/apps/marketing/experiments"],
  ["Create", "/apps/marketing/creative-studio"],
  ["Campaigns", "/apps/marketing/campaigns"],
  ["Learn", "/apps/marketing/learn"],
] as const;
function parentArea(path: string) {
  path = path.split("?")[0]!;
  if (path.startsWith("/apps/marketing/competitors"))
    return "/apps/marketing/research";
  if (
    [
      "/apps/marketing/council",
      "/apps/marketing/creative-briefs",
      "/apps/marketing/reel-ideas",
    ].includes(path)
  )
    return "/apps/marketing/creative-studio";
  if (path === "/apps/marketing/performance") return "/apps/marketing/learn";
  if (path === "/apps/marketing/hypotheses")
    return "/apps/marketing/experiments";
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
  const parent = parentArea(activePath);
  const secondary: readonly (readonly [string, string])[] =
    parent === "/apps/marketing/research"
      ? [
          ["Reports", "/apps/marketing/research?section=reports"],
          ["Evidence", "/apps/marketing/research?section=evidence"],
          ["Notes", "/apps/marketing/research?section=notes"],
          ["Opportunities", "/apps/marketing/research?section=opportunities"],
          ["Competitors", "/apps/marketing/competitors"],
        ]
      : parent === "/apps/marketing/experiments"
        ? [
            ["Experiments", "/apps/marketing/experiments"],
            ["Hypotheses", "/apps/marketing/hypotheses"],
          ]
        : parent === "/apps/marketing/creative-studio"
          ? [
              ["Reel Ideas", "/apps/marketing/reel-ideas"],
              ["Creative Studio", "/apps/marketing/creative-studio"],
              ["Ask Council", "/apps/marketing/council"],
              ["Human Creative Briefs", "/apps/marketing/creative-briefs"],
              [
                "Generated outputs",
                "/apps/marketing/creative-studio#reasoning-history-heading",
              ],
            ]
          : parent === "/apps/marketing/learn"
            ? [
                ["Learnings", "/apps/marketing/learn"],
                [
                  "Experiment outcomes",
                  "/apps/marketing/experiments?status=COMPLETE",
                ],
                ["Performance", "/apps/marketing/performance"],
              ]
            : parent === "/apps/marketing/campaigns"
              ? [
                  ["Performance", "/apps/marketing/performance"],
                  ["Experiments", "/apps/marketing/experiments"],
                ]
              : [];
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
              "flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm " +
              (parentArea(activePath) === href
                ? "bg-primary-subtle text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted")
            }
          >
            {label}
          </NavigationLink>
        ))}
      </nav>
      {secondary.length ? (
        <nav
          aria-label="More Marketing destinations"
          className="mb-6 flex flex-wrap gap-x-5 gap-y-1"
        >
          {secondary.map(([label, href]) => (
            <NavigationLink
              key={href}
              href={href}
              current={
                activePath === href ||
                (href === "/apps/marketing/competitors" &&
                  activePath.startsWith(href + "/"))
              }
              className="text-muted-foreground hover:text-foreground flex min-h-11 items-center gap-2 text-sm underline-offset-4 hover:underline"
            >
              {label}
            </NavigationLink>
          ))}
        </nav>
      ) : null}
      {children}
    </>
  );
}
