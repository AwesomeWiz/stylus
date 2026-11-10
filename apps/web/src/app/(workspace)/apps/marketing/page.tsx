import Link from "next/link";
import type { Route } from "next";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { getGrowthOverview } from "@/modules/marketing/server/growth-data";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";
import { growthLabel } from "@/modules/marketing/growth";

export default async function MarketingOverviewPage() {
  const { context } = await requireEnabledPlugin("marketing"),
    data = await getGrowthOverview();
  const empty = Object.values(data).every((rows) => !rows.length);
  const sections: {
    title: string;
    href: string;
    empty: string;
    rows: { id: string; title: string; detail: string; href: string }[];
  }[] = [
    {
      title: "What are we testing?",
      href: "/apps/marketing/experiments",
      empty:
        "No active experiments. Start with a testable belief and clear criteria.",
      rows: data.experiments.map((r) => ({
        id: r.id,
        title: r.title,
        detail: `${growthLabel(r.status ?? "")}${r.ends_on ? " · Target end " + r.ends_on : ""}`,
        href: `/apps/marketing/experiments?item=${r.id}`,
      })),
    },
    {
      title: "Beliefs waiting for a test",
      href: "/apps/marketing/hypotheses",
      empty: "No hypotheses awaiting a test.",
      rows: data.hypotheses.map((r) => ({
        id: r.id,
        title: r.title,
        detail: growthLabel(r.status ?? ""),
        href: `/apps/marketing/hypotheses?item=${r.id}`,
      })),
    },
    {
      title: "What are we learning?",
      href: "/apps/marketing/learn",
      empty: "Reviewed conclusions appear after an experiment is evaluated.",
      rows: data.learnings.map((r) => ({
        id: r.id,
        title: r.title,
        detail: growthLabel(r.confidence ?? "MEDIUM") + " confidence",
        href: `/apps/marketing/learn?item=${r.id}`,
      })),
    },
    {
      title: "Recent evidence",
      href: "/apps/marketing/research?section=evidence",
      empty: "Add a manual note or inspect permitted research evidence.",
      rows: data.evidence.map((r) => ({
        id: r.id,
        title: r.title ?? r.evidence_id,
        detail: `${r.evidence_id} · ${growthLabel(r.evidence_type)}`,
        href: `/apps/marketing/research?section=evidence&run=${r.run_id}&evidence=${r.id}#${r.run_id}-${r.evidence_id}`,
      })),
    },
    {
      title: "Campaigns to continue",
      href: "/apps/marketing/campaigns",
      empty: "No active or planned campaigns.",
      rows: data.campaigns.map((r) => ({
        id: r.id,
        title: r.name,
        detail:
          growthLabel(r.status) +
          (r.ends_on ? " · Target end " + r.ends_on : ""),
        href: `/apps/marketing/campaigns?item=${r.id}`,
      })),
    },
    {
      title: "Recorded performance",
      href: "/apps/marketing/performance",
      empty: "No observations have been recorded. Missing data is not zero.",
      rows: data.snapshots.map((r) => ({
        id: r.id,
        title: "Performance observation",
        detail: `${r.observed_at.slice(0, 10)} · Views ${r.views ?? "unavailable"} · Reach ${r.reach ?? "unavailable"} · Saves ${r.saves ?? "unavailable"}`,
        href: `/apps/marketing/performance?snapshot=${r.id}#snapshot-${r.id}`,
      })),
    },
  ];
  return (
    <MarketingPage
      activePath="/apps/marketing"
      context={context}
      title="Marketing"
      description="Turn evidence into hypotheses, deliberate tests and durable learning."
    >
      {empty ? (
        <section className="mb-8 space-y-3 border-b pb-6">
          <h2 className="text-lg font-semibold">Start with evidence</h2>
          <ol className="text-muted-foreground space-y-2 text-sm">
            <li>1. Add or collect evidence.</li>
            <li>2. Create a testable hypothesis.</li>
            <li>3. Test it with an experiment.</li>
            <li>4. Record what happened and review what you learned.</li>
          </ol>
          <Link
            className="text-primary inline-block min-h-11 py-2 text-sm font-medium underline"
            href="/apps/marketing/research?section=notes"
          >
            Open Research
          </Link>
        </section>
      ) : null}
      <div className="grid min-w-0 gap-x-8 gap-y-8 lg:grid-cols-2">
        {sections.map((section) => (
          <section key={section.title} className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{section.title}</h2>
              <Link
                className="text-primary inline-flex min-h-11 items-center text-sm underline"
                href={section.href as Route}
              >
                View all
              </Link>
            </div>
            {section.rows.length ? (
              <ul className="divide-y border-y">
                {section.rows.map((row) => (
                  <li key={row.id}>
                    <Link
                      className="hover:bg-muted block py-3"
                      href={row.href as Route}
                    >
                      <p className="text-sm font-medium break-words">
                        {row.title}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs break-words">
                        {row.detail}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground border-t py-3 text-sm">
                {section.empty}
              </p>
            )}
          </section>
        ))}
      </div>
    </MarketingPage>
  );
}
