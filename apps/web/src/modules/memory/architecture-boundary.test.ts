import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sourceRoot = resolve(process.cwd(), "src");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : /\.[cm]?[jt]sx?$/.test(path)
        ? [path]
        : [];
  });
}

describe("memory architecture boundary", () => {
  it("keeps retrieval and AI context construction server-only", () => {
    const serverFiles = sourceFiles(
      join(sourceRoot, "modules", "memory", "server"),
    );
    expect(serverFiles.length).toBeGreaterThan(0);
    serverFiles
      .filter((file) => !file.includes(".test."))
      .forEach((file) =>
        expect(readFileSync(file, "utf8")).toMatch(/^import "server-only";/),
      );
  });

  it("prevents client components from importing trusted memory services", () => {
    const violations = sourceFiles(sourceRoot).filter((file) => {
      const source = readFileSync(file, "utf8");
      return (
        source.startsWith('"use client"') &&
        /modules\/memory\/server|core\/memory\/server/.test(source)
      );
    });
    expect(violations).toEqual([]);
  });

  it("does not couple memory retrieval to providers or ai_runs", () => {
    const memoryFiles = sourceFiles(
      join(sourceRoot, "modules", "memory"),
    ).filter((file) => !file.includes(".test."));
    const source = memoryFiles
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(source).not.toMatch(/providers\/|ollama|openai/i);
    expect(source).not.toMatch(/\.from\(["']ai_runs["']\)/);
  });
});
