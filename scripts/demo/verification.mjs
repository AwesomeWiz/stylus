import assert from "node:assert/strict";

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
