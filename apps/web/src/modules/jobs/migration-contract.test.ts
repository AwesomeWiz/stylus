import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825001100_heavy_job_infrastructure.sql",
  ),
  "utf8",
);

describe("heavy job migration contract", () => {
  it("creates the controlled durable lifecycle and execution classes", () => {
    expect(migration).toContain("create type public.job_status as enum");
    expect(migration).toContain("'DEAD_LETTER'");
    expect(migration).toContain("'EXTERNAL_WORKER'");
  });

  it("uses one organization-scoped jobs table with bounded metadata", () => {
    expect(migration).toContain("create table public.jobs");
    expect(migration).toMatch(/octet_length\(input_metadata::text\) <= 16384/);
    expect(migration).toMatch(/octet_length\(result_metadata::text\) <= 16384/);
  });

  it("pins caller-supplied execution metadata to a protected trusted definition", () => {
    expect(migration).toContain("create table public.job_definitions");
    expect(migration).toContain("Registered job definition required");
    expect(migration).toContain(
      "revoke all on table public.job_definitions from public, anon, authenticated",
    );
    expect(migration).toContain("v_definition.priority");
    expect(migration).toContain("v_definition.max_attempts");
  });

  it("claims with a row lock and skip-locked concurrency", () => {
    expect(migration).toMatch(/for update skip locked[\s\S]*limit 1/);
    expect(migration).toContain("create function public.claim_next_job");
    expect(migration).toContain(
      "v_job.organization_id::text || ':' || v_job.concurrency_group",
    );
  });

  it("keeps future schedules ineligible", () => {
    expect(migration).toContain("job.scheduled_at <= v_now");
    expect(migration).toContain("job.next_attempt_at <= v_now");
  });

  it("provides leases, heartbeats, bounded retries, and stale recovery", () => {
    expect(migration).toContain("create function public.heartbeat_job");
    expect(migration).toContain("create function private.recover_stale_jobs");
    expect(migration).toContain("least(900, 30 * power(2");
  });

  it("keeps worker transitions behind narrow RPCs", () => {
    [
      "report_job_progress",
      "complete_job",
      "report_job_failure",
      "acknowledge_job_cancellation",
    ].forEach((name) =>
      expect(migration).toContain(`create function public.${name}`),
    );
  });

  it("denies worker operations to browser roles", () => {
    expect(migration).toMatch(
      /revoke all on function public\.claim_next_job[\s\S]*from public, anon, authenticated/,
    );
    expect(migration).toMatch(
      /grant execute on function public\.claim_next_job[\s\S]*to service_role/,
    );
  });

  it("allows only SELECT through organization-member RLS", () => {
    expect(migration).toContain("create policy jobs_member_select");
    expect(migration).toContain(
      "grant select on table public.jobs to authenticated",
    );
    expect(migration).not.toMatch(
      /grant (insert|update|delete) on table public\.jobs to authenticated/i,
    );
  });

  it("uses pinned search paths for every security definer function", () => {
    const definers = migration.split("security definer").length - 1;
    const pinned = migration.split("set search_path = ''").length - 1;
    expect(definers).toBeGreaterThan(8);
    expect(pinned).toBeGreaterThanOrEqual(definers);
  });

  it("provides a real database-native Cron processor without pg_net", () => {
    expect(migration).toContain("create function public.process_database_jobs");
    expect(migration).toContain("core.test.echo");
    expect(migration).not.toMatch(/pg_net|net\.http/i);
  });
});
