import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sourceRoot = resolve(process.cwd(), "src");
function files(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? files(path)
      : /\.[cm]?[jt]sx?$/.test(path)
        ? [path]
        : [];
  });
}

describe("jobs architecture boundary", () => {
  it("marks queue persistence, registry composition, and execution server-only", () => {
    files(join(sourceRoot, "modules", "jobs", "server"))
      .filter((file) => !file.includes(".test."))
      .forEach((file) =>
        expect(readFileSync(file, "utf8")).toMatch(/^import "server-only";/),
      );
  });

  it("prevents client components from importing trusted job services", () => {
    const violations = files(sourceRoot).filter((file) => {
      const source = readFileSync(file, "utf8");
      return (
        source.startsWith('"use client"') &&
        /modules\/jobs\/server/.test(source)
      );
    });
    expect(violations).toEqual([]);
  });

  it("does not merge jobs with AI runs or memory persistence", () => {
    const source = files(join(sourceRoot, "modules", "jobs"))
      .filter((file) => !file.includes(".test."))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(source).not.toMatch(
      /\.from\(["']ai_runs["']\)|create_company_memory|update_company_memory/,
    );
  });

  it("contains no eval, remote executable loading, provider adapter, or secret client", () => {
    const source = files(join(sourceRoot, "modules", "jobs"))
      .filter((file) => !file.includes(".test."))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(source).not.toMatch(
      /\beval\(|providers\/|service.role|SUPABASE_SERVICE/i,
    );
  });
});
