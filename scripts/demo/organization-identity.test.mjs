import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { randomBytes, randomUUID } from "node:crypto";
import { canonicalInventory } from "./inventory.mjs";
import { verifyDemoOrganization } from "./organization-identity.mjs";

const url = "http://127.0.0.1:54321";
const fixture = () => ({
  url,
  name: "Paper Orbit · Fictional demo",
  organizationId: "10000000-0000-4000-8000-000000000001",
  token: "abcdef1234",
  password: "unit-only-fictional-password",
  users: [0, 1, 2].map((i) => ({
    id: `20000000-0000-4000-8000-00000000000${i}`,
    email: `stylus-demo-abcdef1234-${i}@example.test`,
  })),
  recordInventory: [
    {
      table_name: "organizations",
      records: [
        {
          keys: { id: "10000000-0000-4000-8000-000000000001" },
          creator: "20000000-0000-4000-8000-000000000000",
        },
      ],
    },
  ],
});
const rowFor = (manifest) => ({
  id: manifest.organizationId,
  name: manifest.name,
  created_by: manifest.users[0].id,
});
const check = (result) => {
  if (result.error) throw Error(`Fixture query failed (${result.error.code})`);
  return result.data;
};
test("inventory comparison preserves all values while ignoring JSON object key order", () => {
  const a = [
    {
      table_name: "tasks",
      records: [{ keys: { id: "one" }, actor: null, creator: "owner" }],
    },
  ];
  const b = [
    {
      records: [{ creator: "owner", actor: null, keys: { id: "one" } }],
      table_name: "tasks",
    },
  ];
  assert.equal(
    JSON.stringify(canonicalInventory(a)),
    JSON.stringify(canonicalInventory(b)),
  );
  b[0].records[0].creator = "other";
  assert.notEqual(
    JSON.stringify(canonicalInventory(a)),
    JSON.stringify(canonicalInventory(b)),
  );
});
function queryClient(result, calls) {
  return {
    from(table) {
      calls.push(["from", table]);
      return {
        select(projection) {
          calls.push(["select", projection]);
          return {
            eq(column, id) {
              calls.push(["eq", column, id]);
              return { single: async () => result };
            },
          };
        },
      };
    },
  };
}

test("owner verification selects only the exact recorded organization ID", async () => {
  const manifest = fixture(),
    calls = [];
  const row = rowFor(manifest);
  assert.equal(
    await verifyDemoOrganization(
      queryClient({ data: row }, calls),
      manifest,
      check,
      "verification",
    ),
    row,
  );
  assert.deepEqual(calls, [
    ["from", "organizations"],
    ["select", "id,name,created_by"],
    ["eq", "id", manifest.organizationId],
  ]);
  await assert.rejects(
    verifyDemoOrganization(
      queryClient({ error: { code: "42501" } }, []),
      manifest,
      check,
      "verification",
    ),
    /42501/,
  );
});

test("organization, creator and name mismatches fail without a fallback query", async () => {
  const manifest = fixture();
  for (const changes of [
    { id: randomUUID() },
    { created_by: randomUUID() },
    { name: "Another organization" },
  ]) {
    const calls = [];
    await assert.rejects(
      verifyDemoOrganization(
        queryClient({ data: { ...rowFor(manifest), ...changes } }, calls),
        manifest,
        check,
        "verification",
      ),
      /identity mismatch/,
    );
    assert.equal(calls.filter(([kind]) => kind === "eq").length, 1);
  }
});

test("missing recorded identities fail before any query", async () => {
  const manifest = fixture();
  for (const invalid of [
    { ...manifest, organizationId: undefined },
    { ...manifest, users: [] },
  ]) {
    const calls = [];
    await assert.rejects(
      verifyDemoOrganization(
        queryClient({}, calls),
        invalid,
        check,
        "verification",
      ),
      /not recorded/,
    );
    assert.deepEqual(calls, []);
  }
});

// Execute actual seed/cleanup code in a VM with synthetic transport and an
// in-memory filesystem. No credentials, backend, CLI or deletion can escape it.
async function cleanupScenario(options = {}) {
  const seeding = options.mode === "seed";
  const original = fixture();
  const manifest = structuredClone(original);
  options.mutateManifest?.(manifest);
  const calls = [],
    deletedUsers = new Set(),
    writes = new Map();
  let authenticated = false,
    organizationDeleted = false;
  const admin = {
    from(table) {
      throw Error(
        `Auth administration must not access application table ${table}`,
      );
    },
    auth: {
      admin: {
        async createUser(input) {
          assert.equal(seeding, true);
          const user = original.users.find((u) => u.email === input.email);
          assert.ok(user);
          calls.push(["admin.createUser", user.id]);
          return { data: { user } };
        },
        async getUserById(id) {
          calls.push(["admin.getUserById", id]);
          const user = original.users.find((u) => u.id === id);
          if (!user || deletedUsers.has(id))
            return {
              data: { user: null },
              error: { status: 404, code: "user_not_found" },
            };
          return { data: { user: { ...user, ...options.authUserOverride } } };
        },
        async deleteUser(id) {
          assert.ok(original.users.some((u) => u.id === id));
          assert.equal(organizationDeleted, true);
          deletedUsers.add(id);
          calls.push(["admin.deleteUser", id]);
          return { data: {} };
        },
      },
    },
  };
  const owner = {
    auth: {
      async signInWithPassword(input) {
        calls.push(["owner.signIn"]);
        assert.equal(input.email, original.users[0].email);
        assert.equal(input.password, original.password);
        authenticated = true;
        return { data: {} };
      },
    },
    from(table) {
      assert.equal(
        authenticated,
        true,
        "Owner must sign in before organization inspection",
      );
      const result = {
        data: { ...rowFor(original), ...options.organizationOverride },
      };
      return queryClient(result, calls).from(table);
    },
    async rpc(name, input) {
      assert.equal(authenticated, true);
      if (seeding) {
        assert.equal(name, "create_organization");
        assert.equal(input.p_name, original.name);
        calls.push(["owner.createOrganization", original.organizationId]);
        return { data: rowFor(original) };
      }
      assert.equal(name, "delete_owned_organization");
      assert.deepEqual(JSON.parse(JSON.stringify(input)), {
        p_organization_id: original.organizationId,
        p_confirmation_name: original.name,
      });
      organizationDeleted = true;
      calls.push(["owner.deleteOrganization", input.p_organization_id]);
      return { data: {} };
    },
  };
  const context = vm.createContext({
    URL,
    console: { log() {} },
    process: {
      env: {
        NEXT_PUBLIC_SUPABASE_URL: options.backend ?? url,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "unit-public",
        SUPABASE_SERVICE_ROLE_KEY: "unit-admin",
      },
      argv: [
        "node",
        "seed.mjs",
        ...(seeding ? [] : ["--cleanup"]),
        ...(options.extraArgs ?? []),
      ],
      exit(code) {
        throw Object.assign(Error("Synthetic cleanup exit"), {
          exitCode: code,
        });
      },
    },
  });
  const dependencies = {
    "node:fs": {
      default: {
        existsSync() {
          return false;
        },
        mkdirSync() {},
        readFileSync(file) {
          assert.equal(file, ".release-qa/demo.json");
          return JSON.stringify(manifest);
        },
        writeFileSync(file, text) {
          writes.set(file, JSON.parse(text));
        },
      },
    },
    "node:crypto": {
      randomUUID,
      randomBytes: seeding
        ? () => ({
            toString: (format) =>
              format === "hex" ? original.token : original.password,
          })
        : randomBytes,
    },
    "@supabase/supabase-js": {
      createClient(backend, key) {
        assert.equal(backend, url);
        assert.ok(["unit-public", "unit-admin"].includes(key));
        return key === "unit-admin" ? admin : owner;
      },
    },
    "./research-fixture.mjs": {
      createResearchFixture() {
        throw Error("Cleanup cannot create research");
      },
    },
    "./inventory.mjs": {
      canonicalInventory,
      readDemoInventory(input) {
        assert.equal(input.organizationId, original.organizationId);
        return organizationDeleted
          ? []
          : structuredClone(original.recordInventory);
      },
    },
    "./organization-identity.mjs": { verifyDemoOrganization },
    "./team.mjs": {
      ensureDemoTeam() {
        calls.push(["verification.complete"]);
        throw Object.assign(
          Error("Exact organization verification completed"),
          { verificationComplete: true },
        );
      },
    },
    "./assets.mjs": {
      cleanupDemoAssets: async () => {},
      ensureDemoAsset() {
        throw Error("Identity unit checks cannot upload assets");
      },
    },
  };
  const module = new vm.SourceTextModule(
    fs.readFileSync(new URL("./seed.mjs", import.meta.url), "utf8"),
    { context },
  );
  await module.link((name) => {
    const exports = dependencies[name];
    assert.ok(exports, `Unexpected cleanup dependency: ${name}`);
    return new vm.SyntheticModule(
      Object.keys(exports),
      function () {
        for (const [key, value] of Object.entries(exports))
          this.setExport(key, value);
      },
      { context },
    );
  });
  let failure;
  try {
    await module.evaluate();
  } catch (error) {
    failure = error;
  }
  return {
    calls,
    deletedUsers,
    organizationDeleted,
    writes,
    failure,
    original,
  };
}

test("actual cleanup authenticates owner, verifies exact identity and deletes only recorded fixtures", async () => {
  const result = await cleanupScenario();
  assert.equal(result.failure?.exitCode, 0, result.failure?.message);
  assert.equal(result.organizationDeleted, true);
  assert.deepEqual(
    [...result.deletedUsers],
    result.original.users.map((u) => u.id),
  );
  const saved = result.writes.get(".release-qa/demo.json");
  assert.equal(saved.state, "cleaned");
  assert.equal(saved.password, undefined);
});
for (const [name, options] of [
  ["hosted backend", { backend: "https://fixture.supabase.co" }],
  ["legacy hosted override", { extraArgs: ["--allow-hosted-project=fixture"] }],
])
  test(`release seed refuses ${name} before constructing clients or writing files`, async () => {
    const result = await cleanupScenario(options);
    assert.match(result.failure?.message, /hosted projects are refused/);
    assert.equal(result.calls.length, 0);
    assert.equal(result.writes.size, 0);
    assert.equal(result.deletedUsers.size, 0);
  });

test("actual seed signs in owner, bootstraps and verifies exact organization without an admin table read", async () => {
  const result = await cleanupScenario({ mode: "seed" });
  assert.equal(
    result.failure?.verificationComplete,
    true,
    result.failure?.message,
  );
  assert.equal(
    result.calls.filter(([kind]) => kind === "admin.createUser").length,
    3,
  );
  assert.deepEqual(
    result.calls.filter(([kind]) => kind === "eq"),
    [["eq", "id", result.original.organizationId]],
  );
  assert.equal(
    result.writes.get(".release-qa/demo.json").organizationId,
    result.original.organizationId,
  );
});

test("actual seed refuses a different verification response ID before continuing", async () => {
  const result = await cleanupScenario({
    mode: "seed",
    organizationOverride: { id: "10000000-0000-4000-8000-000000000099" },
  });
  assert.match(result.failure?.message, /organization identity mismatch/);
  assert.ok(!result.calls.some(([kind]) => kind === "verification.complete"));
});

for (const [name, options, expected] of [
  [
    "unexpected returned organization ID",
    { organizationOverride: { id: "10000000-0000-4000-8000-000000000099" } },
    /organization identity mismatch/,
  ],
  [
    "unexpected organization creator",
    {
      organizationOverride: {
        created_by: "20000000-0000-4000-8000-000000000099",
      },
    },
    /organization identity mismatch/,
  ],
  [
    "changed row inventory",
    {
      mutateManifest(m) {
        m.recordInventory[0].records = [];
      },
    },
    /demo inventory changed/,
  ],
  [
    "missing row inventory",
    {
      mutateManifest(m) {
        delete m.recordInventory;
      },
    },
    /exact demo row inventory is required/,
  ],
  [
    "unexpected Auth account identity",
    { authUserOverride: { id: "20000000-0000-4000-8000-000000000099" } },
    /Demo user identity mismatch/,
  ],
  [
    "wrong recorded account ID",
    {
      mutateManifest(m) {
        m.users[1].id = "20000000-0000-4000-8000-000000000099";
      },
    },
    /Demo user identity mismatch/,
  ],
  [
    "wrong recorded backend",
    {
      mutateManifest(m) {
        m.url = "https://other.example.test";
      },
    },
    /Demo ownership guard failed/,
  ],
]) {
  test(`actual cleanup refuses ${name} before any deletion`, async () => {
    const result = await cleanupScenario(options);
    assert.ok(result.failure && result.failure.exitCode !== 0);
    assert.match(result.failure.message, expected);
    assert.equal(result.organizationDeleted, false);
    assert.equal(result.deletedUsers.size, 0);
  });
}
