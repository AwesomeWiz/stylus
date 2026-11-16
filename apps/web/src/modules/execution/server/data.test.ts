import { beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  context: vi.fn(),
  client: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  memory: vi.fn(),
  queries: [] as {
    table: string;
    q: Record<string, ReturnType<typeof vi.fn>>;
  }[],
  rows: {} as Record<string, unknown[]>,
  single: {} as Record<string, unknown>,
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: m.context,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: m.client,
}));
vi.mock("@/core/memory/server", () => ({
  findCompanyMemoryCreation: m.memory,
}));
import {
  getNotes,
  getNote,
  getMilestones,
  getTaskExecution,
  searchExecution,
} from "./data";
import { mutateExecution } from "./mutations";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const org = crypto.randomUUID(),
  id = crypto.randomUUID(),
  target = crypto.randomUUID(),
  stamp = "2026-11-10T12:00:00Z";
beforeEach(() => {
  vi.clearAllMocks();
  m.queries = [];
  m.rows = {};
  m.single = {};
  m.context.mockResolvedValue({
    organization: { id: org },
    user: { id: crypto.randomUUID() },
    membership: { role: "MEMBER" },
  });
  m.rpc.mockResolvedValue({ data: [], error: null });
  m.memory.mockResolvedValue(null);
  m.client.mockResolvedValue({ from: m.from, rpc: m.rpc });
  m.from.mockImplementation((table: string) => {
    const q: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const key of [
      "select",
      "eq",
      "is",
      "not",
      "order",
      "limit",
      "or",
      "in",
      "gt",
      "ilike",
    ])
      q[key] = vi.fn(() => q);
    q.single = vi.fn(async () => ({
      data: m.single[table] ?? null,
      error: null,
    }));
    q.maybeSingle = q.single;
    q.then = vi.fn((resolve: (r: unknown) => unknown) =>
      Promise.resolve({ data: m.rows[table] ?? [], error: null }).then(resolve),
    );
    m.queries.push({ table, q });
    return q;
  });
});
describe("batched Core execution reads", () => {
  it("retains validated pagination state for a filtered list/detail return", async () => {
    const before = JSON.stringify({ updatedAt: stamp, id });
    const page = await getNotes({ query: "pilot", before });
    expect(page.before).toBe(before);
    expect(m.queries[0]!.q.or).toHaveBeenCalledWith(
      `updated_at.lt.${stamp},and(updated_at.eq.${stamp},id.lt.${id})`,
    );
  });
  it("paginates only Note metadata with deterministic recent ordering and literal search", async () => {
    m.rows.notes = Array.from({ length: 26 }, (_, i) => ({
      id: String(i),
      title: "Note " + i,
      updated_at: stamp,
    }));
    const page = await getNotes({ query: "100%_", archived: "false" });
    expect(page.rows).toHaveLength(25);
    expect(page.more).toBe(true);
    const q = m.queries[0]!.q;
    expect(q.select).toHaveBeenCalledWith(
      "id,title,updated_at,created_by,archived_at",
    );
    expect(q.eq).toHaveBeenCalledWith("organization_id", org);
    expect(q.ilike).toHaveBeenCalledWith("title", "%100\\%\\_%");
    expect(q.order).toHaveBeenNthCalledWith(1, "updated_at", {
      ascending: false,
    });
    expect(q.order).toHaveBeenNthCalledWith(2, "id", { ascending: false });
    expect(q.limit).toHaveBeenCalledWith(26);
  });
  it("validates cursors before building the bounded keyset expression", async () => {
    await expect(
      getNotes({
        before: JSON.stringify({ id: "injected", updatedAt: stamp }),
      }),
    ).rejects.toBeDefined();
    expect(m.queries[0]!.q.or).not.toHaveBeenCalled();
  });
  it("reads a selected Note independently of title/list filters and batches typed backlinks", async () => {
    m.single.notes = {
      id,
      title: "Decision in progress",
      content: "Selected body",
    };
    m.rows.note_links = [
      { task_id: target, milestone_id: null },
      { task_id: null, milestone_id: id },
    ];
    m.rows.tasks = [{ id: target, title: "Task" }];
    m.rows.milestones = [{ id, title: "Milestone" }];
    const note = await getNote(id);
    expect(note?.note.content).toBe("Selected body");
    expect(note?.tasks).toHaveLength(1);
    expect(m.from.mock.calls.map((c) => c[0])).toEqual([
      "notes",
      "note_links",
      "tasks",
      "milestones",
    ]);
    for (const { q } of m.queries)
      expect(q.eq).toHaveBeenCalledWith("organization_id", org);
    expect(m.memory).toHaveBeenCalledWith("core.note:" + id);
  });
  it("does not reveal foreign/unavailable Note titles or query its links", async () => {
    expect(await getNote(id)).toBeNull();
    expect(m.from).toHaveBeenCalledTimes(1);
    expect(m.memory).not.toHaveBeenCalled();
  });
  it("loads dependency rows once per direction and all related Tasks in a single batch", async () => {
    m.single.tasks = { id, milestone_id: null };
    m.rows.task_dependencies = [{ blocked_by_id: target, task_id: target }];
    m.rows.note_links = [];
    m.rows.tasks = [{ id: target, title: "Prerequisite", status: "TODO" }];
    const result = await getTaskExecution({ taskId: id });
    expect(result.blockedBy).toHaveLength(1);
    expect(m.queries.filter((q) => q.table === "tasks")).toHaveLength(2);
    expect(
      m.queries.filter((q) => q.table === "task_dependencies"),
    ).toHaveLength(2);
    for (const { table, q } of m.queries) {
      expect(q.eq).toHaveBeenCalledWith("organization_id", org);
      if (table === "task_dependencies")
        expect(q.limit).toHaveBeenCalledWith(50);
    }
  });
  it("loads one Milestone progress batch and an explicit bounded search", async () => {
    m.rows.milestones = [{ id, title: "Delivery" }];
    m.rpc.mockResolvedValue({
      data: [{ id, completed_count: 2, total_count: 4 }],
      error: null,
    });
    expect((await getMilestones()).rows[0]?.completed_count).toBe(2);
    expect(m.rpc).toHaveBeenCalledExactlyOnceWith("milestone_progress", {
      p_organization_id: org,
      p_ids: [id],
    });
    await searchExecution({ kind: "task", query: "why" });
    expect(m.queries.at(-1)!.q.limit).toHaveBeenCalledWith(26);
  });
});
describe("fresh actor-derived Core writes", () => {
  it("passes only reviewed typed fields to a public RPC", async () => {
    await mutateExecution({
      operation: "dependency",
      taskId: id,
      blockedById: target,
      link: true,
    });
    expect(m.rpc).toHaveBeenCalledExactlyOnceWith("set_task_dependency", {
      p_organization_id: org,
      p_task_id: id,
      p_blocked_by_id: target,
      p_link: true,
    });
  });
  it("denies VIEWER and revoked membership before database writes", async () => {
    for (const ctx of [
      null,
      { organization: { id: org }, membership: { role: "VIEWER" } },
    ]) {
      m.context.mockResolvedValue(ctx);
      await expect(
        mutateExecution({
          operation: "assignment",
          taskId: id,
          milestoneId: null,
        }),
      ).rejects.toMatchObject({ code: "42501" });
    }
    expect(m.rpc).not.toHaveBeenCalled();
  });
});
