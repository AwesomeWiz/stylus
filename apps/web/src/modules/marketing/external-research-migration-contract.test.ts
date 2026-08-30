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
});
