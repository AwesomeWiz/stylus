import { defineConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.resolve(".release-qa/browsers");
const origin = process.env.STYLUS_QA_ORIGIN ?? "http://localhost:3000";
const port = new URL(origin).port || "3000";
export default defineConfig({
  testDir: "tests/release",
  outputDir: ".release-qa/browser-results",
  workers: 1,
  retries: 0,
  timeout: 90000,
  reporter: [
    ["list"],
    ["json", { outputFile: ".release-qa/browser-report.json" }],
  ],
  use: {
    actionTimeout: 10000,
    baseURL: origin,
    viewport: { width: 1600, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    ...(process.platform === "win32" &&
    fs.existsSync(
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    )
      ? [{ name: "edge", use: { browserName: "chromium", channel: "msedge" } }]
      : []),
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: {
    command: `npm run start --workspace @stylus/web -- --hostname 127.0.0.1 --port ${port}`,
    url: new URL("/login", origin).href,
    reuseExistingServer: false,
    timeout: 120000,
  },
});
