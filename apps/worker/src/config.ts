import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface WorkerConfig {
  credential: string;
  name: string;
  organizationId: string;
  stylusUrl: string;
  workerId: string;
}

export function workerConfigPath(environment = process.env) {
  const root =
    environment.LOCALAPPDATA ||
    environment.APPDATA ||
    join(homedir(), ".stylus");
  return join(root, "Stylus", "worker.json");
}

export async function loadConfig(
  path = workerConfigPath(),
): Promise<WorkerConfig> {
  const parsed = JSON.parse(
    await readFile(path, "utf8"),
  ) as Partial<WorkerConfig>;
  if (
    !parsed.credential?.match(/^[0-9a-f]{64}$/) ||
    !parsed.stylusUrl ||
    !parsed.workerId ||
    !parsed.organizationId ||
    !parsed.name
  )
    throw new Error("Worker configuration is invalid");
  return parsed as WorkerConfig;
}

export async function saveConfig(
  config: WorkerConfig,
  path = workerConfigPath(),
) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(config, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  try {
    await chmod(path, 0o600);
  } catch {
    /* Windows ACLs remain owned by the current user. */
  }
}

export async function removeConfig(path = workerConfigPath()) {
  await rm(path, { force: true });
}
