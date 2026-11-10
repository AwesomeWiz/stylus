import Link from "next/link";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";

export async function GrowthCreativeSelection({
  briefId,
}: {
  briefId?: string;
}) {
  if (!z.uuid().safeParse(briefId).success) return null;
  const { context } = await requireEnabledPlugin("marketing"),
    db = await createServerSupabaseClient();
  const result = await db
    .from("marketing_reel_brief_versions")
    .select(
      "id,title,primary_hook,spoken_script,caption,call_to_action,source_reel_idea_id,version_number,created_at,council_run_id",
    )
    .eq("organization_id", context.organization.id)
    .eq("id", briefId!)
    .maybeSingle();
  if (result.error) throw Error("Exact Reel Brief could not load.");
  const row = result.data;
  if (!row) return <p>Selected Reel Brief version is unavailable.</p>;
  return (
    <section
      className="mb-8 space-y-4 rounded-md border p-4"
      aria-label="Selected immutable Reel Brief"
    >
      <h2 className="font-semibold">
        {row.title} · version {row.version_number}
      </h2>
      <p className="text-muted-foreground text-xs">
        Exact immutable Reel Brief · Created {row.created_at} · Run{" "}
        {row.council_run_id}
      </p>
      {[
        ["Hook", row.primary_hook],
        ["Spoken script", row.spoken_script],
        ["Call to action", row.call_to_action],
        ["Caption", row.caption],
      ].map(([label, value]) => (
        <section key={label}>
          <h3 className="text-sm font-medium">{label}</h3>
          <p className="max-w-[72ch] text-sm leading-7 whitespace-pre-wrap">
            {value}
          </p>
        </section>
      ))}
      <Link
        className="text-primary inline-block min-h-11 py-2 text-sm underline"
        href={`/apps/marketing/reel-ideas?item=${row.source_reel_idea_id}`}
      >
        Canonical source Reel Idea
      </Link>
      <p className="text-muted-foreground text-xs">
        Viewing this version starts no Create, Review or Council execution.
      </p>
    </section>
  );
}
