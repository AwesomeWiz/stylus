import { beforeEach, describe, it, expect, vi } from "vitest";
import { entityReferenceKey, type EntityContext } from "@/core/entities/public";
const mocks = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  eq: vi.fn(),
  in: vi.fn(),
  from: vi.fn(),
  createIdea: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ from: mocks.from }),
}));
vi.mock("./mutations", () => ({
  saveMarketingReelIdea: mocks.createIdea,
  saveMarketingResearch: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { marketingEntityProviders } from "./board-entities";
const org = crypto.randomUUID(),
  run = crypto.randomUUID(),
  id = crypto.randomUUID(),
  context: EntityContext = {
    organizationId: org,
    actorId: crypto.randomUUID(),
    role: "MEMBER",
    enabledPlugins: new Set(["marketing"]),
  };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rows = [];
  const chain = {
    select: vi.fn(),
    eq: mocks.eq,
    in: mocks.in,
    then: (done: (value: unknown) => unknown) =>
      Promise.resolve({ data: mocks.rows, error: null }).then(done),
  };
  chain.select.mockReturnValue(chain);
  mocks.eq.mockReturnValue(chain);
  mocks.in.mockReturnValue(chain);
  mocks.from.mockReturnValue(chain);
});
describe("Marketing native entity projections", () => {
  it("retains the existing domain invalidation dependencies after Board creation", async () => {
    const provider = marketingEntityProviders.find(
        (item) => item.metadata.id === "marketing.reel-idea",
      )!,
      receipt = {
        id: crypto.randomUUID(),
        organization_id: org,
        board_id: crypto.randomUUID(),
        created_by: context.actorId,
        entity_type: provider.metadata.id,
        entity_id: id,
        card_id: crypto.randomUUID(),
        input: { title: "Reviewed idea" },
        source_ids: [crypto.randomUUID()],
        state: "PREPARED" as const,
        created_at: new Date().toISOString(),
      };
    mocks.createIdea.mockResolvedValue(id);
    expect(await provider.create?.(context, receipt)).toMatchObject({
      entityId: id,
      entityType: provider.metadata.id,
    });
    expect(mocks.revalidate.mock.calls.map((call) => call[0])).toEqual([
      "/apps/marketing/reel-ideas",
      "/apps/marketing",
      "/activity",
    ]);
  });
  it("binds immutable Evidence to exact row/run/EVID and never a newer or adjacent version", async () => {
    const provider = marketingEntityProviders.find(
        (item) => item.metadata.id === "marketing.research-evidence",
      )!,
      reference = {
        organizationId: org,
        entityType: provider.metadata.id,
        entityId: id,
        sourcePlugin: "marketing",
        immutable: { runId: run, evidenceId: "EVID-2" },
      };
    mocks.rows = [
      {
        id,
        run_id: run,
        evidence_id: "EVID-2",
        source_id: crypto.randomUUID(),
        title: "Exact source",
        canonical_url: "https://example.com/evidence",
        evidence_type: "FEED_ITEM",
        fetched_at: "2026-11-04T00:00:00Z",
        created_at: "2026-11-04T00:00:00Z",
        published_at: null,
      },
    ];
    const found = await provider.resolve(context, [
      reference,
      {
        ...reference,
        immutable: { runId: crypto.randomUUID(), evidenceId: "EVID-2" },
      },
    ]);
    expect(found.size).toBe(1);
    expect(found.get(entityReferenceKey(reference))?.href).toContain(
      `run=${run}&evidence=${id}`,
    );
    expect(mocks.from).toHaveBeenCalledOnce();
    expect(mocks.eq).toHaveBeenCalledWith("organization_id", org);
    expect(mocks.in).toHaveBeenCalledWith("id", [id, id]);
    expect(
      JSON.stringify(found.get(entityReferenceKey(reference))),
    ).not.toContain("excerpt");
  });
  it("keeps archived live records openable without copying their private content into Board truth", async () => {
    const provider = marketingEntityProviders.find(
        (item) => item.metadata.id === "marketing.reel-idea",
      )!,
      reference = {
        organizationId: org,
        entityType: provider.metadata.id,
        entityId: id,
        sourcePlugin: "marketing",
      };
    mocks.rows = [
      {
        id,
        title: "Archived concept",
        status: "READY",
        archived_at: "2026-11-04T00:00:00Z",
        updated_at: "2026-11-04T00:00:00Z",
      },
    ];
    const found = await provider.resolve(context, [reference]);
    expect(found.get(entityReferenceKey(reference))).toMatchObject({
      archived: true,
      href: `/apps/marketing/reel-ideas?item=${id}&archived=true`,
    });
  });
  it("maps manual notes to the existing human domain and rejects invalid creation fields", () => {
    const notes = marketingEntityProviders.find(
      (item) => item.metadata.id === "marketing.research-note",
    )!;
    expect(notes.metadata.conversionOnly).toBe(true);
    expect(
      notes.parseCreation?.({
        title: "Human note",
        content: "Reviewed content",
      }),
    ).toMatchObject({
      recordId: null,
      title: "Human note",
      content: "Reviewed content",
      category: "OTHER",
    });
    expect(() => notes.parseCreation?.({ title: "", content: "" })).toThrow();
  });
});
