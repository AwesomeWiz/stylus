import fs from "node:fs";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

const publicDocs = [
  "README.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "SUPPORT.md",
  "CODE_OF_CONDUCT.md",
  "TRADEMARKS.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ...[
    "README",
    "SELF_HOSTING",
    "DEVELOPMENT",
    "ARCHITECTURE_OVERVIEW",
    "DEMO",
    "THIRD_PARTY",
    "ASSET_PROVENANCE",
    "PRIVACY",
    "RELEASE_NOTES",
    "RELEASE_AUDIT",
    "RELEASE_CHECKLIST",
    "MEDIA",
    "RLS_REVIEW",
  ].map((name) => `docs/${name}.md`),
];
const format = spawnSync(
  process.execPath,
  [
    "node_modules/prettier/bin/prettier.cjs",
    process.argv.includes("--write") ? "--write" : "--check",
    "--ignore-path",
    ".gitignore",
    ...publicDocs,
  ],
  { encoding: "utf8", windowsHide: true },
);
if (format.status !== 0) {
  console.error(format.stdout + format.stderr);
  process.exit(1);
}
// Check every repository Markdown relative target, including retained engineering
// records. External URLs are reviewed separately; private-repo URLs can require auth.
const files = execFileSync(
  "git",
  [
    "-c",
    "safe.directory=" + process.cwd(),
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ],
  { encoding: "utf8" },
)
  .split("\0")
  .filter((file) => file.endsWith(".md"));
const broken = [];
let count = 0;
for (const file of files) {
  for (const match of fs
    .readFileSync(file, "utf8")
    .matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, "").split(/\s+"/)[0];
    if (/^(?:https?:|mailto:|#)/.test(target)) continue;
    const clean = decodeURIComponent(target.split(/[?#]/)[0]);
    if (clean && !fs.existsSync(path.resolve(path.dirname(file), clean)))
      broken.push({ file, target: clean });
    count++;
  }
}
if (broken.length) {
  console.error(JSON.stringify(broken, null, 2));
  process.exit(1);
}
console.log(`Public Markdown formatting and ${count} relative links pass.`);
