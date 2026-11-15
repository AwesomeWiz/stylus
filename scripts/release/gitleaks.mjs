import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const version = "8.30.1";
const platform =
  process.platform === "win32"
    ? "windows"
    : process.platform === "linux"
      ? "linux"
      : null;
if (!platform || process.arch !== "x64")
  throw Error(
    "Install Gitleaks 8.30.1 manually on this platform; automatic download supports Linux/Windows x64",
  );
const folder = path.resolve(".release-qa/tools/gitleaks");
await fs.mkdir(folder, { recursive: true });
const executable = path.join(
  folder,
  platform === "windows" ? "gitleaks.exe" : "gitleaks",
);
try {
  await fs.access(executable);
} catch {
  const name = `gitleaks_${version}_${platform}_x64.${platform === "windows" ? "zip" : "tar.gz"}`;
  const base = `https://github.com/gitleaks/gitleaks/releases/download/v${version}/`;
  const checks = await fetch(base + `gitleaks_${version}_checksums.txt`);
  if (!checks.ok) throw Error("Gitleaks checksum download failed");
  const expected = (await checks.text())
    .split("\n")
    .find((line) => line.endsWith(name))
    ?.split(/\s+/)[0];
  const response = await fetch(base + name);
  if (!response.ok || !expected) throw Error("Gitleaks release unavailable");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== expected)
    throw Error("Gitleaks checksum mismatch");
  const archive = path.join(folder, name);
  await fs.writeFile(archive, bytes);
  // Extraction stays inside the task-owned tool directory; no installer runs.
  const extraction =
    platform === "windows"
      ? spawnSync(
          "powershell.exe",
          [
            "-NoProfile",
            "-Command",
            "Expand-Archive -LiteralPath $env:STYLUS_GITLEAKS_ARCHIVE -DestinationPath $env:STYLUS_GITLEAKS_FOLDER -Force",
          ],
          {
            stdio: "pipe",
            windowsHide: true,
            env: {
              ...process.env,
              STYLUS_GITLEAKS_ARCHIVE: archive,
              STYLUS_GITLEAKS_FOLDER: folder,
            },
          },
        )
      : spawnSync("tar", ["-xzf", archive, "-C", folder], { stdio: "pipe" });
  if (extraction.status !== 0) throw Error("Gitleaks extraction failed");
}
const actual = spawnSync(executable, ["version"], {
  encoding: "utf8",
  windowsHide: true,
});
if (actual.stdout.trim() !== version)
  throw Error("Unexpected Gitleaks version");
const tree = process.argv.includes("--tree");
let target = ".";
if (tree) {
  // Export only Git-visible candidate files. Ignored dotenv, profiles, browser
  // binaries and raw QA reports cannot enter this scan or a public artifact.
  const listed = spawnSync(
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
    { encoding: "utf8", windowsHide: true },
  );
  if (listed.status !== 0) throw Error("Cannot enumerate candidate files");
  target = await fs.mkdtemp(path.resolve(".release-qa/tree-scan-"));
  for (const file of new Set(listed.stdout.split("\0").filter(Boolean))) {
    const source = path.resolve(file);
    if (!source.startsWith(process.cwd() + path.sep))
      throw Error("Unexpected candidate path");
    let stat;
    try {
      stat = await fs.lstat(source);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    if (!stat.isFile())
      throw Error("Review non-file candidate explicitly: " + file);
    const destination = path.join(target, file);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
  }
}
const scope = tree ? "tree" : "history";
const result = spawnSync(
  executable,
  [
    tree ? "dir" : "git",
    target,
    ...(tree ? [] : ["--log-opts=--all"]),
    "--redact=100",
    "--no-banner",
    "--report-format=json",
    `--report-path=.release-qa/${scope}-secrets.json`,
  ],
  {
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      GIT_CONFIG_COUNT: String(Number(process.env.GIT_CONFIG_COUNT ?? 0) + 1),
      ["GIT_CONFIG_KEY_" + Number(process.env.GIT_CONFIG_COUNT ?? 0)]:
        "safe.directory",
      ["GIT_CONFIG_VALUE_" + Number(process.env.GIT_CONFIG_COUNT ?? 0)]:
        process.cwd(),
    },
  },
);
await fs.writeFile(
  `.release-qa/${scope}-secrets.log`,
  result.stdout + result.stderr,
);
console.log(
  `Gitleaks ${version}: ${tree ? "Git-visible candidate tree" : "all reachable history"}; exit ${result.status}. Findings/logs are redacted in .release-qa.`,
);
process.exitCode = result.status ?? 1;
