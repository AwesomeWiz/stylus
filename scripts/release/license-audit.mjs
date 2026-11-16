import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const lock = JSON.parse(await fs.readFile("package-lock.json", "utf8"));
const allowed = new Set([
  "MIT",
  "ISC",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "MIT-0",
  "BlueOak-1.0.0",
  "CC0-1.0",
  "Python-2.0",
  "CC-BY-4.0",
  "MPL-2.0",
  "LGPL-3.0-or-later",
  "Apache-2.0 AND LGPL-3.0-or-later AND MIT",
  "Apache-2.0 AND LGPL-3.0-or-later",
]);
const dependencies = Object.entries(lock.packages)
  .filter(([name, value]) => name.includes("node_modules/") && !value.link)
  .map(([location, value]) => ({
    location,
    version: value.version,
    license: value.license ?? "UNKNOWN",
    dev: value.dev ?? false,
    devOptional: value.devOptional ?? false,
    optional: value.optional ?? false,
    integrity: value.integrity,
  }));
const review = dependencies.filter((item) => !allowed.has(item.license));
if (review.length)
  throw Error(
    "Unreviewed dependency license: " +
      review.map((item) => item.location + " " + item.license).join(", "),
  );
const manifest = JSON.parse(
  await fs.readFile("apps/web/public/fonts/boards/sources.json", "utf8"),
);
const fontFiles = [];
async function fonts(folder) {
  const entries = await fs.readdir(folder, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const item of entries) {
    const file = path.join(folder, item.name);
    if (item.isDirectory()) await fonts(file);
    else if (/\.woff2$/.test(file)) {
      const bytes = await fs.readFile(file);
      fontFiles.push({
        file: file.replaceAll("\\", "/"),
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        license: "OFL-1.1",
      });
    }
  }
}
await fonts("apps/web/public/fonts");
for (const font of manifest.fonts) {
  const actual = fontFiles.find((item) =>
    item.file.endsWith("/boards/" + font.file),
  );
  if (!actual || actual.sha256 !== font.sha256 || actual.bytes !== font.bytes)
    throw Error("Font differs from upstream manifest: " + font.file);
}
const notices = (await fs.readdir("apps/web/public/fonts/boards")).filter(
  (file) => file.endsWith("-OFL.txt"),
);
for (const file of [
  ...notices.map((name) => "apps/web/public/fonts/boards/" + name),
  "apps/web/public/fonts/geist/LICENSE.txt",
]) {
  if (!(await fs.readFile(file, "utf8")).includes("SIL OPEN FONT LICENSE"))
    throw Error("Font notice missing: " + file);
}
// Exact upstream hashes/URLs and each family's license are independently checked
// by the permanent font-library tests. Keep an inventory of every shipped binary.
const report = {
  lockSha256: createHash("sha256")
    .update(await fs.readFile("package-lock.json"))
    .digest("hex"),
  dependencies,
  fonts: fontFiles,
  fontSourceManifest: "apps/web/public/fonts/boards/sources.json",
  fontFamilies: notices.length + 1,
};
await fs.mkdir("docs/licenses", { recursive: true });
const output = JSON.stringify(report, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if ((await fs.readFile("docs/licenses/dependencies.json", "utf8")) !== output)
    throw Error("License inventory is stale; run npm run audit:licenses");
} else await fs.writeFile("docs/licenses/dependencies.json", output);
console.log(
  `${dependencies.length} dependency entries, ${fontFiles.length} font binaries; all license expressions reviewed`,
);
