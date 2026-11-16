import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeStartupLog } from "./supabase-start-log.mjs";

test("startup diagnostics retain actionable platform, download and database errors", () => {
  const failures = [
    "uid=1000(circleci) gid=1000(circleci)",
    "Linux x86_64; glibc 2.35; Supabase CLI 2.115.0",
    "Cannot connect to the Docker daemon at unix:///var/run/docker.sock",
    "initdb: error: cannot be run as root",
    "tar: command not found",
    "GET https://github.com/supabase/slim-services/releases/download/v1/auth.tar.gz: ECONNRESET",
    "supabase-cli-artifacts.s3.us-east-1.amazonaws.com: certificate verify failed",
    "checksum mismatch; storage health timeout; port 54322 already in use",
    "ERROR 42501: permission denied for schema auth; migration 20261115000200",
  ].join("\n");
  assert.equal(sanitizeStartupLog(failures, {}), failures);
});

test("startup logs redact generated credentials as well as inherited secrets", () => {
  const input = [
    "\u001b[31mERROR\u001b[0m: startup failed",
    "ANON_KEY=local-anon-value",
    '"service_role_key": "local-service-value"',
    "Secret key │ generated-local-secret │",
    "JWT secret: generated-jwt-secret",
    "postgresql://postgres:local-db-password@127.0.0.1:54322/postgres",
    "Authorization: Bearer generated-access-token",
    "Set-Cookie: session=generated-session",
    "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature",
    "sb_secret_generated sb_publishable_generated",
    "https://release-assets.githubusercontent.com/file?X-Amz-Credential=private-id&X-Amz-Signature=private-signature",
    "inherited-super-secret",
    "-----BEGIN PRIVATE KEY-----\nprivate-material\n-----END PRIVATE KEY-----",
  ].join("\n");
  const result = sanitizeStartupLog(input, {
    SUPABASE_ACCESS_TOKEN: "inherited-super-secret",
  });
  for (const secret of [
    "local-anon-value",
    "local-service-value",
    "generated-local-secret",
    "generated-jwt-secret",
    "local-db-password",
    "generated-access-token",
    "generated-session",
    "eyJhbGciOiJIUzI1NiJ9",
    "sb_secret_generated",
    "sb_publishable_generated",
    "private-id",
    "private-signature",
    "inherited-super-secret",
    "private-material",
  ]) {
    assert.ok(!result.includes(secret), `Secret leaked: ${secret}`);
  }
  assert.ok(result.includes("127.0.0.1:54322/postgres"));
  assert.ok(result.includes("release-assets.githubusercontent.com/file"));
  assert.ok(result.includes("ERROR: startup failed"));
});
