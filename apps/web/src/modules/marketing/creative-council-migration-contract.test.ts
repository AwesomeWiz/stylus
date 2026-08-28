import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825001500_creative_council_v1.sql",
  ),
  "utf8",
).toLowerCase();

describe("TASK-015 migration contract", () => {
  it("creates minimal Marketing-owned run, stage, evidence, and immutable brief version records", () => {
    expect(sql).toContain(
      "create table public.marketing_creative_council_runs",
    );
    expect(sql).toContain(
      "create table public.marketing_creative_council_stages",
    );
    expect(sql).toContain(
      "create table public.marketing_creative_council_evidence",
    );
    expect(sql).toContain("create table public.marketing_reel_brief_versions");
    expect(sql).toContain(
      "unique (organization_id, source_reel_idea_id, version_number)",
    );
    expect(sql).not.toMatch(
      /alter table public\.marketing_reel_ideas\s+(?!enable)/,
    );
    expect(sql).not.toMatch(/alter table public\.marketing_creative_briefs/);
    expect(sql).not.toContain("knowledge_memories");
  });

  it("uses explicit bounded JSON projections without raw prompt or provider fields", () => {
    expect(sql).toContain("pg_column_size(context_snapshot) <= 32768");
    expect(sql).toContain("pg_column_size(projection) <= 8192");
    expect(sql).toContain("pg_column_size(structured_output) <= 32768");
    expect(sql).toContain("jsonb_array_length(p_evidence) > 3");
    expect(sql).not.toMatch(
      /raw_prompt|system_prompt|developer_prompt|provider_response|chain_of_thought|transcript_text|storage_path|signed_url/,
    );
  });

  it("enforces same-organization provenance and legal sequential AI stages", () => {
    expect(sql).toContain("foreign key (organization_id, source_reel_idea_id)");
    expect(sql).toContain("foreign key (organization_id, analysis_id)");
    expect(sql).toContain("foreign key (organization_id, ai_run_id)");
    expect(sql).toContain("run.current_stage = p_stage");
    expect(sql).toContain(
      "ai.capability = 'marketing.creative-council.execute'",
    );
    expect(sql).toContain("ai.plugin_id = 'marketing'");
    expect(sql).toContain("when p_stage = 'critique' then 'reasoning'");
  });

  it("protects accidental duplicates while permitting later immutable versions", () => {
    expect(sql).toContain("marketing_creative_council_one_active_run_idx");
    expect(sql).toContain("where status = 'running'");
    expect(sql).toContain(
      "unique (organization_id, created_by, idempotency_key)",
    );
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("coalesce(max(brief.version_number), 0) + 1");
  });

  it("keeps transitions service-only and authenticated access read-only behind Marketing RLS", () => {
    for (const table of [
      "marketing_creative_council_runs",
      "marketing_creative_council_evidence",
      "marketing_creative_council_stages",
      "marketing_reel_brief_versions",
    ]) {
      expect(sql).toContain(
        `alter table public.${table} enable row level security`,
      );
    }
    expect(sql).toContain(
      "private.marketing_plugin_available(organization_id)",
    );
    expect(sql).toContain("to service_role");
    expect(sql).not.toMatch(
      /grant (insert|update|delete)[^;]*to authenticated/,
    );
    expect(sql).toContain("set search_path = ''");
  });

  it("persists partial stage history and creates a brief only in the all-success completion RPC", () => {
    expect(sql).toContain(
      "insert into public.marketing_creative_council_stages",
    );
    expect(sql).toContain(
      "create function public.fail_marketing_creative_council_run",
    );
    const completion = sql.slice(
      sql.indexOf(
        "create function public.complete_marketing_creative_council_run",
      ),
      sql.indexOf("create function public.fail_marketing_creative_council_run"),
    );
    expect(completion).toContain(
      "insert into public.marketing_reel_brief_versions",
    );
    expect(sql.slice(0, sql.indexOf(completion))).not.toContain(
      "insert into public.marketing_reel_brief_versions",
    );
  });
});
