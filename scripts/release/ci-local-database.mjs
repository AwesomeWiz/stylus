import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { sanitizeStartupLog } from "./supabase-start-log.mjs";

export function assertLoopback(value, protocols) {
  const url = new URL(value);
  assert.ok(protocols.includes(url.protocol), "Unexpected local protocol");
  assert.ok(
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname),
    "CI must never use a hosted backend",
  );
  return url;
}

export function assertNoProviders(env) {
  for (const [name, value] of Object.entries(env)) {
    if (
      /^(STYLUS_(AI_|GITHUB_|GOOGLE_|INTEGRATION_|WEB_DISCOVERY_|REDDIT_)|OPENAI_|OLLAMA_|SUPABASE_(ACCESS_TOKEN|DB_PASSWORD|URL|SERVICE_ROLE_KEY)$|NEXT_PUBLIC_SUPABASE_)/.test(
        name,
      )
    ) {
      assert.ok(!value, `CI requires ${name} to be absent`);
    }
  }
}

export function parseLocalStatus(output) {
  const values = Object.fromEntries(
    [...output.matchAll(/^([A-Z_]+)="([^"]*)"\r?$/gm)].map((m) => [m[1], m[2]]),
  );
  assertLoopback(values.API_URL, ["http:"]);
  const db = assertLoopback(values.DB_URL, ["postgres:", "postgresql:"]);
  assert.equal(decodeURIComponent(db.username), "postgres");
  assert.equal(db.pathname, "/postgres");
  assert.equal(db.port, "54322");
  return values;
}

function run(command, args, input) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
    input,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    // Never print argv: a local DB URL can contain credentials.
    process.stderr.write(
      sanitizeStartupLog((result.stdout ?? "") + (result.stderr ?? "")),
    );
    throw Error(
      `Local CI command failed (${result.status ?? result.error?.code})`,
    );
  }
  return result.stdout;
}

function cli(args) {
  return run(process.execPath, [
    "node_modules/supabase/dist/supabase.js",
    ...args,
  ]);
}

export function guardFreshCheckout() {
  assert.equal(process.env.SUPABASE_EXPERIMENTAL_STACK, "0");
  assertNoProviders(process.env);
  for (const file of [
    ".env",
    ".env.local",
    "apps/web/.env.local",
    "supabase/.temp/project-ref",
    ".release-qa/demo.json",
  ]) {
    assert.ok(
      !fs.existsSync(file),
      `CI requires a fresh checkout without ${file}`,
    );
  }
}

export function verifyDatabase() {
  assert.equal(process.env.SUPABASE_EXPERIMENTAL_STACK, "0");
  // Real CLI status is captured in memory; API/service keys are never printed.
  const status = parseLocalStatus(cli(["status", "--output", "env"]));
  console.log(
    "Local Docker status: API 127.0.0.1; PostgreSQL postgres@127.0.0.1:54322/postgres; credentials withheld.",
  );
  const migrations = fs
    .readdirSync("supabase/migrations")
    .filter((file) => file.endsWith(".sql"))
    .map((file) => file.match(/^(\d+)_/)[1])
    .sort();
  const suites = fs
    .readdirSync("supabase/tests/database")
    .filter((file) => file.endsWith(".test.sql"));
  assert.ok(
    migrations.length >= 53 && suites.length >= 30,
    "Release suite/migration inventory shrank",
  );
  const result = JSON.parse(
    run(
      "docker",
      [
        "exec",
        "-i",
        "supabase_db_stylus",
        "psql",
        "--username=postgres",
        "--dbname=postgres",
        "--no-psqlrc",
        "--no-align",
        "--tuples-only",
        "--set=ON_ERROR_STOP=1",
      ],
      `select json_build_object(
    'connection_role',session_user,'session_role',current_user,'role_setting',current_setting('role'),'database',current_database(),
    'fixture_auth_insert',has_table_privilege(current_user,'auth.users','INSERT'),
    'fixture_worker_select',has_table_privilege(current_user,'public.worker_registrations','SELECT'),
    'service_role_worker_select',has_table_privilege('service_role','public.worker_registrations','SELECT'),
    'worker_grants',(select json_agg(g) from (select grantee,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='worker_registrations' order by grantee,privilege_type) g),
    'worker_owner',(select tableowner from pg_tables where schemaname='public' and tablename='worker_registrations'),
    'pgcrypto',exists(select 1 from pg_extension where extname='pgcrypto'),
    'auth',to_regclass('auth.users') is not null,'storage',to_regclass('storage.objects') is not null,
    'migrations',(select json_agg(version order by version) from supabase_migrations.schema_migrations));
`,
    ),
  );
  console.log(
    "Administrative SQL fixture connection/grants:",
    JSON.stringify(result),
  );
  assert.equal(result.connection_role, "postgres");
  assert.equal(result.session_role, "postgres");
  assert.equal(result.database, "postgres");
  for (const property of [
    "fixture_auth_insert",
    "fixture_worker_select",
    "pgcrypto",
    "auth",
    "storage",
  ]) {
    assert.equal(
      result[property],
      true,
      `Missing local database prerequisite: ${property}`,
    );
  }
  assert.deepEqual(
    result.migrations,
    migrations,
    "Fresh local migration ledger differs from repository",
  );
  console.log(
    `Verified all ${migrations.length} migrations; running all ${suites.length} SQL/RLS suites using the same local postgres connection.`,
  );
  // Identical pgTAP command to npm run test:db, with its target made explicit.
  // No fixture bootstrap, grants, role aliases or database patches are applied.
  process.stdout.write(
    sanitizeStartupLog(cli(["test", "db", "--db-url", status.DB_URL])),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  if (process.argv[2] === "guard") guardFreshCheckout();
  else if (process.argv[2] === "test") verifyDatabase();
  else throw Error("Expected guard or test");
}
