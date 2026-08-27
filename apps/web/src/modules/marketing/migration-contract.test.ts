import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825001310_marketing_plugin_foundation.sql",
  ),
  "utf8",
).toLowerCase();

describe("Marketing foundation migration", () => {
  it("creates only the five scoped plugin tables with soft archival", () => {
    for (const table of [
      "marketing_competitors",
      "marketing_campaigns",
      "marketing_reel_ideas",
      "marketing_research",
      "marketing_creative_briefs",
    ]) {
      expect(migration).toContain(`create table public.${table}`);
    }
    expect(migration).not.toMatch(
      /create table public\.marketing_(scripts|transcripts|embeddings|metrics)/,
    );
    expect(migration).not.toContain("delete from public.marketing_");
    expect(migration).toContain(
      "alter table public.%i enable row level security",
    );
  });
  it("binds reads and writes to membership plus enabled Marketing", () => {
    expect(migration).toContain(
      "plugin.plugin_id = 'marketing' and plugin.enabled",
    );
    expect(migration).toContain("array['owner', 'admin', 'member']");
    expect(migration).toContain(
      "private.marketing_plugin_available(organization_id)",
    );
    expect(migration).not.toContain("'viewer'::public.organization_role");
  });
  it("protects provenance, same-org relationships, activity, and hard deletion", () => {
    expect(migration).toContain("new.created_by := v_actor");
    expect(migration).toContain("new.updated_by := v_actor");
    expect(migration).toContain("foreign key (organization_id, campaign_id)");
    expect(migration).toContain(
      "foreign key (organization_id, core_competitor_id)",
    );
    expect(migration).toContain("jsonb_build_object('record_type'");
    expect(migration).not.toContain("grant delete");
  });
  it("has no AI, memory, job, worker, or network execution path", () => {
    expect(migration).not.toMatch(
      /ai_runs|knowledge_memories|insert into public\.jobs|pg_net|http_|ollama|openai/,
    );
  });
});
