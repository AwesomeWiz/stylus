import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { assertLoopback, assertNoProviders } from "./ci-local-database.mjs";
import { sanitizeStartupLog } from "./supabase-start-log.mjs";

export function assertPublicKey(key) {
  assert.ok(
    typeof key === "string" && key.length > 0,
    "Missing public API key",
  );
  if (key.startsWith("sb_publishable_")) return;
  assert.equal(key.split(".").length, 3, "Expected a public/anon key");
  const claims = JSON.parse(
    Buffer.from(key.split(".")[1], "base64url").toString(),
  );
  assert.equal(
    claims.role,
    "anon",
    "Service credentials must never authorize role assertions",
  );
}

export function assertJwtIdentity(token, userId) {
  assert.ok(
    typeof token === "string" && token.split(".").length === 3,
    "Missing Auth JWT",
  );
  const claims = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString(),
  );
  assert.equal(claims.sub, userId);
  assert.equal(claims.role, "authenticated");
  assert.ok(claims.exp > Date.now() / 1000, "Auth JWT expired");
  // Decoding checks metadata only. The caller must also verify it with Auth.
}

export function assertDemoScope(manifest, url) {
  const api = assertLoopback(url, ["http:"]);
  assert.equal(api.username, "");
  assert.equal(api.password, "");
  assert.equal(manifest.url, url);
  assert.equal(manifest.state, "ready");
  assert.equal(manifest.name, "Paper Orbit · Fictional demo");
  assert.equal(manifest.users.length, 3);
  assert.equal(new Set(manifest.users.map((user) => user.id)).size, 3);
  assert.match(manifest.organizationId, /^[0-9a-f-]{36}$/i);
  for (const user of manifest.users) {
    assert.match(user.id, /^[0-9a-f-]{36}$/i);
    assert.match(user.email, /^stylus-demo-[a-f0-9]{10}-[012]@example\.test$/);
  }
}

const dataOrFail = (result, label) => {
  if (result.error)
    throw Error(`${label} failed (${result.error.code ?? "request"})`);
  return result.data;
};

export async function runAuthSmoke() {
  assert.equal(
    process.env.CIRCLECI,
    "true",
    "This release smoke is restricted to the ephemeral CircleCI VM",
  );
  assertNoProviders(process.env);
  process.loadEnvFile("apps/web/.env.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assertPublicKey(publicKey);
  const manifest = JSON.parse(fs.readFileSync(".release-qa/demo.json", "utf8"));
  assertDemoScope(manifest, url);
  const roles = ["OWNER", "MEMBER", "VIEWER"];
  const clients = [];
  const report = {
    organizationId: manifest.organizationId,
    taskIds: [],
    checks: [],
  };
  const record = (label) => {
    report.checks.push(label);
    fs.writeFileSync(
      ".release-qa/auth-smoke.json",
      JSON.stringify(report, null, 2),
      { mode: 0o600 },
    );
    console.log(`PASS ${label}`);
  };
  // The server key is used only by the existing seeder to create fixtures. All
  // clients below use the public key plus actual password-grant Auth sessions.
  for (const [index, user] of manifest.users.entries()) {
    const client = createClient(url, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const login = dataOrFail(
      await client.auth.signInWithPassword({
        email: user.email,
        password: manifest.password,
      }),
      `${roles[index]} login`,
    );
    assertJwtIdentity(login.session?.access_token, user.id);
    const verified = dataOrFail(
      await client.auth.getUser(login.session.access_token),
      "Server-side Auth verification",
    );
    assert.equal(verified.user.id, user.id);
    const membership = dataOrFail(
      await client
        .from("memberships")
        .select("role")
        .eq("organization_id", manifest.organizationId)
        .eq("user_id", user.id)
        .single(),
      "JWT-backed membership read",
    );
    assert.equal(membership.role, roles[index]);
    const tasks = dataOrFail(
      await client
        .from("tasks")
        .select("id")
        .eq("organization_id", manifest.organizationId)
        .in("id", manifest.ids.tasks),
      "JWT-backed Core read",
    );
    assert.equal(tasks.length, manifest.ids.tasks.length);
    clients.push(client);
    record(
      `${roles[index]} real login, Auth-verified JWT, membership and Core read`,
    );
  }
  const organization = dataOrFail(
    await clients[0]
      .from("organizations")
      .select("id,created_by")
      .eq("id", manifest.organizationId)
      .single(),
    "Owner organization bootstrap",
  );
  assert.equal(organization.created_by, manifest.users[0].id);
  record(
    "Organization created by the seeder through the authenticated owner bootstrap RPC",
  );

  for (const index of [0, 1]) {
    record(
      `${roles[index]} task creation intent; database allocates its protected identity`,
    );
    const actor = manifest.users[index].id;
    const task = dataOrFail(
      await clients[index]
        .from("tasks")
        .insert({
          organization_id: manifest.organizationId,
          title: `CI ${roles[index]} RLS smoke`,
          created_by: actor,
          updated_by: actor,
        })
        .select("id")
        .single(),
      `${roles[index]} task creation`,
    );
    assert.match(task.id, /^[0-9a-f-]{36}$/i);
    const id = task.id;
    report.taskIds.push(id);
    record(`${roles[index]} returned task identity recorded before update`);
    const updated = dataOrFail(
      await clients[index]
        .from("tasks")
        .update({ title: `CI ${roles[index]} persisted`, updated_by: actor })
        .eq("organization_id", manifest.organizationId)
        .eq("id", id)
        .select("id")
        .single(),
      `${roles[index]} task update`,
    );
    assert.equal(updated.id, id);
    record(`${roles[index]} JWT-backed task creation and update`);
  }
  const viewer = clients[2];
  const insert = await viewer.from("tasks").insert({
    organization_id: manifest.organizationId,
    title: "CI forbidden viewer write",
    created_by: manifest.users[2].id,
    updated_by: manifest.users[2].id,
  });
  assert.equal(
    insert.error?.code,
    "42501",
    "VIEWER task insert must be denied by RLS",
  );
  const update = await viewer
    .from("tasks")
    .update({
      title: "CI forbidden viewer update",
      updated_by: manifest.users[2].id,
    })
    .eq("organization_id", manifest.organizationId)
    .eq("id", report.taskIds[0])
    .select("id");
  if (update.error) assert.equal(update.error.code, "42501");
  else assert.deepEqual(update.data, [], "VIEWER update must affect zero rows");
  const unchanged = dataOrFail(
    await clients[0]
      .from("tasks")
      .select("title")
      .eq("id", report.taskIds[0])
      .single(),
    "Owner persistence verification",
  );
  assert.equal(unchanged.title, "CI OWNER persisted");
  record("VIEWER task insert/update denied and original task unchanged");

  for (const [index, client] of clients.entries()) {
    const result = await client.rpc("set_organization_plugin_enabled", {
      p_organization_id: manifest.organizationId,
      p_plugin_id: "marketing",
      p_enabled: true,
    });
    if (index === 0) dataOrFail(result, "OWNER plugin management");
    else
      assert.equal(
        result.error?.code,
        "42501",
        `${roles[index]} must not manage plugins`,
      );
  }
  record("OWNER management allowed; MEMBER and VIEWER management denied");
  for (const client of clients)
    dataOrFail(await client.auth.signOut(), "Auth logout");
  record(
    "All fictional Auth sessions signed out; no AI or external provider invoked",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  runAuthSmoke().catch((error) => {
    console.error(sanitizeStartupLog(error.stack ?? String(error)));
    process.exitCode = 1;
  });
}
