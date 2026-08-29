import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825001600_creative_council_expansion.sql",
  ),
  "utf8",
).toLowerCase();

describe("TASK-016 migration contract", () => {
  it("adds a distinct immutable strategic-review lifecycle without changing TASK-015", () => {
    expect(sql).toContain(
      "create table public.marketing_strategic_review_runs",
    );
    expect(sql).toContain(
      "create table public.marketing_strategic_review_stages",
    );
    expect(sql).toContain(
      "create table public.marketing_strategic_council_review_versions",
    );
    expect(sql).not.toMatch(
      /alter type public\.marketing_creative_council_stage/,
    );
    expect(sql).not.toMatch(
      /alter table public\.marketing_reel_brief_versions/,
    );
    expect(sql).not.toMatch(/alter table public\.marketing_creative_council_/);
  });

  it("binds every review and version to one exact same-organization Reel Brief", () => {
    expect(sql).toContain(
      "foreign key (organization_id, source_reel_brief_version_id)",
    );
    expect(sql).toContain(
      "references public.marketing_reel_brief_versions(organization_id, id)",
    );
    expect(sql).toContain("strategic review source mismatch");
    expect(sql).toContain("'{reelbrief,sourcereelbriefversionid}'");
    expect(sql).toContain(
      "unique (organization_id, source_reel_brief_version_id, version_number)",
    );
  });

  it("enforces exactly five sequential tier-checked AI stages", () => {
    for (const stage of [
      "'audience'",
      "'brand'",
      "'strategy'",
      "'challenge'",
      "'judge'",
    ])
      expect(sql).toContain(stage);
    expect(sql).toContain("run.current_stage = p_stage");
    expect(sql).toContain("when 'audience' then 'brand'");
    expect(sql).toContain("when 'brand' then 'strategy'");
    expect(sql).toContain("when 'strategy' then 'challenge'");
    expect(sql).toContain("else 'judge'");
    expect(sql).toContain(
      "when p_stage in ('audience', 'brand') then 'balanced'",
    );
    expect(sql).toContain("else 'reasoning'");
    expect(sql).toContain(
      "ai.capability = 'marketing.creative-council.execute'",
    );
  });

  it("creates the final artifact only after Judge and all prior successes", () => {
    const completion = sql.slice(
      sql.indexOf("create function public.complete_marketing_strategic_review"),
      sql.indexOf("create function public.fail_marketing_strategic_review"),
    );
    expect(completion).toContain("run.current_stage = 'judge'");
    expect(completion).toContain("and stage.status = 'succeeded'");
    expect(completion).toContain(") <> 4 then");
    expect(completion).toContain(
      "insert into public.marketing_strategic_council_review_versions",
    );
    expect(sql.slice(0, sql.indexOf(completion))).not.toContain(
      "insert into public.marketing_strategic_council_review_versions",
    );
  });

  it("protects duplicate execution while permitting intentional later versions", () => {
    expect(sql).toContain("marketing_strategic_review_one_active_run_idx");
    expect(sql).toContain("where status = 'running'");
    expect(sql).toContain(
      "unique (organization_id, created_by, idempotency_key)",
    );
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("coalesce(max(review.version_number), 0) + 1");
  });

  it("uses bounded structured data and stores no prompts, raw responses, or memory", () => {
    expect(sql).toContain("pg_column_size(context_snapshot) <= 49152");
    expect(sql).toContain("pg_column_size(structured_output) <= 65536");
    expect(sql).toContain("pg_column_size(structured_review) <= 65536");
    expect(sql).not.toMatch(
      /raw_prompt|system_prompt|provider_response|chain_of_thought|knowledge_memories|transcript_text|storage_path|signed_url/,
    );
  });

  it("keeps lifecycle mutation service-only with pinned search paths and RLS", () => {
    for (const table of [
      "marketing_strategic_review_runs",
      "marketing_strategic_review_stages",
      "marketing_strategic_council_review_versions",
    ]) {
      expect(sql).toContain(
        `alter table public.${table} enable row level security`,
      );
      expect(sql).toContain(
        `create policy ${table.replace("marketing_", "marketing_")}`,
      );
    }
    expect(sql).toContain(
      "private.marketing_plugin_available(organization_id)",
    );
    expect(sql).toContain("private.marketing_creative_council_executable");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("to service_role");
    expect(sql).not.toMatch(
      /grant (insert|update|delete)[^;]*to authenticated/,
    );
  });
});
