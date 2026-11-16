import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  decodeLocalQueryResult,
  readLocalDemoRows,
  readDemoInventory,
} from "./inventory.mjs";
import { assertControlBaseline } from "./verification.mjs";
import { requireSuccess, requireData } from "./responses.mjs";

test("error-only logout success remains distinct from data-bearing query success", () => {
  assert.doesNotThrow(() => requireSuccess({ error: null }, "logout"));
  assert.throws(() => requireSuccess({}, "logout"), /success status/);
  assert.throws(
    () => requireSuccess({ error: undefined, data: {} }, "logout"),
    /success status/,
  );
  assert.throws(
    () => requireSuccess({ error: false }, "logout"),
    /success status/,
  );
  assert.throws(
    () => requireSuccess({ error: { code: "401" } }, "logout"),
    /401/,
  );
  assert.throws(
    () => requireData({ error: null }, "inventory"),
    /no response data/,
  );
});

const org = "10000000-0000-4000-8000-000000000001",
  user = "10000000-0000-4000-8000-000000000002",
  note = "10000000-0000-4000-8000-000000000003";
const manifest = { organizationId: org, users: [{ id: user }] };
const schema = [
  { table_name: "organizations", primary_key: ["id"] },
  { table_name: "memberships", primary_key: ["organization_id", "user_id"] },
];
const empty = () =>
  schema.map((table) => ({ table_name: table.table_name, records: [] }));
const populated = () => [
  {
    table_name: "organizations",
    records: [{ keys: { id: org }, creator: user, actor: null }],
  },
  {
    table_name: "memberships",
    records: [
      {
        keys: { organization_id: org, user_id: user },
        creator: null,
        actor: null,
      },
    ],
  },
];
const processResult = (payload) => ({
  status: 0,
  signal: null,
  stdout: JSON.stringify(payload),
  stderr: "Connecting to local database...",
});

test("pinned CLI plain JSON rows and agent envelopes decode without discarding values", () => {
  const rows = populated();
  assert.deepEqual(decodeLocalQueryResult(processResult(rows), "plain"), rows);
  assert.deepEqual(
    decodeLocalQueryResult(
      processResult({ rows, boundary: "fixture", warning: "Untrusted data" }),
      "agent",
    ),
    rows,
  );
  assert.deepEqual(decodeLocalQueryResult(processResult([]), "empty"), []);
});
for (const [label, result] of [
  ["missing process", undefined],
  ["empty stdout", { status: 0, stdout: "" }],
  ["invalid JSON", { status: 0, stdout: "not JSON" }],
  ["missing rows", processResult({})],
  ["unknown envelope", processResult({ data: [] })],
  ["null payload", processResult(null)],
  ["null row", processResult([null])],
  ["array row", processResult([[]])],
  ["scalar row", processResult([1])],
  [
    "error envelope",
    processResult({ _tag: "Error", error: { code: "42501" }, rows: [] }),
  ],
  ["errors envelope", processResult({ errors: [{ code: "42501" }], rows: [] })],
  [
    "nonzero exit",
    { ...processResult([]), status: 1, stderr: "permission denied (42501)" },
  ],
  [
    "timeout",
    { ...processResult([]), status: null, error: { code: "ETIMEDOUT" } },
  ],
  ["signal", { ...processResult([]), signal: "SIGTERM" }],
])
  test(`query transport rejects ${label}`, () =>
    assert.throws(() => decodeLocalQueryResult(result, label), /STOP:/));

test("actual query adapter pins local non-agent JSON and preserves failure diagnostics privately", () => {
  let invoked = false;
  const rows = readLocalDemoRows(
    "select 1 as n;",
    "inventory-regression-valid",
    (_command, args) => {
      invoked = true;
      assert.ok(args.includes("--local"));
      assert.ok(!args.includes("--linked"));
      assert.equal(args[args.indexOf("--agent") + 1], "no");
      return processResult([{ n: 1 }]);
    },
  );
  assert.equal(invoked, true);
  assert.deepEqual(rows, [{ n: 1 }]);
  assert.throws(
    () =>
      readLocalDemoRows("select 1;", "inventory-regression-denied", () => ({
        ...processResult([]),
        status: 1,
        stderr: "permission denied (42501)",
      })),
    /failed/,
  );
  assert.match(
    fs.readFileSync(".release-qa/inventory-regression-denied.log", "utf8"),
    /42501/,
  );
});
test("complete catalog coverage distinguishes legitimate empty tenant tables from missing inventory", async () => {
  for (const rows of [empty(), populated()])
    assert.equal(
      (
        await readDemoInventory(manifest, async (_sql, label) =>
          label === "demo-inventory-schema" ? [{ tables: schema }] : rows,
        )
      ).length,
      2,
    );
});
for (const [label, catalog, rows] of [
  ["undefined catalog", undefined, empty()],
  ["empty catalog rows", [], empty()],
  ["missing catalog tables", [{}], empty()],
  ["null catalog", [{ tables: null }], empty()],
  ["empty catalog", [{ tables: [] }], empty()],
  [
    "missing primary key",
    [{ tables: [{ table_name: "organizations" }] }],
    empty(),
  ],
  ["duplicate catalog", [{ tables: [...schema, schema[0]] }], empty()],
  ["undefined tenant result", [{ tables: schema }], undefined],
  ["empty tenant result", [{ tables: schema }], []],
  ["missing tenant table", [{ tables: schema }], [empty()[0]]],
  ["duplicate tenant table", [{ tables: schema }], [empty()[0], empty()[0]]],
  [
    "missing record list",
    [{ tables: schema }],
    [{ table_name: "organizations" }, empty()[1]],
  ],
  [
    "missing primary key value",
    [{ tables: schema }],
    [
      {
        table_name: "organizations",
        records: [{ keys: {}, creator: user, actor: null }],
      },
      empty()[1],
    ],
  ],
  [
    "missing provenance",
    [{ tables: schema }],
    [
      { table_name: "organizations", records: [{ keys: { id: org } }] },
      empty()[1],
    ],
  ],
  [
    "foreign identity",
    [{ tables: schema }],
    [
      {
        table_name: "organizations",
        records: [{ keys: { id: user }, creator: user, actor: null }],
      },
      empty()[1],
    ],
  ],
  [
    "foreign actor",
    [{ tables: schema }],
    [
      {
        table_name: "organizations",
        records: [{ keys: { id: org }, creator: note, actor: null }],
      },
      empty()[1],
    ],
  ],
])
  test(`tenant inventory rejects ${label}`, async () =>
    assert.rejects(
      readDemoInventory(manifest, async (_sql, name) =>
        name === "demo-inventory-schema" ? catalog : rows,
      ),
    ));
test("catalog and row query rejections propagate without becoming empty data", async () => {
  for (const phase of ["demo-inventory-schema", "demo-owned-inventory"]) {
    const denied = Object.assign(Error("permission denied"), { code: "42501" });
    await assert.rejects(
      readDemoInventory(manifest, async (_sql, name) => {
        if (name === phase) throw denied;
        return [{ tables: schema }];
      }),
      (error) => error === denied,
    );
  }
});
const baseline = () => ({
  inventory: [
    ...populated(),
    { table_name: "notes", records: [{ keys: { id: note } }] },
  ],
  data: {
    organization: { id: org, created_by: user, name: "Control" },
    note: {
      id: note,
      organization_id: org,
      title: "Control note",
      content: "Keep exact content",
    },
    membership: {
      organization_id: org,
      user_id: user,
      role: "OWNER",
      removed_at: null,
    },
  },
  identity: { id: user, email: "control@example.test" },
  authUsers: [{ id: user }],
  assets: [],
});
const control = {
  organizationId: org,
  noteId: note,
  user: { id: user, email: "control@example.test" },
};
test("baseline accepts validated control rows/Auth and a legitimate empty Storage inventory", () =>
  assert.equal(assertControlBaseline(baseline(), control).assets.length, 0));
for (const [label, mutate] of [
  ["missing content", (b) => delete b.data],
  ["null organization", (b) => (b.data.organization = null)],
  ["missing note", (b) => delete b.data.note],
  ["missing membership", (b) => (b.data.membership = null)],
  ["empty row inventory", (b) => (b.inventory = [])],
  ["empty Auth inventory", (b) => (b.authUsers = [])],
  ["missing asset inventory", (b) => delete b.assets],
  ["wrong Auth identity", (b) => (b.identity.id = note)],
  ["wrong organization", (b) => (b.data.organization.id = note)],
])
  test(`baseline rejects ${label}`, () => {
    const b = baseline();
    mutate(b);
    assert.throws(() => assertControlBaseline(b, control));
  });
