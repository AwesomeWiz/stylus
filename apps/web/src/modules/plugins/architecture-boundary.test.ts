import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
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

describe("plugin architecture boundary", () => {
  it("keeps plugin implementations dependent on the public Core contract", () => {
    const implementationFiles = sourceFiles(join(sourceRoot, "plugins")).filter(
      (path) => /plugins[\\/]example[\\/]/.test(path),
    );
    for (const file of implementationFiles) {
      const imports = [
        ...readFileSync(file, "utf8").matchAll(/from\s+["']([^"']+)/g),
      ].map((match) => match[1]!);
      expect(imports, relative(sourceRoot, file)).toEqual(
        imports.filter(
          (specifier) =>
            specifier === "@/core/plugins/public" ||
            specifier === "@/core/ai/public" ||
            specifier === "@/core/ai/server" ||
            specifier.startsWith("."),
        ),
      );
    }
  });

  it("prevents Core and application modules from importing plugin private internals", () => {
    const hostFiles = ["components", "core", "lib", "modules"].flatMap(
      (directory) => sourceFiles(join(sourceRoot, directory)),
    );
    for (const file of hostFiles)
      expect(
        readFileSync(file, "utf8"),
        relative(sourceRoot, file),
      ).not.toMatch(/from\s+["']@\/plugins\/[^"']+/);
  });

  it("uses static registration without filesystem or remote code discovery", () => {
    const registrySource = readFileSync(
      join(sourceRoot, "plugins", "index.ts"),
      "utf8",
    );
    expect(registrySource).toContain(
      'import { examplePlugin } from "./example"',
    );
    expect(registrySource).not.toMatch(/readdir|glob|https?:\/\/|eval\(/);
  });
});
