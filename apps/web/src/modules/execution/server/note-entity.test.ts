import { beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  from: vi.fn(),
  q: {} as Record<string, ReturnType<typeof vi.fn>>,
  rows: [] as Record<string, unknown>[],
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ from: m.from }),
}));
import { noteEntityProvider } from "./note-entity";
import { EntityRegistry, type EntityContext } from "@/core/entities/public";
const org = crypto.randomUUID(),
  id = crypto.randomUUID(),
  context: EntityContext = {
    organizationId: org,
    actorId: crypto.randomUUID(),
    role: "VIEWER",
    enabledPlugins: new Set(),
  };
beforeEach(() => {
  vi.clearAllMocks();
  m.rows = [];
  m.q = {};
  for (const key of [
    "select",
    "eq",
    "in",
    "is",
    "ilike",
    "order",
    "limit",
    "gt",
  ])
    m.q[key] = vi.fn(() => m.q);
  m.q.then = vi.fn((resolve: (r: unknown) => unknown) =>
    Promise.resolve({ data: m.rows, error: null }).then(resolve),
  );
  m.from.mockReturnValue(m.q);
});
describe("Core Note native public adapter", () => {
  it("works with Marketing disabled and projects only live bounded metadata", async () => {
    m.rows = [
      {
        id,
        title: "Working plan",
        updated_at: "2026-11-10T12:00:00Z",
        archived_at: null,
      },
    ];
    const result = await new EntityRegistry([noteEntityProvider]).resolve(
      context,
      [{ entityType: "core.note", organizationId: org, entityId: id }],
    );
    expect(result[0]).toMatchObject({
      status: "available",
      projection: { title: "Working plan", href: "/notes?note=" + id },
    });
    expect(m.q.select).toHaveBeenCalledWith("id,title,updated_at,archived_at");
    expect(m.q.eq).toHaveBeenCalledWith("organization_id", org);
  });
  it("renders unavailable foreign and revoked rows without stale excerpts", async () => {
    const registry = new EntityRegistry([noteEntityProvider]);
    const result = await registry.resolve(context, [
      {
        entityType: "core.note",
        organizationId: crypto.randomUUID(),
        entityId: id,
      },
    ]);
    expect(result[0]).toMatchObject({ status: "unavailable" });
    expect(m.from).not.toHaveBeenCalled();
    const missing = await registry.resolve(context, [
      { entityType: "core.note", organizationId: org, entityId: id },
    ]);
    expect(missing[0]).toMatchObject({ status: "unavailable" });
    expect(missing[0]).not.toHaveProperty("projection");
  });
  it("provides a bounded search and no conversion, AI or Memory action", async () => {
    await noteEntityProvider.search!(context, "Plan");
    expect(m.q.limit).toHaveBeenCalledWith(26);
    expect(m.q.is).toHaveBeenCalledWith("archived_at", null);
    expect(noteEntityProvider.create).toBeUndefined();
    expect(noteEntityProvider.previewCreation).toBeUndefined();
  });
});
