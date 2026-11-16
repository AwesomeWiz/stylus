import fs from "node:fs";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
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
  assertControlBaseline,
} from "./verification.mjs";
import {
  requireData,
  requireObject,
  requireRows,
  requireSingleRow,
  requireUuid,
} from "./responses.mjs";

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
const read = (name) =>
  requireObject(JSON.parse(fs.readFileSync(name, "utf8")), `recorded ${name}`);
const check = requireData;
const save = () =>
  fs.writeFileSync(file, JSON.stringify(report, null, 2), { mode: 0o600 });
const pass = (label) => {
  report.checks.push(label);
  save();
  console.log(`PASS ${label}`);
};
async function seed(args = []) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/demo/seed.mjs", ...args], {
      env: childEnv,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code !== 0 || signal)
        reject(Error("Complete seed/cleanup command must succeed"));
      else resolve();
    });
  });
}
async function login(user, password) {
  check(
    await owner.auth.signInWithPassword({ email: user.email, password }),
    "round-trip owner login",
  );
}
function readyDemo() {
  const manifest = read(demoFile);
  assert.equal(manifest.state, "ready");
  assert.equal(manifest.url, url);
  requireUuid(manifest.organizationId, "demo organization ID");
  const users = requireRows(manifest.users, "demo accounts");
  assert.equal(users.length, 3);
  for (const user of users) {
    requireUuid(user.id, "demo account ID");
    assert.equal(typeof user.email, "string");
  }
  assert.equal(new Set(users.map((u) => u.id)).size, 3);
  requireObject(manifest.ids, "demo entity IDs");
  requireObject(manifest.teamInvitations, "demo invitations");
  assert.equal(requireRows(manifest.assets, "demo asset inventory").length, 1);
  assert.ok(requireRows(manifest.recordInventory, "demo row inventory").length);
  return manifest;
}
async function controlSnapshot() {
  const c = report.control;
  const identity = requireObject(
    requireObject(
      check(
        await admin.auth.admin.getUserById(c.user.id),
        "control exact Auth read",
      ),
      "control Auth response",
    ).user,
    "control Auth user",
  );
  assert.equal(identity.id, c.user.id);
  assert.equal(identity.email, c.user.email);
  const inventory = await readDemoInventory({
    organizationId: c.organizationId,
    users: [c.user],
  });
  const data = requireSingleRow(
    await readLocalDemoRows(controlSnapshotSql(c), "demo-control-snapshot"),
    "control content snapshot",
  );
  for (const field of ["organization", "note", "membership"])
    requireObject(data[field], `control ${field}`);
  assert.equal(data.organization.id, c.organizationId);
  assert.equal(data.organization.created_by, c.user.id);
  assert.equal(data.note.id, c.noteId);
  assert.equal(data.note.organization_id, c.organizationId);
  assert.equal(data.membership.organization_id, c.organizationId);
  assert.equal(data.membership.user_id, c.user.id);
  assert.equal(data.membership.role, "OWNER");
  assert.equal(data.membership.removed_at, null);
  for (const [table, key, id] of [
    ["organizations", "id", c.organizationId],
    ["notes", "id", c.noteId],
    ["memberships", "user_id", c.user.id],
  ]) {
    const item = requireObject(
      inventory.find((t) => t.table_name === table),
      `control ${table} inventory`,
    );
    assert.equal(
      requireSingleRow(item.records, `control ${table} records`).keys[key],
      id,
    );
  }
  const authUsers = requireRows(
    await readLocalDemoRows(
      "select id from auth.users order by id;",
      "demo-auth-baseline",
    ),
    "Auth baseline",
  );
  for (const row of authUsers) requireUuid(row.id, "Auth baseline ID");
  assert.equal(authUsers.filter((row) => row.id === c.user.id).length, 1);
  const assets = requireRows(
    await readLocalDemoRows(
      "select id,bucket_id,name,owner_id from storage.objects order by id;",
      "demo-storage-baseline",
    ),
    "Storage baseline",
  );
  for (const row of assets) {
    requireUuid(row.id, "Storage baseline ID");
    assert.equal(typeof row.name, "string");
    assert.equal(typeof row.bucket_id, "string");
  }
  return assertControlBaseline(
    {
      inventory,
      data,
      authUsers,
      assets,
      identity: {
        id: identity.id,
        email: identity.email,
        user_metadata: identity.user_metadata,
      },
    },
    c,
  );
}
async function verifySeed() {
  const manifest = readyDemo();
  assert.equal(manifest.state, "ready");
  assert.equal(manifest.users.length, 3);
  await login(manifest.users[0], manifest.password);
  const team = requireRows(
    check(
      await owner.rpc("list_organization_team", {
        p_organization_id: manifest.organizationId,
      }),
      "authorized team directory",
    ),
    "team directory rows",
  );
  assert.equal(team.length, 3);
  for (const [i, user] of manifest.users.entries()) {
    const membership = requireObject(
      team.find((member) => member.member_user_id === user.id),
      "verified membership",
    );
    assert.equal(membership.email, user.email);
    assert.equal(membership.role, ["OWNER", "MEMBER", "VIEWER"][i]);
  }
  const invitations = requireRows(
    check(
      await owner.rpc("list_organization_invitations", {
        p_organization_id: manifest.organizationId,
      }),
      "authorized invitation directory",
    ),
    "invitation rows",
  );
  assert.equal(invitations.length, 2);
  for (const invitation of invitations) {
    assert.equal(invitation.status, "ACCEPTED");
    assert.ok(
      Object.values(manifest.teamInvitations).some(
        (record) => record.id === invitation.id && record.accepted,
      ),
    );
  }
  assert.equal(
    Object.values(manifest.teamInvitations).filter((i) => i.accepted).length,
    2,
  );
  const org = manifest.organizationId;
  const row = requireSingleRow(
    await readLocalDemoRows(
      seedVerificationSql(manifest),
      "demo-roundtrip-verification",
    ),
    "seed count verification",
  );
  assertSeedCounts(row);
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
  const manifest = readyDemo();
  await assertControlUnchanged();
  await seed(["--cleanup"]);
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
      await readLocalDemoRows(
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
async function assertControlUnchanged() {
  assertControlBaseline(report.controlSnapshot, report.control);
  const before = await controlSnapshot();
  for (const field of ["inventory", "data", "identity"])
    assert.deepEqual(
      before[field],
      report.controlSnapshot[field],
      `Pre-existing control ${field} changed before cleanup`,
    );
}
// Accept only the two Auth-smoke tasks recorded on creation and their four exact trigger
// events. Any other inventory change aborts cleanup; never refresh it blindly.
async function approveSmokeWrites() {
  if (!fs.existsSync(".release-qa/auth-smoke.json")) return;
  const manifest = readyDemo(),
    smoke = read(".release-qa/auth-smoke.json");
  assert.equal(smoke.organizationId, manifest.organizationId);
  if (!Array.isArray(smoke.taskIds))
    throw Error("STOP: missing recorded smoke task IDs");
  assert.equal(smoke.taskIds.length, 2);
  assert.equal(new Set(smoke.taskIds).size, 2);
  await login(manifest.users[0], manifest.password);
  const expected = structuredClone(manifest.recordInventory);
  const addExact = (table, record) => {
    const entries = requireRows(
      requireObject(
        expected.find((t) => t.table_name === table),
        `smoke ${table} inventory`,
      ).records,
      `smoke ${table} records`,
    );
    const matches = entries.filter((entry) => entry.keys.id === record.keys.id);
    assert.ok(matches.length <= 1, "Duplicate recorded smoke identity");
    if (matches.length)
      assert.deepEqual(matches[0], record, "Recorded smoke provenance changed");
    else entries.push(record);
  };
  for (const [index, id] of smoke.taskIds.entries()) {
    assert.match(id, /^[0-9a-f-]{36}$/i);
    const actor = manifest.users[index].id;
    const row = requireObject(
      check(
        await owner
          .from("tasks")
          .select("id,title,created_by,updated_by")
          .eq("organization_id", manifest.organizationId)
          .eq("id", id)
          .single(),
        "exact smoke task",
      ),
      "verified smoke task",
    );
    assert.equal(row.created_by, actor);
    assert.equal(row.updated_by, actor);
    assert.equal(row.title, `CI ${["OWNER", "MEMBER"][index]} persisted`);
    addExact("tasks", {
      keys: { id },
      creator: actor,
      actor: null,
    });
    const events = check(
      await owner
        .from("activity_events")
        .select("id,event_type,actor_id,entity_type")
        .eq("organization_id", manifest.organizationId)
        .eq("entity_id", id),
      "exact smoke activity",
    );
    requireRows(events, "smoke trigger events");
    assert.equal(events.length, 2);
    assert.deepEqual(events.map((e) => e.event_type).sort(), [
      "TASK_CREATED",
      "TASK_UPDATED",
    ]);
    for (const event of events) {
      assert.equal(event.actor_id, actor);
      assert.equal(event.entity_type, "TASK");
      addExact("activity_events", {
        keys: { id: requireUuid(event.id, "smoke event ID") },
        creator: null,
        actor,
      });
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
    state: "preparing",
    checks: [],
    rounds: [],
    control: {
      password: randomBytes(24).toString("base64url"),
      noteId: randomUUID(),
    },
  };
  save();
  const c = report.control;
  c.user = requireObject(
    requireObject(
      check(
        await admin.auth.admin.createUser({
          email: `stylus-control-${randomBytes(6).toString("hex")}@example.test`,
          password: c.password,
          email_confirm: true,
          user_metadata: { full_name: "Isolated preservation control" },
        }),
        "create isolated control Auth account",
      ),
      "control account response",
    ).user,
    "created control account",
  );
  requireUuid(c.user.id, "created control account ID");
  c.user = { id: c.user.id, email: c.user.email };
  save();
  await login(c.user, c.password);
  c.organizationId = requireUuid(
    requireObject(
      check(
        await owner.rpc("create_organization", {
          p_name: "Isolated release preservation control",
        }),
        "create isolated control organization",
      ),
      "control organization response",
    ).id,
    "created control organization ID",
  );
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
  await seed(["--confirm-demo-memory"]);
  await verifySeed();
  await cleanupSeed();
  fs.renameSync(demoFile, ".release-qa/demo-round-one-cleaned.json");
  await seed(["--confirm-demo-memory"]);
  await verifySeed();
  report.state = "prepared";
  pass("Second complete real seed ready for Auth/JWT/browser release checks");
} else if (process.argv[2] === "cleanup") {
  report = read(file);
  assert.equal(
    report.state,
    "prepared",
    "Only a fully prepared round trip may clean up",
  );
  assertControlBaseline(report.controlSnapshot, report.control);
  requireRows(report.rounds, "recorded round trips");
  assert.equal(report.rounds.length, 2);
  const latest = readyDemo();
  assert.equal(latest.organizationId, report.rounds[1].organizationId);
  assert.deepEqual(
    latest.users.map((u) => u.id),
    report.rounds[1].userIds,
  );
  await assertControlUnchanged();
  await approveSmokeWrites();
  await cleanupSeed();
  const c = report.control;
  await login(c.user, c.password);
  const organization = requireObject(
    check(
      await owner
        .from("organizations")
        .select("id,name,created_by")
        .eq("id", c.organizationId)
        .single(),
      "exact control cleanup identity",
    ),
    "control cleanup organization",
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
  assert.deepEqual(
    await readLocalDemoRows(
      "select id from auth.users order by id;",
      "demo-final-auth-absence",
    ),
    report.controlSnapshot.authUsers.filter((u) => u.id !== c.user.id),
  );
  assert.deepEqual(
    await readLocalDemoRows(
      "select id,bucket_id,name,owner_id from storage.objects order by id;",
      "demo-final-storage-absence",
    ),
    report.controlSnapshot.assets,
  );
  delete c.password;
  report.state = "cleaned";
  pass(
    "Both complete round trips and exact control cleanup verified; no seeded Auth/tenant/Storage orphans",
  );
} else throw Error("Expected prepare or cleanup");
