import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sourceRoot = resolve(process.cwd(), "src");

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? collectSourceFiles(path)
      : /\.[cm]?[jt]sx?$/.test(path)
        ? [relative(sourceRoot, path).replaceAll("\\", "/")]
        : [];
  });
}

const sourceFiles = collectSourceFiles(sourceRoot);

function source(file: string) {
  return readFileSync(resolve(sourceRoot, file), "utf8");
}

describe("AI architecture boundary", () => {
  it("keeps provider adapters and configured secrets server-only", () => {
    const serverFiles = sourceFiles.filter(
      (file) =>
        !file.includes(".test.") &&
        (file.includes("modules/ai/server/providers/") ||
          file.endsWith("modules/ai/server/configured.ts")),
    );
    expect(serverFiles.length).toBeGreaterThan(0);
    serverFiles.forEach((file) =>
      expect(
        source(file),
        relative(sourceRoot, resolve(sourceRoot, file)),
      ).toMatch(/^import "server-only";/),
    );
  });

  it("prevents client components from importing AI execution or server environment", () => {
    const violations = sourceFiles.filter((file) => {
      const contents = source(file);
      return (
        contents.startsWith('"use client"') &&
        /from ["']@\/(?:core\/ai\/server|modules\/ai\/server|lib\/env\/server)/.test(
          contents,
        )
      );
    });
    expect(violations).toEqual([]);
  });

  it("keeps business plugins away from provider implementations", () => {
    const violations = sourceFiles
      .filter(
        (file) => file.startsWith("plugins/") && file !== "plugins/index.ts",
      )
      .filter((file) => /modules\/ai\/server\/providers/.test(source(file)));
    expect(violations).toEqual([]);
  });

  it("does not expose provider secrets through NEXT_PUBLIC or browser forms", () => {
    const combined = sourceFiles.map(source).join("\n");
    expect(combined).not.toMatch(
      /NEXT_PUBLIC_[A-Z0-9_]*(?:AI|OPENAI|OLLAMA).*KEY/,
    );
    expect(combined).not.toMatch(/name=["'](?:apiKey|providerUrl|baseUrl)["']/);
  });

  it("has no dynamic execution or raw prompt logging in AI source", () => {
    const aiFiles = sourceFiles.filter(
      (file) => file.startsWith("core/ai/") || file.startsWith("modules/ai/"),
    );
    const combined = aiFiles.map(source).join("\n");
    expect(combined).not.toMatch(/\beval\s*\(|new Function\s*\(/);
    expect(combined).not.toMatch(/console\.(?:log|debug|info)\s*\(/);
  });
});
