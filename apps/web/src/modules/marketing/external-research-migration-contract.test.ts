import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825001700_external_research.sql",
  ),
  "utf8",
).toLowerCase();
const enrichmentSql = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825001720_external_research_content_enrichment.sql",
  ),
  "utf8",
).toLowerCase();
const fashionSql = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825001730_fashion_marketing_intelligence.sql",
  ),
  "utf8",
).toLowerCase();
const socialSql = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825001740_fashion_social_intelligence.sql",
  ),
  "utf8",
).toLowerCase();
const webSql = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825001750_fashion_web_consumer_evidence.sql",
  ),
  "utf8",
).toLowerCase();

describe("TASK-017 migration contract", () => {
  it("atomically creates one run and its exact statically registered SERVERLESS job", () => {
    expect(sql).toContain(
      "create function public.enqueue_marketing_external_research",
    );
    expect(sql).toContain("'marketing.external-research.run', 'marketing'");
    expect(sql).toContain(
      "'marketing.external-research.execute', 'serverless'",
    );
    expect(sql).toContain("marketing_external_research_one_active_org_idx");
    expect(sql).toContain("interval '1 hour') >= 5");
  });

  it("keeps enqueue and lifecycle mutations service-only", () => {
    expect(sql).toContain(
      "enqueue_marketing_external_research(uuid,uuid,jsonb,uuid) from public,anon,authenticated",
    );
    expect(sql).toContain(
      "enqueue_marketing_external_research(uuid,uuid,jsonb,uuid) to service_role",
    );
    expect(sql).not.toContain(
      "enqueue_marketing_external_research(jsonb,uuid) to authenticated",
    );
    expect(sql).toContain("enable row level security");
    expect(sql).toContain(
      "private.marketing_plugin_available(organization_id)",
    );
  });

  it("persists immutable source, evidence, and report provenance", () => {
    expect(sql).toContain("marketing_external_research_sources_immutable");
    expect(sql).toContain("marketing_external_research_evidence_immutable");
    expect(sql).toContain("marketing_external_research_reports_immutable");
    expect(sql).toContain("source_key ~ '^src-");
    expect(sql).toContain("evidence_id ~ '^evid-");
    expect(sql).toContain("external research evidence reference invalid");
  });

  it("does not add automatic memory writes or a database Cron runner", () => {
    expect(sql).not.toContain("knowledge_memories");
    expect(sql).not.toContain("cron.schedule");
    expect(sql).not.toContain("pg_net");
  });

  it("adds forward-only typed evidence provenance without changing access boundaries", () => {
    expect(enrichmentSql).toContain(
      "create or replace function public.record_marketing_external_research_retrieval",
    );
    expect(enrichmentSql).toContain("'hn_story', 'hn_text', 'hn_comment'");
    expect(enrichmentSql).toContain("'article_content'");
    expect(enrichmentSql).toContain(
      "native_id,parent_native_id,canonical_url,title,author,published_at",
    );
    expect(enrichmentSql).toContain("fetched_at,content_hash,safe_metadata");
    expect(enrichmentSql).toContain("security definer set search_path = ''");
    expect(enrichmentSql).toContain("from public,anon,authenticated");
    expect(enrichmentSql).toContain("to service_role");
    expect(enrichmentSql).not.toContain("knowledge_memories");
  });

  it("extends the applied contract forward for controlled fashion intelligence", () => {
    expect(fashionSql).toContain("add value if not exists 'reddit'");
    expect(fashionSql).toContain("add value if not exists 'fashion-editorial'");
    expect(fashionSql).toContain("'reddit_post', 'reddit_comment'");
    expect(fashionSql).toContain("marketing-fashion-research-report-v1");
    expect(fashionSql).toContain("marketing-fashion-source-plan-v1");
    expect(fashionSql).toContain("'fashion_tech'");
    expect(fashionSql).toContain("interval '1 hour'");
    expect(fashionSql).toContain("security definer set search_path = ''");
    expect(fashionSql).toContain("to service_role");
    expect(fashionSql).not.toContain("knowledge_memories");
    expect(fashionSql).not.toContain("drop table");
  });

  it("extends the applied contract forward for organization-scoped social provenance", () => {
    expect(socialSql).toContain("add value if not exists 'social'");
    expect(socialSql).toContain("'social_caption', 'social_comment'");
    expect(socialSql).toContain("marketing-fashion-social-research-report-v1");
    expect(socialSql).toContain("marketing-fashion-social-source-plan-v1");
    expect(socialSql).toContain(
      "create table public.marketing_competitor_social_profiles",
    );
    expect(socialSql).toContain(
      "foreign key (organization_id, marketing_competitor_id)",
    );
    expect(socialSql).toContain(
      "private.marketing_plugin_available(organization_id)",
    );
    expect(socialSql).toContain(
      "private.marketing_plugin_writable(organization_id)",
    );
    expect(socialSql).toContain("security definer set search_path = ''");
    expect(socialSql).toContain("to service_role");
    expect(socialSql).not.toContain("knowledge_memories");
    expect(socialSql).not.toMatch(/pg_net|http_|cron\.schedule/);
    expect(socialSql).not.toContain("drop table");
  });

  it("preserves legacy fashion completion while validating every social section", () => {
    expect(socialSql).toContain(
      "if v_schema_version = 'marketing-fashion-social-research-report-v1'",
    );
    expect(socialSql).toContain(
      "elsif v_schema_version = 'marketing-fashion-research-report-v1'",
    );
    for (const section of [
      "contentpatterns",
      "competitorsignals",
      "visualpatterns",
    ])
      expect(socialSql).toContain(section);
    expect(socialSql).toContain(
      "where profile.organization_id = p_organization_id",
    );
  });

  it("extends the applied contract forward for bounded typed web evidence", () => {
    expect(webSql).toContain("add value if not exists 'web-discovery'");
    expect(webSql).toContain("'web_page'");
    expect(webSql).toContain("marketing-fashion-web-source-plan-v1");
    expect(webSql).toContain("marketing-fashion-web-research-report-v1");
    expect(webSql).toContain("requested_source_count between 1 and 4");
    expect(webSql).toContain(
      "jsonb_array_length(p_request_snapshot->'plan'->'web'->'queryvariants') > 3",
    );
    expect(webSql).toContain("security definer set search_path = ''");
    expect(webSql).toContain("to service_role");
    expect(webSql).not.toContain("knowledge_memories");
    expect(webSql).not.toMatch(/pg_net|http_|cron\.schedule/);
    expect(webSql).not.toContain("drop table");
    expect(webSql).not.toContain("alter table public.ai_runs");
  });

  it("keeps legacy plans from forging WEB and validates all web report sections", () => {
    expect(webSql).toContain(
      "v_plan_version <> 'marketing-fashion-web-source-plan-v1'",
    );
    expect(webSql).toContain(
      "and p_request_snapshot->'plan'->'selectedsourcefamilies' @> '[\"web\"]'::jsonb",
    );
    for (const section of [
      "audiencesignals",
      "languagesignals",
      "trendsignals",
      "objections",
      "debates",
      "contentopportunities",
      "contentpatterns",
      "competitorsignals",
      "visualpatterns",
    ])
      expect(webSql).toContain(section);
  });
});
