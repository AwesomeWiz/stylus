import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  requireObject,
  requireRows,
  requireSingleRow,
  requireUuid,
} from "./responses.mjs";

export function decodeLocalQueryResult(result, label) {
  requireObject(result, `query process ${label}`);
  if (result.error || result.signal || result.status !== 0)
    throw Error(
      `STOP: local inventory query ${label} failed (${result.error?.code ?? result.status ?? "signal"}); inspect its private query log`,
    );
  if (typeof result.stdout !== "string" || !result.stdout.trim())
    throw Error(`STOP: local inventory query ${label} returned no JSON`);
  let payload;
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    throw Error(`STOP: local inventory query ${label} returned invalid JSON`);
  }
  if (Array.isArray(payload)) return requireRows(payload, `query ${label}`);
  requireObject(payload, `query ${label}`);
  if (payload.error || payload.errors || payload._tag)
    throw Error(
      `STOP: local inventory query ${label} returned an error response`,
    );
  // Pinned CLI: --agent no emits rows directly; --agent yes wraps the same rows
  // with warning/boundary. Never default an unknown response to an empty array.
  if (
    typeof payload.warning !== "string" ||
    typeof payload.boundary !== "string" ||
    !payload.boundary
  )
    throw Error(
      `STOP: local inventory query ${label} returned an unknown response shape`,
    );
  return requireRows(payload.rows, `query ${label}`);
}
export function readLocalDemoRows(sql, name, execute = spawnSync) {
  if (
    !/^select\b/i.test(sql.trimStart()) ||
    /\b(insert|update|delete|truncate|drop|alter|grant|revoke)\b/i.test(sql) ||
    !/^[a-z0-9-]+$/.test(name)
  )
    throw Error("Demo inspection accepts local read-only queries only");
  fs.mkdirSync(".release-qa", { recursive: true });
  const file = path.resolve(".release-qa/" + name + ".sql");
  fs.writeFileSync(file, sql, { mode: 0o600 });
  const result = execute(
    process.execPath,
    [
      "node_modules/supabase/dist/supabase.js",
      "db",
      "query",
      "--local",
      "--file",
      file,
      "--output-format",
      "json",
      "--agent",
      "no",
    ],
    { encoding: "utf8", windowsHide: true, timeout: 60000, input: "" },
  );
  fs.writeFileSync(
    ".release-qa/" + name + ".log",
    JSON.stringify({
      status: result?.status,
      signal: result?.signal,
      error: result?.error?.code,
      stdout: result?.stdout,
      stderr: result?.stderr,
    }),
    {
      mode: 0o600,
    },
  );
  return decodeLocalQueryResult(result, name);
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, canonicalValue(child)]),
    );
  return value;
}
export function canonicalInventory(rows) {
  return requireRows(rows, "recorded inventory")
    .map((table) => ({
      ...table,
      records: requireRows(table.records, "recorded inventory records")
        .map((record) => {
          requireObject(record.keys, "recorded inventory key");
          return canonicalValue(record);
        })
        .sort((a, b) =>
          JSON.stringify(a.keys).localeCompare(JSON.stringify(b.keys)),
        ),
    }))
    .map(canonicalValue)
    .sort((a, b) => a.table_name.localeCompare(b.table_name));
}

/** Schema inspection plus exact newly-created-org rows only; no existing tenant inventory. */
export async function readDemoInventory(manifest, query = readLocalDemoRows) {
  requireObject(manifest, "inventory manifest");
  const org = requireUuid(manifest.organizationId, "inventory organization");
  if (
    !Array.isArray(manifest.users) ||
    !manifest.users.length ||
    manifest.users.length > 3
  )
    throw Error("Unexpected demo identity scope");
  const actors = new Set(
    manifest.users.map((user) =>
      requireUuid(
        requireObject(user, "inventory account").id,
        "inventory account ID",
      ),
    ),
  );
  if (actors.size !== manifest.users.length)
    throw Error("STOP: duplicate inventory accounts");
  const schemaRow = requireSingleRow(
    await query(
      `select json_agg(t order by table_name) as tables from (
    select c.relname as table_name,array(select a.attname from pg_index i cross join lateral unnest(i.indkey) with ordinality k(attnum,position) join pg_attribute a on a.attrelid=c.oid and a.attnum=k.attnum where i.indrelid=c.oid and i.indisprimary order by k.position) as primary_key
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and (c.relname='organizations' or exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='organization_id' and not a.attisdropped))
  ) t;`,
      "demo-inventory-schema",
    ),
    "inventory catalog",
  );
  const schema = schemaRow.tables;
  if (!Array.isArray(schema) || !schema.length)
    throw Error("Demo schema inventory unavailable");
  const selects = schema.map((table) => {
    requireObject(table, "inventory catalog entry");
    if (
      !/^[a-z_]+$/.test(table.table_name) ||
      typeof table.table_name !== "string" ||
      !Array.isArray(table.primary_key) ||
      !table.primary_key.length ||
      new Set(table.primary_key).size !== table.primary_key.length ||
      table.primary_key.some(
        (key) => typeof key !== "string" || !/^[a-z_]+$/.test(key),
      )
    )
      throw Error("Unexpected schema identity");
    const pairs = table.primary_key
      .map((key) => "'" + key + "',to_jsonb(t)->'" + key + "'")
      .join(",");
    return `select '${table.table_name}' as table_name,coalesce(jsonb_agg(jsonb_build_object('keys',jsonb_build_object(${pairs}),'creator',to_jsonb(t)->'created_by','actor',to_jsonb(t)->'actor_id')),'[]'::jsonb) as records from public.${table.table_name} t where ${table.table_name === "organizations" ? "id" : "organization_id"}='${org}'`;
  });
  const names = schema.map((table) => table.table_name);
  if (
    new Set(names).size !== names.length ||
    !names.includes("organizations") ||
    !names.includes("memberships")
  )
    throw Error("STOP: incomplete or duplicate inventory catalog");
  const rows = requireRows(
    await query(
      "select * from (" +
        selects.join(" union all ") +
        ") inventory order by table_name;",
      "demo-owned-inventory",
    ),
    "tenant inventory",
  );
  if (
    rows.length !== schema.length ||
    new Set(rows.map((row) => row.table_name)).size !== schema.length
  )
    throw Error("STOP: incomplete or duplicate tenant inventory");
  for (const table of rows) {
    const definition = schema.find(
      (entry) => entry.table_name === table.table_name,
    );
    if (!definition) throw Error("STOP: unexpected inventory table");
    const identities = new Set();
    for (const row of requireRows(
      table.records,
      `inventory records ${table.table_name}`,
    )) {
      requireObject(row.keys, "inventory primary key");
      if (
        Object.keys(row.keys).sort().join(",") !==
          [...definition.primary_key].sort().join(",") ||
        Object.values(row.keys).some(
          (value) =>
            value === null ||
            !["string", "number", "boolean"].includes(typeof value) ||
            value === "",
        )
      )
        throw Error("STOP: incomplete inventory primary key");
      if (!Object.hasOwn(row, "creator") || !Object.hasOwn(row, "actor"))
        throw Error("STOP: incomplete inventory provenance");
      if (
        (Object.hasOwn(row.keys, "organization_id") &&
          row.keys.organization_id !== org) ||
        (table.table_name === "organizations" && row.keys.id !== org)
      )
        throw Error("STOP: foreign inventory identity");
      const identity = JSON.stringify(canonicalValue(row.keys));
      if (identities.has(identity))
        throw Error("STOP: duplicate inventory primary key");
      identities.add(identity);
      if (
        (row.creator !== null && !actors.has(row.creator)) ||
        (row.actor !== null && !actors.has(row.actor))
      )
        throw Error("STOP: unexpected actor in exact demo scope");
    }
  }
  return canonicalInventory(rows);
}
