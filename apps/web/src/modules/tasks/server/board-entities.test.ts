import { beforeEach, describe, it, expect, vi } from "vitest";
import { entityReferenceKey, type EntityContext } from "@/core/entities/public";
const mocks = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  eq: vi.fn(),
  from: vi.fn(),
  create: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ from: mocks.from }),
}));
vi.mock("./create", () => ({ createTaskRecord: mocks.create }));
import { taskEntityProvider } from "./board-entities";
const org = crypto.randomUUID(),
  id = crypto.randomUUID(),
  actor = crypto.randomUUID(),
  reference = { organizationId: org, entityType: "core.task", entityId: id },
  context: EntityContext = {
    organizationId: org,
    actorId: actor,
    role: "MEMBER",
    enabledPlugins: new Set(),
  };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rows = [];
  const chain = {
    select: vi.fn(),
    eq: mocks.eq,
    in: vi.fn(),
    then: (done: (value: unknown) => unknown) =>
      Promise.resolve({ data: mocks.rows, error: null }).then(done),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  mocks.from.mockReturnValue(chain);
});
describe("Core Task public Board adapter", () => {
  it("resolves the existing completion/archive rule and retains an exact authorized opener", async () => {
    mocks.rows = [
      {
        id,
        organization_id: org,
        title: "Completed work",
        status: "COMPLETED",
        priority: "HIGH",
        assignee_id: actor,
        due_at: null,
        completed_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      },
    ];
    const result = await taskEntityProvider.resolve(context, [reference]);
    expect(result.get(entityReferenceKey(reference))).toMatchObject({
      archived: true,
      href: `/tasks?task=${id}&view=archive`,
      status: "COMPLETED",
    });
    expect(mocks.eq).toHaveBeenCalledWith("organization_id", org);
    mocks.rows = [{ ...mocks.rows[0], completed_at: new Date().toISOString() }];
    expect(
      (await taskEntityProvider.resolve(context, [reference])).get(
        entityReferenceKey(reference),
      )?.archived,
    ).toBe(false);
  });
  it("delegates creation to the shared Task domain and rejects another creator's receipt", async () => {
    const receipt = {
      id: crypto.randomUUID(),
      organization_id: org,
      board_id: crypto.randomUUID(),
      created_by: actor,
      entity_type: "core.task",
      entity_id: id,
      card_id: crypto.randomUUID(),
      input: { title: "Reviewed Task" },
      source_ids: [crypto.randomUUID()],
      state: "PREPARED" as const,
      created_at: new Date().toISOString(),
    };
    mocks.create.mockResolvedValue(id);
    expect(await taskEntityProvider.create?.(context, receipt)).toEqual(
      reference,
    );
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Reviewed Task", priority: "MEDIUM" }),
      receipt.id,
    );
    expect(mocks.revalidate).toHaveBeenCalledWith("/tasks");
    await expect(
      taskEntityProvider.create?.(context, {
        ...receipt,
        created_by: crypto.randomUUID(),
      }),
    ).rejects.toThrow(/unavailable/);
  });
});
