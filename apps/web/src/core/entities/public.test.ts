import { describe, expect, it, vi } from "vitest";
import {
  EntityRegistry,
  entityReferenceKey,
  type EntityContext,
  type EntityProvider,
  type EntityReference,
} from "./public";
const org = crypto.randomUUID(),
  ref: EntityReference = {
    organizationId: org,
    entityType: "core.task",
    entityId: crypto.randomUUID(),
  };
const context: EntityContext = {
  organizationId: org,
  actorId: crypto.randomUUID(),
  role: "MEMBER",
  enabledPlugins: new Set(),
};
const projection = {
  title: "Authorized task",
  archived: false,
  href: "/tasks?task=" + ref.entityId,
  details: [],
};
const provider = (): EntityProvider => ({
  metadata: {
    id: "core.task",
    label: "Task",
    icon: "task",
    binding: "live",
    routePrefix: "/tasks",
  },
  resolve: vi.fn<EntityProvider["resolve"]>(
    async (_ctx, refs) =>
      new Map(refs.map((r) => [entityReferenceKey(r), projection])),
  ),
});
describe("public entity registry", () => {
  it("rejects duplicate and mismatched namespace registrations", () => {
    const p = provider();
    expect(() => new EntityRegistry([p, p])).toThrow(/Duplicate/);
    expect(
      () =>
        new EntityRegistry([
          { ...p, metadata: { ...p.metadata, sourcePlugin: "marketing" } },
        ]),
    ).toThrow(/ownership/);
  });
  it("batches one call per type and preserves repeated reference identity", async () => {
    const p = provider(),
      registry = new EntityRegistry([p]);
    const result = await registry.resolve(context, [ref, ref]);
    expect(p.resolve).toHaveBeenCalledOnce();
    expect(result[0]).toEqual(result[1]);
    expect(result[0]).toMatchObject({ status: "available", projection });
    await expect(
      registry.resolve(context, Array(51).fill(ref)),
    ).rejects.toThrow(/50/);
  });
  it("never invokes an adapter for foreign, unknown, stale-version or disabled references", async () => {
    const p = provider(),
      registry = new EntityRegistry([p]);
    const result = await registry.resolve(context, [
      { ...ref, organizationId: crypto.randomUUID() },
      { ...ref, entityType: "unknown.item" },
      {
        ...ref,
        immutable: { runId: crypto.randomUUID(), evidenceId: "EVID-1" },
      },
    ]);
    expect(result.every((r) => r.status === "unavailable")).toBe(true);
    expect(p.resolve).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain(projection.title);
    const plugin = {
      ...p,
      metadata: {
        ...p.metadata,
        id: "marketing.campaign",
        sourcePlugin: "marketing",
      },
    };
    const other = new EntityRegistry([plugin]);
    expect(other.discover(context)).toEqual([]);
    expect(
      (
        await other.resolve(context, [
          { ...ref, entityType: plugin.metadata.id, sourcePlugin: "marketing" },
        ])
      )[0]?.status,
    ).toBe("unavailable");
  });
  it("validates openers/projections and strips adapter failure details", async () => {
    const p = provider();
    p.resolve = vi.fn(
      async () =>
        new Map([
          [
            entityReferenceKey(ref),
            { ...projection, href: "//foreign.example" },
          ],
        ]),
    );
    expect(await new EntityRegistry([p]).resolve(context, [ref])).toEqual([
      { reference: ref, status: "error" },
    ]);
  });
  it("makes VIEWER creation unavailable while allowing authorized reads", async () => {
    const base = provider(),
      p: EntityProvider = {
        ...base,
        metadata: { ...base.metadata, fields: [] },
        parseCreation: () => ({}),
        create: async () => ref,
      };
    expect(
      new EntityRegistry([p]).discover({ ...context, role: "VIEWER" })[0]
        ?.creatable,
    ).toBe(false);
  });
});
