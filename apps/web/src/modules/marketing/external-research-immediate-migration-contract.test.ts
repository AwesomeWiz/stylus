import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825001710_claim_serverless_job.sql",
  ),
  "utf8",
).toLowerCase();

describe("TASK-017 immediate claim migration", () => {
  it("atomically targets only one eligible SERVERLESS job", () => {
    expect(sql).toContain("create function public.claim_serverless_job");
    expect(sql).toContain("job.id = p_job_id");
    expect(sql).toContain("job.execution_class = 'serverless'");
    expect(sql).toContain("for update skip locked");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("attempt_count = job.attempt_count + 1");
  });

  it("keeps the targeted claim service-only", () => {
    expect(sql).toContain(
      "claim_serverless_job(uuid,text,integer)\nfrom public, anon, authenticated",
    );
    expect(sql).toContain(
      "claim_serverless_job(uuid,text,integer)\nto service_role",
    );
  });
});
