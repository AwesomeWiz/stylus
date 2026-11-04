import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  EntityRegistry,
  entityReferenceKey,
  type EntityProvider,
} from "@/core/entities/public";
const mocks = vi.hoisted(() => ({
  current: vi.fn(),
  enabled: vi.fn(),
  registry: vi.fn(),
  existing: [] as { id: string; content: Record<string, unknown> }[],
  from: vi.fn(),
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.current,
}));
vi.mock("@/modules/plugins/server/data", () => ({
  getEnabledOrganizationPluginIds: mocks.enabled,
}));
vi.mock("@/plugins", () => ({ getBoardEntityRegistry: mocks.registry }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ from: mocks.from }),
}));
import {
  readBoardEntities,
  validateNativeCardChanges,
  extractEntitySelection,
} from "./entities";
const org = crypto.randomUUID(),
  actor = crypto.randomUUID(),
  board = crypto.randomUUID(),
  id = crypto.randomUUID(),
  reference = {
    organizationId: org,
    entityId: crypto.randomUUID(),
    entityType: "marketing.campaign",
    sourcePlugin: "marketing",
  };
const resolve = vi.fn<EntityProvider["resolve"]>(
  async (_ctx, refs) =>
    new Map(
      refs.map((ref) => [
        entityReferenceKey(ref),
        {
          title: "Authorized campaign",
          archived: false,
          href: "/apps/marketing/campaigns?item=" + ref.entityId,
          details: [],
        },
      ]),
    ),
);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.existing = [];
  mocks.current.mockResolvedValue({
    organization: { id: org },
    user: { id: actor },
    membership: { role: "MEMBER" },
  });
  mocks.enabled.mockResolvedValue(["marketing"]);
  mocks.registry.mockResolvedValue(
    new EntityRegistry([
      {
        metadata: {
          id: "marketing.campaign",
          label: "Campaign",
          icon: "campaign",
          binding: "live",
          sourcePlugin: "marketing",
          routePrefix: "/apps/marketing/campaigns",
        },
        resolve,
      },
    ]),
  );
  mocks.from.mockImplementation((table: string) => {
    const result = () => ({
      data: table === "boards" ? { id: board, title: "Board" } : mocks.existing,
      error: null,
    });
    const chain = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      in: vi.fn(),
      maybeSingle: vi.fn(),
      then: (done: (value: unknown) => unknown) =>
        Promise.resolve(result()).then(done),
    };
    for (const key of ["select", "eq", "is", "in"] as const)
      chain[key].mockReturnValue(chain);
    chain.maybeSingle.mockImplementation(async () => result());
    return chain;
  });
});
describe("fresh Board entity authority", () => {
  it("reauthorizes every read and rejects foreign/revoked organization context", async () => {
    const response = await readBoardEntities({
      operation: "resolve",
      organizationId: org,
      boardId: board,
      references: [reference],
    });
    expect(
      "resolutions" in response ? response.resolutions[0]?.status : undefined,
    ).toBe("available");
    mocks.current.mockResolvedValue(null);
    await expect(
      readBoardEntities({
        operation: "resolve",
        organizationId: org,
        boardId: board,
        references: [reference],
      }),
    ).rejects.toMatchObject({ code: "42501" });
    expect(resolve).toHaveBeenCalledOnce();
    expect(mocks.current).toHaveBeenCalledTimes(2);
  });
  it("does not invoke a disabled adapter or expose its old projection", async () => {
    mocks.enabled.mockResolvedValue([]);
    const result = await readBoardEntities({
      operation: "resolve",
      organizationId: org,
      boardId: board,
      references: [reference],
    });
    expect("resolutions" in result ? result.resolutions : undefined).toEqual([
      { reference, status: "unavailable" },
    ]);
    expect(JSON.stringify(result)).not.toContain("Authorized campaign");
    expect(resolve).not.toHaveBeenCalled();
  });
  it("preserves unavailable-card geometry without resolving and freshly rejects a new copy", async () => {
    mocks.enabled.mockResolvedValue([]);
    mocks.existing = [
      {
        id,
        content: {
          reference: {
            sourcePlugin: "marketing",
            entityType: reference.entityType,
            entityId: reference.entityId,
            organizationId: org,
          },
        },
      },
    ];
    await validateNativeCardChanges({
      organizationId: org,
      boardId: board,
      rows: [{ id, element_type: "ENTITY_CARD", content: { reference } }],
    });
    expect(mocks.current).not.toHaveBeenCalled();
    await expect(
      validateNativeCardChanges({
        organizationId: org,
        boardId: board,
        rows: [
          {
            id: crypto.randomUUID(),
            element_type: "ENTITY_CARD",
            content: { reference },
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("extracts only the reviewed textual selection, in deterministic order and within its limit", () => {
    const rows = [
      {
        id: crypto.randomUUID(),
        element_type: "STICKY" as const,
        z_index: 2,
        content: {
          text: "Second",
          storagePath: "private secret",
          hidden: "ignored",
        },
      },
      {
        id: crypto.randomUUID(),
        element_type: "TEXT" as const,
        z_index: 1,
        content: { text: "First" },
      },
    ];
    const result = extractEntitySelection(rows, "Source Board");
    expect(result.title).toBe("First");
    expect(result.text).toContain("First\n- Second");
    expect(result.text).not.toContain("private secret");
    expect(result.sourceIds).toEqual(rows.map((row) => row.id).sort());
    expect(
      extractEntitySelection(
        [{ ...rows[0]!, content: { text: "a".repeat(5000) } }],
        "Source",
      ).truncated,
    ).toBe(true);
  });
});
