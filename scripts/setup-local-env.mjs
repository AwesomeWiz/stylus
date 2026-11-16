import fs from "node:fs";
import { spawnSync } from "node:child_process";

const target = "apps/web/.env.local";
if (fs.existsSync(target))
  throw Error(
    "Environment file already exists; preserve it and configure manually",
  );
// status is local-only. No login, link, migration, reset or hosted URL is used.
const result = spawnSync(
  process.execPath,
  ["node_modules/supabase/dist/supabase.js", "status", "--output", "env"],
  { encoding: "utf8", windowsHide: true },
);
if (result.status !== 0)
  throw Error(
    "Start the local Supabase stack first. No environment file was written.",
  );
const values = Object.fromEntries(
  [...result.stdout.matchAll(/^([A-Z_]+)="([^"]*)"$/gm)].map((match) => [
    match[1],
    match[2],
  ]),
);
const api = values.API_URL;
if (
  !api ||
  !["127.0.0.1", "localhost", "[::1]"].includes(new URL(api).hostname)
)
  throw Error("Refusing non-local backend configuration");
const key = values.PUBLISHABLE_KEY || values.ANON_KEY;
if (!key || !values.SERVICE_ROLE_KEY)
  throw Error("Local Supabase credentials are incomplete");
fs.writeFileSync(
  target,
  `NEXT_PUBLIC_SUPABASE_URL=${api}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}\nNEXT_PUBLIC_SITE_URL=http://localhost:3000\nSUPABASE_SERVICE_ROLE_KEY=${values.SERVICE_ROLE_KEY}\n`,
  { flag: "wx", mode: 0o600 },
);
console.log(
  "Created ignored apps/web/.env.local for the local stack. No optional provider is configured; no credentials printed.",
);
