import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConnectionRow } from "@/core/integrations/public";
const mocks = vi.hoisted(() => ({
  current: vi.fn(),
  service: vi.fn(),
  db: vi.fn(),
  registry: vi.fn(),
  enabled: vi.fn(),
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.current,
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceSupabaseClient: mocks.service,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.db,
}));
vi.mock("@/modules/plugins/server/data", () => ({
  getEnabledOrganizationPluginIds: mocks.enabled,
}));
vi.mock("@/plugins", () => ({
  getIntegrationEntityRegistry: async () => ({ resolve: mocks.registry }),
}));
import { authorizeTarget, integrationContext, readConnection } from "./context";
const org = "20000000-0000-4000-8000-000000000001",
  id = "10000000-0000-4000-8000-000000000001";
let row: ConnectionRow, member: unknown, serviceFilters: unknown[][];
function query(data: () => unknown, filters: unknown[][] = []) {
  const chain = {
    select: () => chain,
    eq: (...v: unknown[]) => {
      filters.push(v);
      return chain;
    },
    is: () => chain,
    maybeSingle: async () => ({ data: data(), error: null }),
  };
  return chain;
}
beforeEach(() => {
  row = {
    id,
    organization_id: org,
    owner_id: "other-user",
    provider: "google-drive",
    status: "connected",
    created_by: "other-user",
    generation: 1,
  } as ConnectionRow;
  member = { user_id: "other-user" };
  serviceFilters = [];
  mocks.current.mockResolvedValue({
    organization: { id: org },
    user: { id: "actor" },
    membership: { role: "MEMBER" },
  });
  mocks.db.mockResolvedValue({ from: () => query(() => member) });
  mocks.service.mockReturnValue({
    from: () => query(() => row, serviceFilters),
  });
  mocks.enabled.mockResolvedValue([]);
  mocks.registry.mockReset();
});
describe("integration authority boundaries", () => {
  it("rejects missing membership before integration access", async () => {
    mocks.current.mockResolvedValue(null);
    await expect(integrationContext()).rejects.toMatchObject({
      category: "denied",
    });
  });
  it("does not let an organization owner browse another user's Google", async () => {
    const context = await integrationContext();
    context.role = "OWNER";
    await expect(readConnection(context, id)).rejects.toMatchObject({
      category: "denied",
    });
    expect(serviceFilters).toEqual([
      ["organization_id", org],
      ["id", id],
    ]);
  });
  it("allows explicit shared resolution only while the connection owner remains a member", async () => {
    const context = await integrationContext();
    expect(await readConnection(context, id, false)).toBe(row);
    member = null;
    await expect(readConnection(context, id, false)).rejects.toMatchObject({
      category: "denied",
    });
  });
  it("suppresses disconnected metadata before credential access", async () => {
    row.status = "disconnected";
    await expect(
      readConnection(await integrationContext(), id, false),
    ).rejects.toMatchObject({ category: "denied" });
  });
  it("denies VIEWER writes before resolving entity projections", async () => {
    const context = await integrationContext();
    context.role = "VIEWER";
    await expect(
      authorizeTarget(context, { entityType: "core.task", entityId: id }, true),
    ).rejects.toMatchObject({ category: "denied" });
    expect(mocks.registry).not.toHaveBeenCalled();
  });
  it("uses exact canonical references with fresh enabled-plugin scope", async () => {
    mocks.registry.mockResolvedValue([{ status: "unavailable" }]);
    const c = await integrationContext();
    await expect(
      authorizeTarget(c, { entityType: "marketing.experiment", entityId: id }),
    ).rejects.toMatchObject({ category: "denied" });
    expect(mocks.registry).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: org,
        actorId: "actor",
        enabledPlugins: new Set(),
      }),
      [
        {
          entityType: "marketing.experiment",
          entityId: id,
          organizationId: org,
          sourcePlugin: "marketing",
        },
      ],
    );
  });
  it("does not attach to archived work even when it remains readable", async () => {
    mocks.registry.mockResolvedValue([
      {
        status: "available",
        projection: { title: "Archived task", href: "/tasks", archived: true },
      },
    ]);
    await expect(
      authorizeTarget(
        await integrationContext(),
        { entityType: "core.task", entityId: id },
        true,
      ),
    ).rejects.toMatchObject({ category: "denied" });
  });
});
