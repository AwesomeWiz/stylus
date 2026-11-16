import assert from "node:assert/strict";
import test from "node:test";
import {
  assertLoopback,
  assertNoProviders,
  parseLocalStatus,
} from "./ci-local-database.mjs";
import {
  assertDemoScope,
  assertJwtIdentity,
  assertPublicKey,
} from "./ci-auth-smoke.mjs";

test("local gate refuses hosted URLs, wrong SQL users and unexpected ports", () => {
  const status =
    'API_URL="http://127.0.0.1:54321"\nDB_URL="postgresql://postgres:test@127.0.0.1:54322/postgres"\n';
  assert.equal(parseLocalStatus(status).API_URL, "http://127.0.0.1:54321");
  for (const input of [
    status.replace("127.0.0.1:54321", "example.supabase.co"),
    status.replace("postgres:test@", "service_role:test@"),
    status.replace("54322", "54323"),
    status.replace("/postgres", "/other"),
    "",
  ])
    assert.throws(() => parseLocalStatus(input));
  assert.throws(() => assertLoopback("https://example.supabase.co", ["http:"]));
  assert.throws(() =>
    assertLoopback("http://127.0.0.1.attacker.test", ["http:"]),
  );
});

test("optional providers and inherited hosted configuration fail closed", () => {
  assertNoProviders({ CIRCLECI: "true", SUPABASE_EXPERIMENTAL_STACK: "0" });
  for (const name of [
    "STYLUS_AI_OLLAMA_BASE_URL",
    "STYLUS_GITHUB_PRIVATE_KEY",
    "STYLUS_GOOGLE_CLIENT_SECRET",
    "STYLUS_INTEGRATION_KEYS",
    "OPENAI_API_KEY",
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_DB_PASSWORD",
    "NEXT_PUBLIC_SUPABASE_URL",
  ]) {
    assert.throws(() => assertNoProviders({ [name]: "synthetic" }));
  }
});

test("JWT metadata requires matching identity, authenticated role and expiry", () => {
  const token = (claims) =>
    `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;
  const valid = {
    sub: "fixture-user",
    role: "authenticated",
    exp: Date.now() / 1000 + 3600,
  };
  assertJwtIdentity(token(valid), "fixture-user");
  for (const claims of [
    { ...valid, sub: "other-user" },
    { ...valid, role: "service_role" },
    { ...valid, exp: 0 },
  ]) {
    assert.throws(() => assertJwtIdentity(token(claims), "fixture-user"));
  }
  assert.throws(() => assertJwtIdentity("not-a-jwt", "fixture-user"));
});

test("role smoke accepts public keys and rejects service credentials", () => {
  assertPublicKey("sb_publishable_synthetic");
  const legacy = (role) =>
    `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
  assertPublicKey(legacy("anon"));
  assert.throws(() => assertPublicKey(legacy("service_role")));
  assert.throws(() => assertPublicKey("sb_secret_synthetic"));
  assert.throws(() => assertPublicKey(undefined));
});

test("only the exact ready fictional local demo is accepted", () => {
  const url = "http://127.0.0.1:54321";
  const fixture = {
    url,
    state: "ready",
    name: "Paper Orbit · Fictional demo",
    organizationId: "10000000-0000-4000-8000-000000000001",
    users: [0, 1, 2].map((i) => ({
      id: `20000000-0000-4000-8000-00000000000${i}`,
      email: `stylus-demo-abcdef1234-${i}@example.test`,
    })),
  };
  assertDemoScope(fixture, url);
  for (const value of [
    { ...fixture, url: "https://example.supabase.co" },
    { ...fixture, state: "creating" },
    { ...fixture, users: fixture.users.slice(0, 2) },
    {
      ...fixture,
      users: fixture.users.map((u) => ({ ...u, email: "real@company.test" })),
    },
  ]) {
    assert.throws(() => assertDemoScope(value, url));
  }
});
