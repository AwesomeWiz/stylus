import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import vm from "node:vm";
import { EventEmitter } from "node:events";
import { randomUUID, randomBytes } from "node:crypto";
import { createClient as createSdkClient } from "@supabase/supabase-js";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { pgtap } from "@electric-sql/pglite-pgtap";
import { ensureDemoTeam } from "./team.mjs";
import { createResearchFixture } from "./research-fixture.mjs";
import { ensureDemoAsset, cleanupDemoAssets } from "./assets.mjs";
import { verifyDemoOrganization } from "./organization-identity.mjs";
import {
  canonicalInventory,
  readDemoInventory,
  decodeLocalQueryResult,
} from "./inventory.mjs";
import * as responses from "./responses.mjs";
import * as verification from "./verification.mjs";
import {
  assertLoopback,
  assertNoProviders,
} from "../release/ci-local-database.mjs";
import {
  controlSnapshotSql,
  seedVerificationSql,
  assertSeedCounts,
  assertFixtureInventory,
} from "./verification.mjs";
import { sanitizeStartupLog } from "../release/supabase-start-log.mjs";

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
      // Exercise installed Auth/Storage SDK transformations, rather than
      // fabricating SDK result objects. HTTP is wholly synthetic and fenced.
      const json = (value, status = 200) =>
        new Response(JSON.stringify(value), {
          status,
          headers: {
            "content-type": "application/json",
            "x-supabase-api-version": "2024-01-01",
          },
        });
      const publicUser = (record) => ({
        id: record.id,
        aud: "authenticated",
        role: "authenticated",
        email: record.email,
        user_metadata: record.user_metadata ?? {},
        app_metadata: { provider: "email", providers: ["email"] },
        created_at: "2026-01-01T00:00:00Z",
      });
      const sdk = createSdkClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          fetch: async (input, init) => {
            const request = new Request(input, init),
              target = new URL(request.url);
            assert.equal(
              target.origin,
              url,
              "No network request may escape the synthetic transport",
            );
            const route = decodeURIComponent(target.pathname),
              method = request.method;
            if (route === "/auth/v1/admin/users" && method === "POST") {
              assert.equal(role, "service_role");
              const input = await request.json(),
                record = { id: randomUUID(), ...input };
              await sql(
                "postgres",
                null,
                "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
                [record.id, record.email, JSON.stringify(record.user_metadata)],
              );
              accounts.set(record.id, record);
              return json(publicUser(record));
            }
            if (route.startsWith("/auth/v1/admin/users/")) {
              assert.equal(role, "service_role");
              const id = route.split("/").at(-1),
                record = accounts.get(id);
              if (!record)
                return json(
                  { code: "user_not_found", msg: "User not found" },
                  404,
                );
              if (method === "DELETE") {
                await sql(
                  "postgres",
                  null,
                  "delete from auth.users where id=$1",
                  [id],
                );
                accounts.delete(id);
              } else assert.equal(method, "GET");
              return json(publicUser(record));
            }
            if (route === "/auth/v1/token") {
              const credentials = await request.json();
              user = [...accounts.values()].find(
                (u) =>
                  u.email === credentials.email &&
                  u.password === credentials.password,
              );
              assert.ok(user);
              const token = [
                Buffer.from(
                  JSON.stringify({ alg: "HS256", typ: "JWT" }),
                ).toString("base64url"),
                Buffer.from(
                  JSON.stringify({
                    sub: user.id,
                    role: "authenticated",
                    exp: Math.floor(Date.now() / 1000) + 3600,
                  }),
                ).toString("base64url"),
                "synthetic-signature",
              ].join(".");
              return json({
                access_token: token,
                token_type: "bearer",
                expires_in: 3600,
                refresh_token: randomUUID(),
                user: publicUser(user),
              });
            }
            if (route === "/auth/v1/user") {
              assert.ok(user);
              return json(publicUser(user));
            }
            if (route === "/auth/v1/logout") {
              assert.equal(method, "POST");
              user = null;
              return new Response(null, { status: 204 });
            }
            if (route.startsWith("/storage/v1/object/")) {
              assert.ok(user);
              assert.equal(role, "authenticated");
              const rest = route.slice("/storage/v1/object/".length);
              const prefix = rest.startsWith("info/")
                ? "info/"
                : rest.startsWith("authenticated/")
                  ? "authenticated/"
                  : "";
              const resource = rest.slice(prefix.length),
                bucket = resource.split("/")[0],
                name = resource.slice(bucket.length + 1);
              assert.equal(bucket, "board-images");
              if (method === "DELETE") {
                const body = await request.json();
                assert.equal(body.prefixes.length, 1);
                const rows = await sql(
                  role,
                  user.id,
                  "delete from storage.objects where bucket_id=$1 and name=$2 returning id,name",
                  [bucket, body.prefixes[0]],
                );
                bytes.delete(body.prefixes[0]);
                return json(rows);
              }
              if (method === "POST") {
                const id = randomUUID();
                await sql(
                  role,
                  user.id,
                  "insert into storage.objects(id,bucket_id,name,owner_id) values($1,$2,$3,$4)",
                  [id, bucket, name, user.id],
                );
                bytes.set(name, Buffer.from(await request.arrayBuffer()));
                return json({ Id: id, Key: bucket + "/" + name });
              }
              assert.equal(method, "GET");
              const row = (
                await sql(
                  role,
                  user.id,
                  "select id,name,bucket_id,owner_id from storage.objects where bucket_id=$1 and name=$2",
                  [bucket, name],
                )
              )[0];
              if (!row)
                return json(
                  {
                    statusCode: "404",
                    error: "not_found",
                    message: "Object not found",
                  },
                  404,
                );
              return prefix === "info/"
                ? json(row)
                : new Response(bytes.get(name), {
                    headers: { "content-type": "image/png" },
                  });
            }
            throw Error(`Unexpected synthetic SDK endpoint ${method} ${route}`);
          },
        },
      });
      const client = {
        auth: sdk.auth,
        storage: sdk.storage,
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
            updating,
            filters = [],
            single = false,
            optional = false;
          const builder = {
            insert(value) {
              insertion = value;
              return builder;
            },
            update(value) {
              updating = value;
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
            in(key, value) {
              filters.push([key, value, "in"]);
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
                const params = updating ? Object.values(updating) : [],
                  clauses = filters.map(([k, v, kind]) => {
                    params.push(v);
                    return kind === "in"
                      ? `${quote(k)}=any($${params.length}::uuid[])`
                      : `${quote(k)}=$${params.length}`;
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
                if (updating)
                  query = `update public.${quote(table)} set ${Object.keys(
                    updating,
                  )
                    .map((key, i) => `${quote(key)}=$${i + 1}`)
                    .join(
                      ",",
                    )} where ${clauses.join(" and ")} returning ${projection}`;
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
      };
      return client;
    }
    let agentEnvelope = false;
    const localRead = async (query) => {
      const rows = await sql("postgres", null, query);
      return decodeLocalQueryResult(
        {
          status: 0,
          stdout: JSON.stringify(
            agentEnvelope
              ? {
                  rows,
                  boundary: "fixture",
                  warning: "Untrusted database data",
                }
              : rows,
          ),
        },
        "contract query",
      );
    };
    const inventory = (manifest) => readDemoInventory(manifest, localRead);
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
        "./responses.mjs": responses,
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
    async function executeRoundtrip(phase, authSmoke = false) {
      const context = vm.createContext({
        URL,
        Buffer,
        structuredClone,
        console: { log() {} },
        process: {
          env: { CIRCLECI: "true" },
          execPath: process.execPath,
          argv: ["node", "roundtrip.mjs", phase],
          loadEnvFile() {
            Object.assign(this.env, {
              NEXT_PUBLIC_SUPABASE_URL: url,
              NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
                "sb_publishable_test_contract",
              SUPABASE_SERVICE_ROLE_KEY: "test-service",
            });
          },
        },
      });
      const deps = {
        "node:fs": {
          default: {
            existsSync: (file) => files.has(file),
            readFileSync: (file) => {
              assert.ok(files.has(file), file);
              return files.get(file);
            },
            writeFileSync: (file, text) => files.set(file, text),
            renameSync: (from, to) => {
              assert.ok(files.has(from));
              assert.ok(!files.has(to));
              files.set(to, files.get(from));
              files.delete(from);
            },
          },
        },
        // Normalize only VM-realm prototypes; the full values/keys still compare.
        "node:assert/strict": {
          default: {
            ...assert,
            deepEqual: (a, b, message) =>
              assert.deepEqual(
                JSON.parse(JSON.stringify(a)),
                JSON.parse(JSON.stringify(b)),
                message,
              ),
          },
        },
        "node:crypto": { randomBytes, randomUUID },
        "node:path": { default: path },
        "node:url": { pathToFileURL },
        "node:child_process": {
          spawn(_exe, args, options) {
            assert.equal(args[0], "scripts/demo/seed.mjs");
            assert.equal(options.env.NEXT_PUBLIC_SUPABASE_URL, undefined);
            const child = new EventEmitter();
            Promise.resolve()
              .then(() => execute(args.slice(1)))
              .then(
                () => child.emit("close", 0, null),
                (error) => child.emit("error", error),
              );
            return child;
          },
        },
        "@supabase/supabase-js": { createClient },
        "../release/ci-local-database.mjs": {
          assertLoopback,
          assertNoProviders,
        },
        "./ci-local-database.mjs": { assertLoopback, assertNoProviders },
        "./supabase-start-log.mjs": { sanitizeStartupLog },
        "./inventory.mjs": {
          canonicalInventory,
          readDemoInventory: inventory,
          readLocalDemoRows: localRead,
        },
        "./assets.mjs": {
          verifyDemoAssets: (await import("./assets.mjs")).verifyDemoAssets,
        },
        "./verification.mjs": verification,
        "./responses.mjs": responses,
        "../demo/responses.mjs": responses,
      };
      const source = new vm.SourceTextModule(
        fs.readFileSync(
          new URL(
            authSmoke ? "../release/ci-auth-smoke.mjs" : "./roundtrip.mjs",
            import.meta.url,
          ),
          "utf8",
        ),
        { context },
      );
      await source.link((name) => {
        assert.ok(deps[name], name);
        return new vm.SyntheticModule(
          Object.keys(deps[name]),
          function () {
            for (const [key, value] of Object.entries(deps[name]))
              this.setExport(key, value);
          },
          { context },
        );
      });
      await source.evaluate();
      if (authSmoke) await source.namespace.runAuthSmoke();
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
      const controlNote = randomUUID();
      assert.equal(
        (
          await control.rpc("save_core_note", {
            p_organization_id: controlManifest.organizationId,
            p_id: controlNote,
            p_title: "Preserved content",
            p_content: "Preserve this exact pre-existing control content.",
            p_archived: false,
            p_expected_updated_at: null,
          })
        ).error,
        null,
      );
      const controlQuery = controlSnapshotSql({
        organizationId: controlManifest.organizationId,
        noteId: controlNote,
        user: { id: auth.data.user.id },
      });
      const controlData = await sql("postgres", null, controlQuery);
      assert.equal(controlData[0].note.id, controlNote);
      const controlInventory = await inventory(controlManifest);
      for (let round = 0; round < 2; round++) {
        await execute(["--confirm-demo-memory"]);
        const manifest = JSON.parse(files.get(".release-qa/demo.json"));
        assert.equal(manifest.state, "ready");
        assert.equal(manifest.teamReady, true);
        assert.ok(manifest.ids.memory);
        assert.ok(manifest.assets[0].storageId);
        assertSeedCounts(
          (await sql("postgres", null, seedVerificationSql(manifest)))[0],
        );
        assertFixtureInventory(manifest, await inventory(manifest));
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
        assert.deepEqual(await inventory(controlManifest), controlInventory);
        assert.deepEqual(
          await sql("postgres", null, controlQuery),
          controlData,
        );
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
      // Exercise the actual controller, CLI response decoder, both complete seed
      // rounds, its smoke-inventory extension and final control/global absence.
      agentEnvelope = true;
      await executeRoundtrip("prepare");
      const prepared = JSON.parse(files.get(".release-qa/demo-roundtrip.json"));
      assert.equal(prepared.state, "prepared");
      assert.equal(prepared.rounds.length, 2);
      const demo = JSON.parse(files.get(".release-qa/demo.json"));
      await executeRoundtrip("auth", true);
      assert.equal(
        JSON.parse(files.get(".release-qa/auth-smoke.json")).taskIds.length,
        2,
      );
      const malformed = structuredClone(prepared);
      delete malformed.controlSnapshot.assets;
      files.set(".release-qa/demo-roundtrip.json", JSON.stringify(malformed));
      const identitiesBefore = [...accounts.keys()];
      await assert.rejects(executeRoundtrip("cleanup"), /asset inventory/);
      assert.deepEqual([...accounts.keys()], identitiesBefore);
      assert.equal(bytes.size, 1);
      files.set(".release-qa/demo-roundtrip.json", JSON.stringify(prepared));
      const changed = structuredClone(prepared);
      changed.controlSnapshot.data.note.content = "Unexpected baseline content";
      files.set(".release-qa/demo-roundtrip.json", JSON.stringify(changed));
      await assert.rejects(
        executeRoundtrip("cleanup"),
        /changed before cleanup/,
      );
      assert.deepEqual([...accounts.keys()], identitiesBefore);
      assert.equal(bytes.size, 1);
      files.set(".release-qa/demo-roundtrip.json", JSON.stringify(prepared));
      await executeRoundtrip("cleanup");
      assert.equal(
        JSON.parse(files.get(".release-qa/demo-roundtrip.json")).state,
        "cleaned",
      );
      assert.equal(accounts.size, 1);
      assert.equal(bytes.size, 0);
      assert.deepEqual(await inventory(controlManifest), controlInventory);
    } finally {
      await db.close();
    }
  },
);
