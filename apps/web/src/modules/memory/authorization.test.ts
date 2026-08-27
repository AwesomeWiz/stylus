import { describe, expect, it } from "vitest";

import {
  authorizeRequestedMemoryDomains,
  canMutateCompanyMemory,
  MemoryAccessDeniedError,
} from "./authorization";

describe("memory authorization", () => {
  it("keeps VIEWER read-only while collaborators may manage company memory", () => {
    expect(canMutateCompanyMemory("OWNER")).toBe(true);
    expect(canMutateCompanyMemory("ADMIN")).toBe(true);
    expect(canMutateCompanyMemory("MEMBER")).toBe(true);
    expect(canMutateCompanyMemory("VIEWER")).toBe(false);
  });

  it("allows Core capabilities to request company context only and never automatically", () => {
    expect(
      authorizeRequestedMemoryDomains({
        capability: "core.knowledge.preview",
        declaredDomains: [],
        enabled: true,
        pluginId: null,
        requestedDomains: [],
      }),
    ).toEqual([]);
    expect(() =>
      authorizeRequestedMemoryDomains({
        capability: "core.knowledge.preview",
        declaredDomains: [],
        enabled: true,
        pluginId: null,
        requestedDomains: ["marketing"],
      }),
    ).toThrow(MemoryAccessDeniedError);
  });

  it("requires enabled plugins and declared domains", () => {
    const request = {
      capability: "marketing.brief",
      declaredDomains: ["company", "marketing"] as const,
      enabled: true,
      pluginId: "marketing",
      requestedDomains: ["company"] as const,
    };
    expect(authorizeRequestedMemoryDomains(request)).toEqual(["company"]);
    expect(() =>
      authorizeRequestedMemoryDomains({ ...request, enabled: false }),
    ).toThrow(MemoryAccessDeniedError);
    expect(() =>
      authorizeRequestedMemoryDomains({
        ...request,
        requestedDomains: ["agency"],
      }),
    ).toThrow(MemoryAccessDeniedError);
  });
});
