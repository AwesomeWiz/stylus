import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { randomUUID, randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { pgtap } from "@electric-sql/pglite-pgtap";
import { ensureDemoTeam } from "./team.mjs";
import { createResearchFixture } from "./research-fixture.mjs";
import { ensureDemoAsset, cleanupDemoAssets } from "./assets.mjs";
import { verifyDemoOrganization } from "./organization-identity.mjs";
import { canonicalInventory, readDemoInventory } from "./inventory.mjs";

// Real migrations/grants/RLS/functions, with synthetic Auth/Storage transport.
// This is a complete SQL contract regression, not a real Supabase/Auth claim.
test(
  "complete seed, explicit Memory, private asset and exact cleanup twice under production SQL permissions",
  { timeout: 120000 },
  async () => {
    const db = new PGlite({ extensions: { pgcrypto, pgtap } });
    const files = new Map(),
      accounts = new Map(),
      bytes = new Map(),
      calls = [];
    const url = "http://127.0.0.1:54321";
    const quote = (name) => {
      assert.match(name, /^[a-z_][a-z_0-9]*$/);
      return `"${name}"`;
    };
    async function sql(role, user, query, params = []) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        user ?? "",
      ]);
      await db.exec(`set role ${role}`);
      try {
        return (await db.query(query, params)).rows;
      } finally {
        await db.exec("reset role");
      }
    }
    function createClient(_url, key) {
      assert.equal(_url, url);
      const role = key === "test-service" ? "service_role" : "authenticated";
      let user;
      const result = async (fn) => {
        try {
          return { data: await fn(), error: null };
        } catch (error) {
          return {
            data: null,
            error: { code: error.code, message: error.message },
          };
        }
      };
      const client = {
        auth: {
          admin: {
            createUser: (input) =>
              result(async () => {
                assert.equal(role, "service_role");
                const record = { id: randomUUID(), ...input };
                await sql(
                  "postgres",
                  null,
                  "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
                  [
                    record.id,
                    record.email,
                    JSON.stringify(input.user_metadata),
                  ],
                );
                accounts.set(record.id, record);
                return { user: record };
              }),
            async getUserById(id) {
              return accounts.has(id)
                ? { data: { user: accounts.get(id) } }
                : {
                    data: { user: null },
                    error: { status: 404, code: "user_not_found" },
                  };
            },
            deleteUser: (id) =>
              result(async () => {
                assert.ok(accounts.has(id));
                await sql(
                  "postgres",
                  null,
                  "delete from auth.users where id=$1",
                  [id],
                );
                accounts.delete(id);
                return {};
              }),
          },
          signInWithPassword: (input) =>
            result(async () => {
              user = [...accounts.values()].find(
                (a) => a.email === input.email && a.password === input.password,
              );
              assert.ok(user);
              return { user };
            }),
          getUser: () =>
            result(async () => {
              assert.ok(user);
              return { user };
            }),
          signOut: () =>
            result(async () => {
              user = null;
              return {};
            }),
        },
        rpc: (name, args) =>
          result(async () => {
            calls.push([role, name]);
            const meta = await sql(
              "postgres",
              null,
              `select p.proargnames,p.proretset,t.typtype,array(select format_type(a,null) from unnest(p.proargtypes) a) types from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_type t on t.oid=p.prorettype where n.nspname='public' and p.proname=$1`,
              [name],
            );
            assert.equal(meta.length, 1, `RPC metadata ${name}`);
            const info = meta[0],
              values = [],
              expressions = [];
            for (const [key, value] of Object.entries(args)) {
              const type = info.types[info.proargnames.indexOf(key)];
              assert.ok(type, `${name}.${key}`);
              values.push(
                type === "jsonb" || type === "json"
                  ? JSON.stringify(value)
                  : value,
              );
              expressions.push(`${quote(key)}=>$${values.length}::${type}`);
            }
            const composite = info.typtype === "c";
            const rows = await sql(
              role,
              user?.id,
              `select * from public.${quote(name)}(${expressions.join(",")})`,
              values,
            );
            return composite
              ? info.proretset
                ? rows
                : rows[0]
              : info.proretset
                ? rows
                : rows[0]?.[name];
          }),
        from(table) {
          let fields = "*",
            insertion,
            filters = [],
            single = false,
            optional = false;
          const builder = {
            insert(value) {
              insertion = value;
              return builder;
            },
            select(value = "*") {
              fields = value;
              return builder;
            },
            eq(key, value) {
              filters.push([key, value]);
              return builder;
            },
            single() {
              single = true;
              return builder;
            },
            maybeSingle() {
              single = true;
              optional = true;
              return builder;
            },
            then(resolve, reject) {
              return result(async () => {
                calls.push([
                  role,
                  `${insertion ? "insert" : "select"}:${table}`,
                ]);
                const projection =
                  fields === "*" ? "*" : fields.split(",").map(quote).join(",");
                const params = [],
                  clauses = filters.map(([k, v]) => {
                    params.push(v);
                    return `${quote(k)}=$${params.length}`;
                  });
                let query = `select ${projection} from public.${quote(table)}${clauses.length ? " where " + clauses.join(" and ") : ""}`;
                if (insertion) {
                  assert.equal(filters.length, 0);
                  params.push(
                    ...Object.values(insertion).map((v) =>
                      v && typeof v === "object" && !Array.isArray(v)
                        ? JSON.stringify(v)
                        : v,
                    ),
                  );
                  query = `insert into public.${quote(table)}(${Object.keys(insertion).map(quote).join(",")}) values(${params.map((_, i) => "$" + (i + 1)).join(",")}) returning ${projection}`;
                }
                const rows = await sql(role, user?.id, query, params);
                if (single) {
                  assert.ok(
                    rows.length === 1 || (optional && rows.length === 0),
                    `${table}: expected one row, got ${rows.length}`,
                  );
                  return rows[0] ?? null;
                }
                return rows;
              }).then(resolve, reject);
            },
          };
          return builder;
        },
        storage: {
          from(bucket) {
            assert.equal(bucket, "board-images");
            return {
              upload: (name, data) =>
                result(async () => {
                  const id = randomUUID();
                  await sql(
                    role,
                    user?.id,
                    "insert into storage.objects(id,bucket_id,name,owner_id) values($1,$2,$3,$4)",
                    [id, bucket, name, user.id],
                  );
                  bytes.set(name, data);
                  return { id, path: name };
                }),
              async download(name) {
                const rows = await sql(
                  role,
                  user?.id,
                  "select id from storage.objects where bucket_id=$1 and name=$2",
                  [bucket, name],
                );
                return rows.length
                  ? { data: new Blob([bytes.get(name)]) }
                  : { error: { statusCode: "404" } };
              },
              remove: (names) =>
                result(async () => {
                  assert.equal(names.length, 1);
                  const rows = await sql(
                    role,
                    user?.id,
                    "delete from storage.objects where bucket_id=$1 and name=$2 returning id,name",
                    [bucket, names[0]],
                  );
                  bytes.delete(names[0]);
                  return rows;
                }),
            };
          },
        },
      };
      return client;
    }
    const inventory = (manifest) =>
      readDemoInventory(manifest, async (query) =>
        sql("postgres", null, query),
      );
    async function execute(args) {
      const context = vm.createContext({
        URL,
        Buffer,
        console: { log() {} },
        process: {
          env: {
            NEXT_PUBLIC_SUPABASE_URL: url,
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-public",
            SUPABASE_SERVICE_ROLE_KEY: "test-service",
          },
          argv: ["node", "seed.mjs", ...args],
          exit(code) {
            throw Object.assign(Error("seed exit"), { exitCode: code });
          },
        },
      });
      const deps = {
        "node:fs": {
          default: {
            existsSync: (file) => files.has(file),
            mkdirSync() {},
            readFileSync: (file) => {
              assert.ok(files.has(file));
              return files.get(file);
            },
            writeFileSync: (file, text) => files.set(file, text),
          },
        },
        "node:crypto": { randomUUID, randomBytes },
        "@supabase/supabase-js": { createClient },
        "./team.mjs": { ensureDemoTeam },
        "./research-fixture.mjs": { createResearchFixture },
        "./assets.mjs": { ensureDemoAsset, cleanupDemoAssets },
        "./organization-identity.mjs": { verifyDemoOrganization },
        "./inventory.mjs": { canonicalInventory, readDemoInventory: inventory },
      };
      const source = new vm.SourceTextModule(
        fs.readFileSync(new URL("./seed.mjs", import.meta.url), "utf8"),
        { context },
      );
      await source.link((name) => {
        assert.ok(deps[name], name);
        return new vm.SyntheticModule(
          Object.keys(deps[name]),
          function () {
            for (const [k, v] of Object.entries(deps[name]))
              this.setExport(k, v);
          },
          { context },
        );
      });
      try {
        await source.evaluate();
      } catch (error) {
        if (args.includes("--cleanup") && error.exitCode === 0) return;
        throw Error(
          `${error.message}; ${files.get(".release-qa/demo-error.json") ?? ""}`,
          { cause: error },
        );
      }
    }
    try {
      await db.exec(fs.readFileSync("scripts/database/bootstrap.sql", "utf8"));
      for (const file of fs
        .readdirSync("supabase/migrations")
        .filter((f) => f.endsWith(".sql"))
        .sort())
        await db.exec(fs.readFileSync("supabase/migrations/" + file, "utf8"));
      // A pre-existing control tenant is created through the same product contract.
      const controlAdmin = createClient(url, "test-service"),
        control = createClient(url, "test-public");
      const auth = await controlAdmin.auth.admin.createUser({
        email: "control@example.test",
        password: "test-only",
        user_metadata: {},
      });
      assert.equal(auth.error, null);
      await control.auth.signInWithPassword({
        email: "control@example.test",
        password: "test-only",
      });
      const controlOrg = await control.rpc("create_organization", {
        p_name: "Preserved control",
      });
      assert.equal(controlOrg.error, null);
      const controlManifest = {
        organizationId: controlOrg.data.id,
        users: [{ id: auth.data.user.id }],
      };
      const before = await inventory(controlManifest);
      for (let round = 0; round < 2; round++) {
        await execute(["--confirm-demo-memory"]);
        const manifest = JSON.parse(files.get(".release-qa/demo.json"));
        assert.equal(manifest.state, "ready");
        assert.equal(manifest.teamReady, true);
        assert.ok(manifest.ids.memory);
        assert.ok(manifest.assets[0].storageId);
        assert.equal(accounts.size, 4);
        assert.equal(
          (
            await sql(
              "postgres",
              null,
              "select count(*)::int n from public.ai_runs where organization_id=$1",
              [manifest.organizationId],
            )
          )[0].n,
          0,
        );
        await execute(["--cleanup"]);
        assert.equal(
          JSON.parse(files.get(".release-qa/demo.json")).state,
          "cleaned",
        );
        assert.ok(
          (await inventory(manifest)).every(
            (table) => table.records.length === 0,
          ),
        );
        assert.equal(accounts.size, 1);
        assert.equal(bytes.size, 0);
        assert.deepEqual(await inventory(controlManifest), before);
        files.delete(".release-qa/demo.json");
      }
      assert.ok(
        !calls.some(
          ([role, name]) =>
            role === "service_role" && /^(select|insert):/.test(name),
        ),
        "No service application table access",
      );
      assert.equal(
        calls.filter(([, name]) => name === "accept_organization_invitation")
          .length,
        4,
      );
    } finally {
      await db.close();
    }
  },
);
