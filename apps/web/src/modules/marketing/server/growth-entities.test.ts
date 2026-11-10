import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  EntityRegistry,
  entityReferenceKey,
  type EntityContext,
} from "@/core/entities/public";
const mocks = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  from: vi.fn(),
  eq: vi.fn(),
  inside: vi.fn(),
  rpc: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    from: mocks.from,
    rpc: mocks.rpc,
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { growthEntityProviders } from "./growth-entities";
const org = crypto.randomUUID(),
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
    in: mocks.inside,
    is: vi.fn(),
    ilike: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    gt: vi.fn(),
    maybeSingle: async () => ({ data: mocks.rows[0] ?? null, error: null }),
    then: (done: (v: unknown) => unknown) =>
      Promise.resolve({ data: mocks.rows, error: null }).then(done),
  };
  for (const fn of [
    chain.select,
    chain.eq,
    chain.in,
    chain.is,
    chain.ilike,
    chain.order,
    chain.limit,
    chain.gt,
  ])
    fn.mockReturnValue(chain);
  mocks.from.mockReturnValue(chain);
});
describe("growth native entity providers", () => {
  it("registers three types through the existing public contract", () => {
    const registry = new EntityRegistry(growthEntityProviders),
      types = registry.discover(context);
    expect(types.map((t) => t.id)).toEqual([
      "marketing.experiment",
      "marketing.hypothesis",
      "marketing.learning",
    ]);
    expect(types.find((t) => t.id === "marketing.experiment")).toMatchObject({
      creationSelection: "single-reference",
      sourceEntityTypes: ["marketing.hypothesis"],
    });
    expect(
      registry.discover({ ...context, enabledPlugins: new Set() }),
    ).toEqual([]);
    expect(
      registry
        .discover({ ...context, role: "VIEWER" })
        .every((t) => !t.creatable),
    ).toBe(true);
  });
  it("batches many hypotheses in one scoped query", async () => {
    const provider = growthEntityProviders.find(
      (p) => p.metadata.id === "marketing.hypothesis",
    )!;
    const ids = Array.from({ length: 25 }, () => crypto.randomUUID());
    mocks.rows = ids.map((id) => ({
      id,
      title: "Setup belief",
      statement: "A testable belief",
      status: "READY_TO_TEST",
      archived_at: null,
    }));
    const refs = ids.map((entityId) => ({
      organizationId: org,
      entityId,
      entityType: provider.metadata.id,
      sourcePlugin: "marketing",
    }));
    const projected = await provider.resolve(context, refs);
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.eq).toHaveBeenCalledWith("organization_id", org);
    expect(mocks.inside).toHaveBeenCalledWith("id", ids);
    expect(projected.get(entityReferenceKey(refs[0]!))?.title).toBe(
      "Setup belief",
    );
  });
  it("keeps creation input bounded and qualitative", () => {
    const hypothesis = growthEntityProviders.find(
        (p) => p.metadata.id === "marketing.hypothesis",
      )!,
      experiment = growthEntityProviders.find(
        (p) => p.metadata.id === "marketing.experiment",
      )!;
    expect(
      hypothesis.parseCreation!({
        title: "Clear setup",
        statement: "We believe a clear next step helps",
      }),
    ).toMatchObject({ status: "DRAFT" });
    expect(
      experiment.parseCreation!({
        title: "Interview five users",
        hypothesisId: id,
      }),
    ).toMatchObject({ hypothesisId: id, status: "DRAFT", successCriteria: "" });
  });
  it("previews the actual Hypothesis without adding it to model inputs", async () => {
    const provider = growthEntityProviders.find(
      (p) => p.metadata.id === "marketing.experiment",
    )!;
    mocks.rows = [
      {
        id,
        title: "Clear setup",
        statement: "We believe a clear first step helps",
      },
    ];
    const preview = await provider.previewCreation!(context, [
      {
        id: crypto.randomUUID(),
        element_type: "ENTITY_CARD",
        content: {
          reference: {
            entityType: "marketing.hypothesis",
            entityId: id,
            organizationId: org,
            sourcePlugin: "marketing",
          },
        },
      },
    ]);
    expect(preview.fields).toEqual({ hypothesisId: id, testPlan: "" });
    expect(preview.text).toContain("clear first step");
    await expect(
      provider.previewCreation!(
        { ...context, organizationId: crypto.randomUUID() },
        [
          {
            id,
            element_type: "ENTITY_CARD",
            content: {
              reference: {
                entityType: "marketing.hypothesis",
                entityId: id,
                organizationId: org,
                sourcePlugin: "marketing",
              },
            },
          },
        ],
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("uses the existing stable receipt and domain RPC on every retry", async () => {
    const provider = growthEntityProviders.find(
        (p) => p.metadata.id === "marketing.hypothesis",
      )!,
      receipt = {
        id,
        organization_id: org,
        board_id: crypto.randomUUID(),
        created_by: context.actorId,
        entity_type: "marketing.hypothesis",
        entity_id: crypto.randomUUID(),
        card_id: crypto.randomUUID(),
        input: {
          title: "Clear setup",
          statement: "We believe a clear first step helps",
        },
        source_ids: [crypto.randomUUID()],
        state: "CREATED" as const,
        created_at: new Date().toISOString(),
      };
    mocks.rpc.mockResolvedValue({ data: receipt.entity_id, error: null });
    const first = await provider.create!(context, receipt),
      second = await provider.create!(context, receipt);
    expect(second).toEqual(first);
    expect(mocks.rpc).toHaveBeenNthCalledWith(
      1,
      "create_marketing_growth_from_board",
      { p_conversion_id: id },
    );
    expect(mocks.rpc).toHaveBeenNthCalledWith(
      2,
      "create_marketing_growth_from_board",
      { p_conversion_id: id },
    );
  });
});
