import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825001200_windows_workers.sql",
  ),
  "utf8",
);

describe("Windows worker migration", () => {
  it("stores only hashes and exposes narrow pairing and lifecycle RPCs", () => {
    expect(migration).toContain("credential_hash bytea");
    expect(migration).toContain("token_hash bytea");
    expect(migration).not.toMatch(/^\s+(credential|token) text not null/im);
    expect(migration).toContain("extensions.digest(p_credential,'sha256')");
    expect(migration).toContain("for update skip locked");
    expect(migration).toContain("last_seen_at<=now()-interval '30 seconds'");
  });
  it("keeps worker functions service-only and security-definer paths pinned", () => {
    expect(migration).toMatch(
      /revoke all on function public\.create_worker_pairing[\s\S]*from public,anon/,
    );
    expect(migration).toMatch(
      /revoke all on function public\.list_organization_workers[\s\S]*from public,anon/,
    );
    expect(migration).toMatch(
      /revoke all on function public\.revoke_worker[\s\S]*from public,anon/,
    );
    expect(migration).toMatch(
      /revoke all on function public\.worker_claim_job[\s\S]*from public,anon,authenticated/,
    );
    expect(migration).toContain(
      "grant execute on function public.worker_claim_job(text,text[]) to service_role",
    );
    expect(migration).not.toMatch(
      /grant execute on function public\.worker_claim_job[^\n]*to authenticated/,
    );
    expect(migration.split("security definer").length - 1).toBe(
      migration.split("set search_path = ''").length - 1,
    );
  });
  it("registers only a harmless external diagnostic", () => {
    expect(migration).toContain("'core.test.worker-echo'");
    expect(migration).toContain("'EXTERNAL_WORKER'");
    expect(migration).not.toMatch(
      /run_command|powershell|cmd\.exe|execute_shell/,
    );
  });
});
