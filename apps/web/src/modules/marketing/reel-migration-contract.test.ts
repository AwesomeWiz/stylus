import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825001400_competitor_reel_analysis.sql",
  ),
  "utf8",
).toLowerCase();

describe("TASK-014 migration contract", () => {
  it("creates separate Reel, transcript, and versioned analysis records", () => {
    expect(sql).toContain("create table public.marketing_competitor_reels");
    expect(sql).toContain(
      "create table public.marketing_competitor_reel_transcripts",
    );
    expect(sql).toContain(
      "create table public.marketing_competitor_reel_analyses",
    );
    expect(sql).toContain(
      "unique (organization_id, competitor_reel_id, analysis_version)",
    );
    expect(sql).not.toMatch(/alter table public\.marketing_reel_ideas/);
  });
  it("uses a private bounded MP4 bucket with organization-scoped policies", () => {
    expect(sql).toContain(
      "'marketing-reel-media', 'marketing-reel-media', false, 104857600",
    );
    expect(sql).toContain("array['video/mp4']");
    expect(sql).toContain(
      "private.marketing_reel_storage_organization_id(name)",
    );
    expect(sql).toContain(
      "reel.storage_path=name and reel.processing_status='uploading'",
    );
    expect(sql).not.toContain(
      "grant delete on public.marketing_competitor_reels",
    );
  });
  it("registers one static Marketing worker job and narrow owned-job broker RPCs", () => {
    expect(sql).toContain("'marketing.competitor-reel.extract', 'marketing'");
    expect(sql).toContain(
      "'marketing.competitor-reels.analyze', 'external_worker'",
    );
    expect(sql).toContain("create function public.worker_authorize_reel_media");
    expect(sql).toContain(
      "create function public.worker_persist_reel_extraction",
    );
    expect(sql).toContain("j.claimant_id='windows/'||v_worker.id::text");
    expect(sql).toContain("j.status='running' and j.lease_expires_at>now()");
    expect(sql).not.toContain("knowledge_memories");
  });
  it("bounds duration, scenes, transcript, analysis, and grants worker functions only to service role", () => {
    expect(sql).toContain("duration_seconds between 0 and 180");
    expect(sql).toContain("jsonb_array_length(scene_timestamps) <= 20");
    expect(sql).toContain("char_length(text) between 1 and 100000");
    expect(sql).toContain("pg_column_size(structured_result) <= 65536");
    expect(sql).toMatch(
      /worker_authorize_reel_media[\s\S]*from public,anon,authenticated/,
    );
    expect(sql).toMatch(/worker_authorize_reel_media[\s\S]*to service_role/);
  });
  it("re-checks the active Marketing job before a trusted structured AI run", () => {
    expect(sql).toContain("p_capability<>'marketing.competitor-reels.analyze'");
    expect(sql).toContain("p_operation<>'generate_structured'");
    expect(sql).toContain("a.status='processing'");
  });
});
