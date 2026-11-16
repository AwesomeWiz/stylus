import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  enabled: vi.fn(),
  resolve: vi.fn(),
  relations: vi.fn(),
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.context,
}));
vi.mock("@/modules/plugins/server/data", () => ({
  getEnabledOrganizationPluginIds: mocks.enabled,
}));
vi.mock("./board-entities", () => ({
  boardEntityRegistry: { resolve: mocks.resolve },
}));
vi.mock("@/modules/marketing/server/growth-provenance", () => ({
  marketingExecutionProvenance: mocks.relations,
}));
import { readEntityProvenance } from "./entity-provenance";
const org = crypto.randomUUID(),
  id = crypto.randomUUID(),
  actor = crypto.randomUUID(),
  input = { entityType: "core.task", entityId: id };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.mockResolvedValue({
    organization: { id: org },
    user: { id: actor },
    membership: { role: "VIEWER" },
  });
  mocks.enabled.mockResolvedValue(["marketing"]);
  mocks.resolve.mockResolvedValue([{ status: "available" }]);
  mocks.relations.mockResolvedValue([
    {
      title: "Setup experiment",
      label: "Experiment",
      href: "/apps/marketing/experiments?item=" + id,
    },
  ]);
});
describe("public entity provenance authority", () => {
  it("authorizes the target before a VIEWER can read explicit provenance", async () => {
    expect(await readEntityProvenance(input)).toHaveLength(1);
    expect(mocks.resolve).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: org, role: "VIEWER" }),
      [{ entityType: "core.task", entityId: id, organizationId: org }],
    );
    expect(mocks.relations).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: org }),
      "core.task",
      id,
    );
  });
  it("does not resolve plugin context when disabled", async () => {
    mocks.enabled.mockResolvedValue([]);
    expect(await readEntityProvenance(input)).toEqual([]);
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.relations).not.toHaveBeenCalled();
  });
  it("foreign, deleted or unavailable targets disclose no relationship titles", async () => {
    mocks.resolve.mockResolvedValue([{ status: "unavailable" }]);
    expect(await readEntityProvenance(input)).toEqual([]);
    expect(mocks.relations).not.toHaveBeenCalled();
  });
  it("revoked membership and browser authority forgery are denied", async () => {
    mocks.context.mockResolvedValue(null);
    expect(await readEntityProvenance(input)).toEqual([]);
    await expect(
      readEntityProvenance({ ...input, organizationId: org }),
    ).rejects.toBeDefined();
    expect(mocks.relations).not.toHaveBeenCalled();
  });
  it("validates even trusted adapter openers", async () => {
    mocks.relations.mockResolvedValue([
      {
        title: "Unsafe opener",
        label: "Experiment",
        href: "https://example.test",
      },
    ]);
    await expect(readEntityProvenance(input)).rejects.toBeDefined();
  });
});
