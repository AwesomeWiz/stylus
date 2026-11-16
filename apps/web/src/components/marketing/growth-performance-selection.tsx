import Link from "next/link";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";
import { deriveObservationHorizon } from "@/modules/marketing/performance-learning";

/** Exact historical observations; never changes deterministic derivation inputs. */
export async function GrowthPerformanceSelection({
  snapshotId,
  learningId,
}: {
  snapshotId?: string;
  learningId?: string;
}) {
  const { context } = await requireEnabledPlugin("marketing"),
    db = await createServerSupabaseClient(),
    org = context.organization.id;
  if (z.uuid().safeParse(snapshotId).success) {
    const result = await db
      .from("marketing_performance_snapshots")
      .select("*")
      .eq("organization_id", org)
      .eq("id", snapshotId!)
      .maybeSingle();
    if (result.error) throw Error("Selected snapshot could not load.");
    const row = result.data;
    if (!row) return <p>Selected observation is unavailable.</p>;
    const content = await db
      .from("marketing_published_content")
      .select(
        "id,internal_label,published_at,source_reel_brief_version_id,platform",
      )
      .eq("organization_id", org)
      .eq("id", row.published_content_id)
      .maybeSingle();
    if (content.error) throw Error("Observation source could not load.");
    const horizon = content.data
      ? deriveObservationHorizon(content.data.published_at, row.observed_at)
      : null;
    return (
      <section
        id={`snapshot-${row.id}`}
        className="mb-8 space-y-3 rounded-md border p-4"
      >
        <h2 className="font-semibold">Exact Performance Snapshot</h2>
        <p className="text-sm">
          {content.data?.internal_label ?? "Publication unavailable"} ·{" "}
          {content.data?.platform ?? ""}
        </p>
        <p className="text-muted-foreground text-xs">
          Observed {row.observed_at} ·{" "}
          {horizon ?? "Observation horizon unavailable"} · {row.source_type}
        </p>
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {[
            ["Views", row.views],
            ["Reach", row.reach],
            ["Saves", row.saves],
            ["Likes", row.likes],
            ["Comments", row.comments],
            ["Shares", row.shares],
            ["Follows", row.follows],
            ["Link clicks", row.link_clicks],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value ?? "Unavailable"}</dd>
            </div>
          ))}
        </dl>
        {row.notes ? (
          <p className="text-sm whitespace-pre-wrap">{row.notes}</p>
        ) : null}
        {content.data?.source_reel_brief_version_id ? (
          <Link
            className="text-primary inline-block min-h-11 py-2 text-sm underline"
            href={`/apps/marketing/creative-studio?brief=${content.data.source_reel_brief_version_id}`}
          >
            Exact source Reel Brief
          </Link>
        ) : null}
        <p className="text-muted-foreground text-xs">
          An immutable observation, not an automatic experiment conclusion.
          Missing metrics remain unavailable; supplied zero remains zero.
        </p>
      </section>
    );
  }
  if (z.uuid().safeParse(learningId).success) {
    const result = await db
      .from("marketing_performance_learnings")
      .select("*")
      .eq("organization_id", org)
      .eq("id", learningId!)
      .maybeSingle();
    if (result.error)
      throw Error("Selected Performance Learning could not load.");
    const row = result.data;
    if (!row) return <p>Selected Performance Learning is unavailable.</p>;
    const evidence = await db
      .from("marketing_performance_learning_evidence")
      .select("snapshot_id,evidence_role,published_content_id")
      .eq("organization_id", org)
      .eq("learning_id", row.id)
      .order("snapshot_id")
      .limit(200);
    if (evidence.error) throw Error("Performance provenance could not load.");
    return (
      <section
        id={`learning-${row.id}`}
        className="mb-8 space-y-3 rounded-md border p-4"
      >
        <h2 className="font-semibold">
          Exact deterministic Performance Learning
        </h2>
        <p className="text-sm">{row.summary}</p>
        <p className="text-muted-foreground text-xs">
          {row.observation_horizon} · {row.evidence_strength} evidence strength
          · {row.sample_count} segment / {row.baseline_sample_count} baseline
          items · {row.algorithm_version}
        </p>
        <ul className="text-muted-foreground list-disc pl-5 text-sm">
          {row.caveats.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
        <ul>
          {evidence.data?.map((e, i) => (
            <li key={e.snapshot_id + i}>
              <Link
                className="text-primary inline-block min-h-11 py-2 text-sm underline"
                href={`/apps/marketing/performance?snapshot=${e.snapshot_id}#snapshot-${e.snapshot_id}`}
              >
                {e.evidence_role} observation · {e.snapshot_id}
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs">
          This algorithm artifact remains separate from a team-accepted
          experiment Learning.
        </p>
      </section>
    );
  }
  return null;
}
