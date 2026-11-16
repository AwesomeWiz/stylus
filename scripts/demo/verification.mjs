import assert from "node:assert/strict";
import {
  requireObject,
  requireRows,
  requireSingleRow,
  requireUuid,
} from "./responses.mjs";

export function assertControlBaseline(snapshot, control) {
  requireObject(snapshot, "control baseline");
  requireObject(control, "control identity");
  requireObject(control.user, "control account identity");
  const data = requireObject(snapshot.data, "control content baseline");
  const org = requireObject(data.organization, "control organization baseline"),
    note = requireObject(data.note, "control note baseline"),
    membership = requireObject(data.membership, "control membership baseline");
  assert.equal(
    org.id,
    requireUuid(control.organizationId, "control organization ID"),
  );
  assert.equal(org.created_by, requireUuid(control.user.id, "control user ID"));
  assert.equal(note.id, requireUuid(control.noteId, "control note ID"));
  assert.equal(note.organization_id, org.id);
  assert.equal(typeof org.name, "string");
  assert.ok(org.name.length);
  assert.equal(typeof note.title, "string");
  assert.ok(note.title.length);
  assert.equal(typeof note.content, "string");
  assert.ok(note.content.length);
  assert.equal(membership.organization_id, org.id);
  assert.equal(membership.user_id, control.user.id);
  assert.equal(membership.role, "OWNER");
  assert.equal(membership.removed_at, null);
  const identity = requireObject(snapshot.identity, "control Auth baseline");
  assert.equal(identity.id, control.user.id);
  assert.equal(identity.email, control.user.email);
  const inventory = requireRows(snapshot.inventory, "control row baseline");
  for (const [table, key, id] of [
    ["organizations", "id", org.id],
    ["notes", "id", note.id],
    ["memberships", "user_id", control.user.id],
  ]) {
    const entry = requireObject(
      inventory.find((row) => row.table_name === table),
      `control ${table} baseline`,
    );
    assert.equal(
      requireSingleRow(entry.records, `control ${table} baseline records`).keys[
        key
      ],
      id,
    );
  }
  const accounts = requireRows(snapshot.authUsers, "control Auth inventory");
  for (const row of accounts) requireUuid(row.id, "Auth inventory ID");
  assert.equal(new Set(accounts.map((row) => row.id)).size, accounts.length);
  assert.equal(accounts.filter((row) => row.id === control.user.id).length, 1);
  const assets = requireRows(snapshot.assets, "control asset inventory");
  for (const row of assets) {
    requireUuid(row.id, "Storage inventory ID");
    assert.equal(typeof row.name, "string");
    assert.ok(row.name.length);
    assert.equal(typeof row.bucket_id, "string");
    assert.ok(row.bucket_id.length);
    assert.ok(Object.hasOwn(row, "owner_id"));
  }
  assert.equal(new Set(assets.map((row) => row.id)).size, assets.length);
  return snapshot;
}

function uuid(value) {
  assert.match(
    value ?? "",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
  return value;
}
export function controlSnapshotSql(control) {
  const org = uuid(control.organizationId),
    note = uuid(control.noteId),
    user = uuid(control.user.id);
  return `select (select to_jsonb(o) from public.organizations o where id='${org}') as organization,(select to_jsonb(n) from public.notes n where organization_id='${org}' and id='${note}') as note,(select to_jsonb(m) from public.memberships m where organization_id='${org}' and user_id='${user}') as membership;`;
}
export function seedVerificationSql(manifest) {
  const org = uuid(manifest.organizationId),
    memory = uuid(manifest.ids.memory),
    run = uuid(manifest.ids.researchRun),
    evidence = uuid(manifest.ids.evidence);
  return `select
    (select count(*)::int from public.tasks where organization_id='${org}') tasks,
    (select count(*)::int from public.board_elements where organization_id='${org}') objects,
    (select count(*)::int from public.knowledge_memories where organization_id='${org}' and id='${memory}' and domain='company') memory,
    (select count(*)::int from public.ai_runs where organization_id='${org}') ai_runs,
    (select count(*)::int from public.marketing_external_research_reports where organization_id='${org}') reports,
    (select status::text from public.marketing_external_research_runs where organization_id='${org}' and id='${run}') research_status,
    (select count(*)::int from public.marketing_external_research_evidence where organization_id='${org}' and id='${evidence}') evidence;`;
}
export function assertSeedCounts(row) {
  assert.deepEqual(row, {
    tasks: 6,
    objects: 8,
    memory: 1,
    ai_runs: 0,
    reports: 0,
    research_status: "CANCELLED",
    evidence: 1,
  });
}
export function assertFixtureInventory(manifest, inventory) {
  const records = (table) => {
    const row = inventory.find((t) => t.table_name === table);
    assert.ok(row, `Missing inventory table ${table}`);
    return row.records;
  };
  const counts = new Map();
  for (const [key, inserted] of Object.entries(manifest.insertResults)) {
    const table = key.slice(0, key.lastIndexOf(":"));
    assert.equal(inserted.organizationId, manifest.organizationId);
    assert.ok(
      records(table).some((r) =>
        inserted.id
          ? r.keys.id === inserted.id
          : r.keys.organization_id === manifest.organizationId,
      ),
      `Missing exact inserted fixture ${key}`,
    );
    counts.set(table, (counts.get(table) ?? 0) + 1);
  }
  for (const [table, count] of counts)
    assert.equal(records(table).length, count, `Unexpected ${table} rows`);
  for (const [key, table] of Object.entries({
    milestone: "milestones",
    note: "notes",
    hypothesis: "marketing_hypotheses",
    experiment: "marketing_experiments",
    learning: "marketing_learnings",
    board: "boards",
    researchRun: "marketing_external_research_runs",
    evidence: "marketing_external_research_evidence",
    memory: "knowledge_memories",
  })) {
    assert.ok(
      records(table).some((r) => r.keys.id === uuid(manifest.ids[key])),
      `Missing canonical fixture ${key}`,
    );
  }
  assert.equal(records("memberships").length, 3);
  assert.equal(records("organization_invitations").length, 2);
}
