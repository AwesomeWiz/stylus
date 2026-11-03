import { existsSync } from "node:fs";
for (const file of [".env.local", "apps/web/.env.local"])
  if (existsSync(file)) process.loadEnvFile(file);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Board schema diagnostic requires the configured Supabase URL and service-role key in local environment configuration.",
  );
  process.exit(1);
}
const response = await fetch(new URL("/rest/v1/", url), {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!response.ok) {
  console.error("Board schema diagnostic could not authenticate.");
  process.exit(1);
}
const schema = await response.json(),
  columns = schema.definitions ?? {},
  paths = schema.paths ?? {};
const missing = [
  ...["template_key"]
    .filter((c) => !columns.boards?.properties?.[c])
    .map((c) => "boards." + c),
  ...["parent_id", "locked"]
    .filter((c) => !columns.board_elements?.properties?.[c])
    .map((c) => "board_elements." + c),
  ...["apply_board_operation", "create_board_from_template"].filter(
    (r) => !paths["/rpc/" + r],
  ),
];
console.log({
  project: new URL(url).hostname,
  compatible: missing.length === 0,
  missing,
});
if (missing.length) {
  console.error(
    "Board persistence schema is out of date. Inspect the linked migration ledger and reviewed forward migration plan.",
  );
  process.exitCode = 1;
}
