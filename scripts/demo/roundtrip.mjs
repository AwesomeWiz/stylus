import fs from "node:fs";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import {
  assertLoopback,
  assertNoProviders,
} from "../release/ci-local-database.mjs";
import {
  readDemoInventory,
  canonicalInventory,
  readLocalDemoRows,
} from "./inventory.mjs";
import { verifyDemoAssets } from "./assets.mjs";
import {
  controlSnapshotSql,
  seedVerificationSql,
  assertSeedCounts,
  assertFixtureInventory,
} from "./verification.mjs";

assert.equal(
  process.env.CIRCLECI,
  "true",
  "Real round-trip verification requires the isolated CircleCI VM",
);
assertNoProviders(process.env);
const childEnv = { ...process.env };
process.loadEnvFile("apps/web/.env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assertLoopback(url, ["http:"]);
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const owner = createClient(
  url,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  options,
);
const file = ".release-qa/demo-roundtrip.json";
const demoFile = ".release-qa/demo.json";
const read = (name) => JSON.parse(fs.readFileSync(name, "utf8"));
const check = (result, label) => {
  if (result.error) throw Error(`${label} (${result.error.code ?? "request"})`);
  return result.data;
};
const save = () =>
  fs.writeFileSync(file, JSON.stringify(report, null, 2), { mode: 0o600 });
const pass = (label) => {
  report.checks.push(label);
  save();
  console.log(`PASS ${label}`);
};
function seed(args = []) {
  const result = spawnSync(
    process.execPath,
    ["scripts/demo/seed.mjs", ...args],
    { env: childEnv, stdio: "inherit", windowsHide: true },
  );
  assert.equal(result.status, 0, "Complete seed/cleanup command must succeed");
}
async function login(user, password) {
  check(
    await owner.auth.signInWithPassword({ email: user.email, password }),
    "round-trip owner login",
  );
}
async function controlSnapshot() {
  const c = report.control;
  const identity = check(
    await admin.auth.admin.getUserById(c.user.id),
    "control exact Auth read",
  ).user;
  assert.equal(identity.id, c.user.id);
  assert.equal(identity.email, c.user.email);
  const inventory = await readDemoInventory({
    organizationId: c.organizationId,
    users: [c.user],
  });
  const data = readLocalDemoRows(
    controlSnapshotSql(c),
    "demo-control-snapshot",
  );
  return {
    inventory,
    data,
    identity: {
      id: identity.id,
      email: identity.email,
      user_metadata: identity.user_metadata,
    },
  };
}
async function verifySeed() {
  const manifest = read(demoFile);
  assert.equal(manifest.state, "ready");
  assert.equal(manifest.users.length, 3);
  await login(manifest.users[0], manifest.password);
  for (const [i, user] of manifest.users.entries()) {
    const membership = check(
      await owner
        .from("memberships")
        .select("role,user_id")
        .eq("organization_id", manifest.organizationId)
        .eq("user_id", user.id)
        .single(),
      "exact team membership",
    );
    assert.equal(membership.role, ["OWNER", "MEMBER", "VIEWER"][i]);
  }
  assert.equal(
    Object.values(manifest.teamInvitations).filter((i) => i.accepted).length,
    2,
  );
  const org = manifest.organizationId;
  const rows = readLocalDemoRows(
    seedVerificationSql(manifest),
    "demo-roundtrip-verification",
  );
  assertSeedCounts(rows[0]);
  assertFixtureInventory(manifest, await readDemoInventory(manifest));
  await verifyDemoAssets({ owner, manifest, check });
  assert.deepEqual(
    await readDemoInventory(manifest),
    canonicalInventory(manifest.recordInventory),
  );
  report.rounds.push({
    organizationId: org,
    userIds: manifest.users.map((u) => u.id),
    assets: manifest.assets.map((a) => ({ id: a.storageId, path: a.path })),
    ids: manifest.ids,
  });
  save();
  pass(
    "Complete real seed: invitations, all fixtures, explicit company Memory, private image; zero AI/reports",
  );
}
async function cleanupSeed() {
  const manifest = read(demoFile);
  seed(["--cleanup"]);
  assert.equal(read(demoFile).state, "cleaned");
  assert.ok(
    (await readDemoInventory(manifest)).every((t) => t.records.length === 0),
  );
  for (const user of manifest.users) {
    const result = await admin.auth.admin.getUserById(user.id);
    assert.ok(
      !result.data?.user &&
        (result.error?.status === 404 ||
          result.error?.code === "user_not_found"),
    );
  }
  for (const asset of manifest.assets) {
    assert.match(asset.storageId, /^[0-9a-f-]{36}$/i);
    assert.deepEqual(
      readLocalDemoRows(
        `select id from storage.objects where id='${asset.storageId}';`,
        "demo-asset-absence",
      ),
      [],
    );
  }
  assert.deepEqual(
    await controlSnapshot(),
    report.controlSnapshot,
    "Pre-existing control tenant/account/content must remain unchanged",
  );
  pass(
    "Guarded cleanup: exact tenant rows, Auth accounts and private assets absent; pre-existing control unchanged",
  );
}
// Accept only the two preallocated Auth-smoke tasks and their four exact trigger
// events. Any other inventory change aborts cleanup; never refresh it blindly.
async function approveSmokeWrites() {
  if (!fs.existsSync(".release-qa/auth-smoke.json")) return;
  const manifest = read(demoFile),
    smoke = read(".release-qa/auth-smoke.json");
  assert.equal(smoke.organizationId, manifest.organizationId);
  assert.equal(smoke.taskIds.length, 2);
  assert.equal(new Set(smoke.taskIds).size, 2);
  await login(manifest.users[0], manifest.password);
  const expected = structuredClone(manifest.recordInventory);
  for (const [index, id] of smoke.taskIds.entries()) {
    assert.match(id, /^[0-9a-f-]{36}$/i);
    const actor = manifest.users[index].id;
    const row = check(
      await owner
        .from("tasks")
        .select("id,title,created_by,updated_by")
        .eq("organization_id", manifest.organizationId)
        .eq("id", id)
        .single(),
      "exact smoke task",
    );
    assert.equal(row.created_by, actor);
    assert.equal(row.updated_by, actor);
    assert.equal(row.title, `CI ${["OWNER", "MEMBER"][index]} persisted`);
    expected
      .find((t) => t.table_name === "tasks")
      .records.push({ keys: { id }, creator: actor, actor: null });
    const events = check(
      await owner
        .from("activity_events")
        .select("id,event_type,actor_id,entity_type")
        .eq("organization_id", manifest.organizationId)
        .eq("entity_id", id),
      "exact smoke activity",
    );
    assert.equal(events.length, 2);
    assert.deepEqual(events.map((e) => e.event_type).sort(), [
      "TASK_CREATED",
      "TASK_UPDATED",
    ]);
    for (const event of events) {
      assert.equal(event.actor_id, actor);
      assert.equal(event.entity_type, "TASK");
      expected
        .find((t) => t.table_name === "activity_events")
        .records.push({ keys: { id: event.id }, creator: null, actor });
    }
  }
  assert.deepEqual(
    await readDemoInventory(manifest),
    canonicalInventory(expected),
    "Unexpected rows added during Auth/browser checks",
  );
  manifest.recordInventory = canonicalInventory(expected);
  fs.writeFileSync(demoFile, JSON.stringify(manifest, null, 2), {
    mode: 0o600,
  });
  pass(
    "Auth-smoke cleanup inventory admits only its exact two tasks/four trigger events",
  );
}
let report;
if (process.argv[2] === "prepare") {
  assert.ok(
    !fs.existsSync(file) && !fs.existsSync(demoFile),
    "Round trip requires a fresh recorded scope",
  );
  report = {
    checks: [],
    rounds: [],
    control: {
      password: randomBytes(24).toString("base64url"),
      noteId: randomUUID(),
    },
  };
  save();
  const c = report.control;
  c.user = check(
    await admin.auth.admin.createUser({
      email: `stylus-control-${randomBytes(6).toString("hex")}@example.test`,
      password: c.password,
      email_confirm: true,
      user_metadata: { full_name: "Isolated preservation control" },
    }),
    "create isolated control Auth account",
  ).user;
  c.user = { id: c.user.id, email: c.user.email };
  save();
  await login(c.user, c.password);
  c.organizationId = check(
    await owner.rpc("create_organization", {
      p_name: "Isolated release preservation control",
    }),
    "create isolated control organization",
  ).id;
  save();
  check(
    await owner.rpc("save_core_note", {
      p_organization_id: c.organizationId,
      p_id: c.noteId,
      p_title: "Preserve exact control content",
      p_content:
        "This pre-existing isolated record must survive both demo round trips.",
      p_archived: false,
      p_expected_updated_at: null,
    }),
    "create control note",
  );
  report.controlSnapshot = await controlSnapshot();
  save();
  seed(["--confirm-demo-memory"]);
  await verifySeed();
  await cleanupSeed();
  fs.renameSync(demoFile, ".release-qa/demo-round-one-cleaned.json");
  seed(["--confirm-demo-memory"]);
  await verifySeed();
  pass("Second complete real seed ready for Auth/JWT/browser release checks");
} else if (process.argv[2] === "cleanup") {
  report = read(file);
  await approveSmokeWrites();
  await cleanupSeed();
  const c = report.control;
  await login(c.user, c.password);
  const organization = check(
    await owner
      .from("organizations")
      .select("id,name,created_by")
      .eq("id", c.organizationId)
      .single(),
    "exact control cleanup identity",
  );
  assert.equal(organization.created_by, c.user.id);
  assert.equal(organization.name, "Isolated release preservation control");
  check(
    await owner.rpc("delete_owned_organization", {
      p_organization_id: c.organizationId,
      p_confirmation_name: organization.name,
    }),
    "delete only recorded control organization",
  );
  assert.ok(
    (
      await readDemoInventory({
        organizationId: c.organizationId,
        users: [c.user],
      })
    ).every((t) => !t.records.length),
  );
  check(
    await admin.auth.admin.deleteUser(c.user.id),
    "delete exact control account",
  );
  const gone = await admin.auth.admin.getUserById(c.user.id);
  assert.ok(
    !gone.data?.user &&
      (gone.error?.status === 404 || gone.error?.code === "user_not_found"),
  );
  delete c.password;
  report.state = "cleaned";
  pass(
    "Both complete round trips and exact control cleanup verified; no seeded Auth/tenant/Storage orphans",
  );
} else throw Error("Expected prepare or cleanup");
