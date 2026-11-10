import Link from "next/link";
import Form from "next/form";
import type { Route } from "next";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";
import { entitySearchPattern } from "@/core/entities/public";
import { canMutateMarketing } from "@/modules/marketing/authorization";
import { findGrowthChoices } from "@/modules/marketing/server/growth-data";

export async function GrowthResearchIndex({
  section,
  params,
}: {
  section: "evidence" | "opportunities";
  params: Record<string, string | undefined>;
}) {
  const { context } = await requireEnabledPlugin("marketing"),
    db = await createServerSupabaseClient(),
    org = context.organization.id,
    canEdit = canMutateMarketing(context.membership.role),
    query = (params.query ?? "").trim().slice(0, 100);
  if (section === "opportunities") {
    const page = await findGrowthChoices({
      kind: "opportunity",
      query,
      ...(params.after ? { cursor: params.after } : {}),
    });
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Content Opportunity candidates
        </h2>
        <p className="text-muted-foreground text-sm">
          Interpretations in exact immutable research reports. A candidate is
          context for a testable belief, not an accepted conclusion.
        </p>
        <Search section={section} query={query} />
        <ul className="divide-y border-y">
          {page.items.map((item) => (
            <li key={item.id} className="space-y-2 py-4">
              <h3 className="font-medium">{item.title}</h3>
              <Link
                className="text-primary inline-block min-h-11 py-2 text-sm underline"
                href={item.href as Route}
              >
                Inspect exact report and citations
              </Link>
              {canEdit && item.source?.kind === "opportunity" ? (
                <Link
                  className="text-primary ml-4 inline-block min-h-11 py-2 text-sm underline"
                  href={`/apps/marketing/hypotheses?create=1&source=opportunity&sourceId=${item.source.id}&index=${item.source.index}`}
                >
                  Create Hypothesis
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
        {!page.items.length ? (
          <p className="text-muted-foreground text-sm">
            No matching candidates on this page of reports.
            {page.hasMore
              ? " Continue to the next page."
              : " Inspect or run permitted research first."}
          </p>
        ) : null}
        {page.hasMore ? (
          <Link
            className="inline-block min-h-11 py-2 text-sm underline"
            href={`/apps/marketing/research?section=opportunities&query=${encodeURIComponent(query)}&after=${page.cursor}`}
          >
            Next reports
          </Link>
        ) : null}
      </section>
    );
  }
  let request = db
    .from("marketing_external_research_evidence")
    .select(
      "id,title,run_id,evidence_id,evidence_type,source_id,canonical_url,published_at,fetched_at,created_at",
    )
    .eq("organization_id", org)
    .order("id")
    .limit(26);
  if (query)
    request = /^EVID-[1-9][0-9]*$/i.test(query)
      ? request.eq("evidence_id", query.toUpperCase())
      : request.ilike("title", entitySearchPattern(query));
  if (z.uuid().safeParse(params.after).success)
    request = request.gt("id", params.after!);
  const result = await request;
  if (result.error) throw Error("Research Evidence could not load.");
  const rows = (result.data ?? []).slice(0, 25);
  const selected = z.uuid().safeParse(params.evidence).success
    ? await db
        .from("marketing_external_research_evidence")
        .select("*")
        .eq("organization_id", org)
        .eq("id", params.evidence!)
        .maybeSingle()
    : null;
  if (selected?.error) throw Error("Selected Evidence could not load.");
  const exact = selected?.data;
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Research Evidence</h2>
      <p className="text-muted-foreground text-sm">
        Exact source records, distinct from report interpretations and manual
        notes.
      </p>
      <Search section={section} query={query} />
      {params.evidence ? (
        <section
          id={exact ? `${exact.run_id}-${exact.evidence_id}` : undefined}
          className="space-y-3 rounded-md border p-4"
        >
          {exact ? (
            <>
              <h3 className="font-semibold">
                {exact.title ?? exact.evidence_id}
              </h3>
              <p className="text-muted-foreground text-sm">
                {exact.evidence_id} · {exact.evidence_type} · Source{" "}
                {exact.source_id}
              </p>
              <p className="max-w-[72ch] text-sm leading-7 whitespace-pre-wrap">
                {exact.excerpt}
              </p>
              <p className="text-muted-foreground text-xs">
                Retrieved {exact.fetched_at ?? exact.created_at}
                {exact.published_at
                  ? " · Published " + exact.published_at
                  : " · Publication time unavailable"}
              </p>
              {exact.canonical_url &&
              /^https?:\/\//i.test(exact.canonical_url) ? (
                <a
                  className="text-primary inline-block min-h-11 py-2 text-sm underline"
                  href={exact.canonical_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open recorded source
                </a>
              ) : null}
              <Link
                className="text-primary ml-4 inline-block min-h-11 py-2 text-sm underline"
                href={`/apps/marketing/research?section=reports&run=${exact.run_id}`}
              >
                Exact research run
              </Link>
              {canEdit ? (
                <Link
                  className="text-primary ml-4 inline-block min-h-11 py-2 text-sm underline"
                  href={`/apps/marketing/hypotheses?create=1&source=evidence&sourceId=${exact.id}`}
                >
                  Create Hypothesis from Evidence
                </Link>
              ) : null}
              <p className="text-muted-foreground text-xs">
                This evidence can explain why a belief is worth testing. It is
                not proof.
              </p>
            </>
          ) : (
            <p>This Evidence is unavailable in the current organization.</p>
          )}
        </section>
      ) : null}
      <ul className="divide-y border-y">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              className="hover:bg-muted block py-3"
              href={`/apps/marketing/research?section=evidence&evidence=${row.id}&run=${row.run_id}#${row.run_id}-${row.evidence_id}`}
            >
              <p className="font-medium break-words">
                {row.title ?? row.evidence_id}
              </p>
              <p className="text-muted-foreground text-xs">
                {row.evidence_id} · {row.evidence_type} · Retrieved{" "}
                {row.fetched_at ?? row.created_at}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {!rows.length ? (
        <p className="text-muted-foreground text-sm">
          No matching Evidence. Manual Research Notes remain available
          separately.
        </p>
      ) : null}
      {(result.data?.length ?? 0) > 25 ? (
        <Link
          className="inline-block min-h-11 py-2 text-sm underline"
          href={`/apps/marketing/research?section=evidence&query=${encodeURIComponent(query)}&after=${rows.at(-1)!.id}`}
        >
          Next 25 Evidence records
        </Link>
      ) : null}
    </section>
  );
}
function Search({ section, query }: { section: string; query: string }) {
  return (
    <Form
      className="flex flex-wrap items-end gap-3"
      action="/apps/marketing/research"
      role="search"
    >
      <input type="hidden" name="section" value={section} />
      <label className="w-full min-w-0 flex-auto text-sm sm:w-auto sm:flex-1">
        Search
        <input
          type="search"
          name="query"
          defaultValue={query}
          maxLength={100}
          className="bg-background mt-1 min-h-11 w-full rounded-md border px-3"
        />
      </label>
      <button className="min-h-11 rounded-md border px-3 text-sm" type="submit">
        Search records
      </button>
    </Form>
  );
}
