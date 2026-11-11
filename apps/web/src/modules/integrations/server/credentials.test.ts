// @vitest-environment node
import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openCredential, sealCredential } from "./credentials";
import { IntegrationError, safeIntegrationError } from "./errors";
describe("integration credentials", () => {
  let first: string;
  beforeEach(() => {
    first = randomBytes(32).toString("base64");
    vi.stubEnv("STYLUS_INTEGRATION_KEY_ID", "k1");
    vi.stubEnv("STYLUS_INTEGRATION_KEYS", JSON.stringify({ k1: first }));
  });
  afterEach(() => vi.unstubAllEnvs());
  it("encrypts authenticated envelopes without plaintext and uses fresh nonces", () => {
    const a = sealCredential(
      { refresh_token: "fictional-private-refresh" },
      "org-a:connection-a",
    );
    const b = sealCredential(
      { refresh_token: "fictional-private-refresh" },
      "org-a:connection-a",
    );
    expect(a).not.toContain("fictional-private-refresh");
    expect(a).not.toBe(b);
    expect(openCredential(a, "org-a:connection-a")).toEqual({
      refresh_token: "fictional-private-refresh",
    });
    expect(() => openCredential(a, "org-b:connection-a")).toThrow(
      IntegrationError,
    );
  });
  it("rejects tampering, unknown versions, removed keys and malformed envelopes", () => {
    const original = JSON.parse(sealCredential({ value: 1 }, "identity"));
    for (const changed of [
      { ...original, v: 2 },
      { ...original, kid: "missing" },
      { ...original, tag: Buffer.alloc(16).toString("base64") },
      { ...original, data: "AAAA" },
      { ...original, iv: "AAAA" },
    ])
      expect(() => openCredential(JSON.stringify(changed), "identity")).toThrow(
        IntegrationError,
      );
    expect(() => openCredential("not json", "identity")).toThrow(
      IntegrationError,
    );
  });
  it("supports rotation while retained keys decrypt old records", () => {
    const old = sealCredential({ value: 1 }, "identity");
    vi.stubEnv(
      "STYLUS_INTEGRATION_KEYS",
      JSON.stringify({ k1: first, k2: randomBytes(32).toString("base64") }),
    );
    vi.stubEnv("STYLUS_INTEGRATION_KEY_ID", "k2");
    expect(openCredential(old, "identity")).toEqual({ value: 1 });
    expect(JSON.parse(sealCredential({}, "identity")).kid).toBe("k2");
  });
  it("requires exact 256-bit keys and redacts all unrelated failures", () => {
    vi.stubEnv("STYLUS_INTEGRATION_KEYS", JSON.stringify({ k1: "short" }));
    expect(() => sealCredential({}, "id")).toThrow("server configuration");
    expect(safeIntegrationError(Error("provider body secret"))).not.toContain(
      "secret",
    );
  });
});
