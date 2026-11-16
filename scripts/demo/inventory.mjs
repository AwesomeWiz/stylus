import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export function readLocalDemoRows(sql, name) {
  if (
    !/^select\b/i.test(sql.trimStart()) ||
    /\b(insert|update|delete|truncate|drop|alter|grant|revoke)\b/i.test(sql) ||
    !/^[a-z0-9-]+$/.test(name)
  )
    throw Error("Demo inspection accepts local read-only queries only");
  const file = path.resolve(".release-qa/" + name + ".sql");
  fs.writeFileSync(file, sql, { mode: 0o600 });
  const result = spawnSync(
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
    ],
    { encoding: "utf8", windowsHide: true, timeout: 60000, input: "" },
  );
  fs.writeFileSync(".release-qa/" + name + ".log", result.stderr ?? "", {
    mode: 0o600,
  });
  if (result.status !== 0)
    throw Error(
      "Scoped demo inventory failed; inspect ignored log, do not continue cleanup",
    );
  return JSON.parse(result.stdout).rows;
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
  return rows
    .map((table) => ({
      ...table,
      records: table.records
        .map(canonicalValue)
        .sort((a, b) =>
          JSON.stringify(a.keys).localeCompare(JSON.stringify(b.keys)),
        ),
    }))
    .map(canonicalValue)
    .sort((a, b) => a.table_name.localeCompare(b.table_name));
}

/** Schema inspection plus exact newly-created-org rows only; no existing tenant inventory. */
export async function readDemoInventory(manifest, query = readLocalDemoRows) {
  const org = manifest.organizationId;
  if (
    !/^[0-9a-f-]{36}$/i.test(org) ||
    !manifest.users.length ||
    manifest.users.length > 3
  )
    throw Error("Unexpected demo identity scope");
  const schema = (
    await query(
      `select json_agg(t order by table_name) as tables from (
    select c.relname as table_name,array(select a.attname from pg_index i cross join lateral unnest(i.indkey) with ordinality k(attnum,position) join pg_attribute a on a.attrelid=c.oid and a.attnum=k.attnum where i.indrelid=c.oid and i.indisprimary order by k.position) as primary_key
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and (c.relname='organizations' or exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='organization_id' and not a.attisdropped))
  ) t;`,
      "demo-inventory-schema",
    )
  )[0]?.tables;
  if (!Array.isArray(schema) || !schema.length)
    throw Error("Demo schema inventory unavailable");
  const selects = schema.map((table) => {
    if (
      !/^[a-z_]+$/.test(table.table_name) ||
      !table.primary_key.length ||
      table.primary_key.some((key) => !/^[a-z_]+$/.test(key))
    )
      throw Error("Unexpected schema identity");
    const pairs = table.primary_key
      .map((key) => "'" + key + "',to_jsonb(t)->'" + key + "'")
      .join(",");
    return `select '${table.table_name}' as table_name,coalesce(jsonb_agg(jsonb_build_object('keys',jsonb_build_object(${pairs}),'creator',to_jsonb(t)->'created_by','actor',to_jsonb(t)->'actor_id')),'[]'::jsonb) as records from public.${table.table_name} t where ${table.table_name === "organizations" ? "id" : "organization_id"}='${org}'`;
  });
  const rows = await query(
    "select * from (" +
      selects.join(" union all ") +
      ") inventory order by table_name;",
    "demo-owned-inventory",
  );
  const actors = new Set(manifest.users.map((user) => user.id));
  for (const table of rows)
    for (const row of table.records)
      if (
        (row.creator && !actors.has(row.creator)) ||
        (row.actor && !actors.has(row.actor))
      )
        throw Error("STOP: unexpected actor in exact demo scope");
  return canonicalInventory(rows);
}
