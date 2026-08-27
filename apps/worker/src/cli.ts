#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import {
  WorkerApi,
  WorkerApiError,
  WorkerUnauthorizedError,
  apiForConfig,
} from "./api.js";
import {
  loadConfig,
  removeConfig,
  saveConfig,
  workerConfigPath,
} from "./config.js";
import { workerRegistry } from "./registry.js";
import { WorkerRuntime } from "./runtime.js";

try {
  const command = process.argv[2] ?? "status";
  if (command === "pair") {
    const io = createInterface({ input: stdin, output: stdout });
    const stylusUrl = (await io.question("Stylus URL: ")).trim();
    const token = (await io.question("One-time pairing code: ")).trim();
    io.close();
    const paired = await new WorkerApi(stylusUrl).pair(token);
    await saveConfig({ ...paired, stylusUrl });
    console.log(
      `Paired ${paired.name}. Credential stored at ${workerConfigPath()}.`,
    );
  } else if (command === "start") {
    const config = await loadConfig();
    const controller = new AbortController();
    process.once("SIGINT", () => controller.abort("shutdown"));
    process.once("SIGTERM", () => controller.abort("shutdown"));
    console.log(`Starting ${config.name} (${config.workerId.slice(0, 8)}).`);
    try {
      await new WorkerRuntime(apiForConfig(config), workerRegistry).run(
        controller.signal,
      );
    } catch (error) {
      console.error(
        error instanceof WorkerUnauthorizedError
          ? "Worker is revoked or unauthorized."
          : "Worker stopped after a connectivity failure.",
      );
      process.exitCode = 1;
    }
  } else if (command === "status") {
    try {
      const config = await loadConfig();
      await apiForConfig(config).heartbeat();
      console.log(
        `${config.name} is configured and reachable (${config.workerId.slice(0, 8)}).`,
      );
    } catch (error) {
      console.error(
        error instanceof WorkerUnauthorizedError
          ? "Worker is revoked or unauthorized."
          : "Worker is not paired or Stylus is unreachable.",
      );
      process.exitCode = 1;
    }
  } else if (command === "logout" || command === "revoke") {
    await removeConfig();
    console.log(
      "Local worker credential removed. Revoke the registration in Stylus if it is still active.",
    );
  } else {
    console.error("Usage: stylus-worker pair|start|status|logout");
    process.exitCode = 1;
  }
} catch (error) {
  console.error(
    error instanceof WorkerApiError ? error.message : "Worker command failed.",
  );
  process.exitCode = 1;
}
