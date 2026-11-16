import { beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  from: vi.fn(),
  rows: {} as Record<string, unknown[]>,
  queries: [] as {
    table: string;
    q: Record<string, ReturnType<typeof vi.fn>>;
  }[],
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ from: m.from }),
}));
import { marketingExecutionProvenance } from "./growth-provenance";
import type { EntityContext } from "@/core/entities/public";
const org = crypto.randomUUID(),
  task = crypto.randomUUID(),
  experiment = crypto.randomUUID(),
  hypothesis = crypto.randomUUID(),
  source = crypto.randomUUID(),
  evidence = crypto.randomUUID(),
  run = crypto.randomUUID(),
  context: EntityContext = {
    organizationId: org,
    actorId: crypto.randomUUID(),
    role: "VIEWER",
    enabledPlugins: new Set(["marketing"]),
  };
beforeEach(() => {
  vi.clearAllMocks();
  m.rows = {
    marketing_experiment_links: [{ experiment_id: experiment }],
    marketing_experiments: [
      {
        id: experiment,
        title: "Compare setup",
        hypothesis_id: hypothesis,
        status: "COMPLETE",
        evaluated_source_ids: [source],
        archived_at: null,
      },
    ],
    marketing_hypotheses: [
      { id: hypothesis, title: "Clear first step", archived_at: null },
    ],
    marketing_hypothesis_sources: [
      {
        id: source,
        hypothesis_id: hypothesis,
        evidence_id: evidence,
        evidence_run_id: run,
        evidence_key: "EVID-1",
        archived_at: "2026-11-10T12:00:00Z",
      },
    ],
    marketing_external_research_evidence: [
      {
        id: evidence,
        title: "Observed confusion",
        run_id: run,
        evidence_id: "EVID-1",
      },
    ],
  };
  m.queries = [];
  m.from.mockImplementation((table: string) => {
    const q: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const name of ["select", "eq", "in", "is", "order", "limit"])
      q[name] = vi.fn(() => q);
    q.then = vi.fn((resolve: (r: unknown) => unknown) =>
      Promise.resolve({ data: m.rows[table] ?? [], error: null }).then(resolve),
    );
    m.queries.push({ table, q });
    return q;
  });
});
describe("explicit execution provenance", () => {
  it("follows Task → Experiment → Hypothesis → exact evaluated Evidence without title matching", async () => {
    const links = await marketingExecutionProvenance(
      context,
      "core.task",
      task,
    );
    expect(links.map((l) => l.label)).toEqual([
      "Experiment",
      "Based on Hypothesis",
      "Based on Evidence",
    ]);
    expect(links[2]?.href).toContain(
      `run=${run}&evidence=${evidence}#${run}-EVID-1`,
    );
    const sourceQuery = m.queries.find(
      (q) => q.table === "marketing_hypothesis_sources",
    )!.q;
    expect(sourceQuery.in).toHaveBeenCalledWith("id", [source]);
    expect(sourceQuery.is).not.toHaveBeenCalled();
    for (const { q } of m.queries)
      expect(q.eq).toHaveBeenCalledWith("organization_id", org);
    expect(m.queries[0]!.q.eq).toHaveBeenCalledWith("task_id", task);
    expect(m.queries[0]!.q.limit).toHaveBeenCalledWith(6);
  });
  it("omits an Evidence row with mismatched immutable identity", async () => {
    m.rows.marketing_external_research_evidence = [
      {
        id: evidence,
        title: "Wrong run",
        run_id: crypto.randomUUID(),
        evidence_id: "EVID-1",
      },
    ];
    const links = await marketingExecutionProvenance(
      context,
      "core.task",
      task,
    );
    expect(links).toHaveLength(2);
    expect(links.some((l) => l.title.includes("Wrong run"))).toBe(false);
  });
  it("never infers a relationship from similar content or queries disabled domains", async () => {
    m.rows.marketing_experiment_links = [];
    expect(
      await marketingExecutionProvenance(context, "core.task", task),
    ).toEqual([]);
    expect(m.from).toHaveBeenCalledOnce();
    m.from.mockClear();
    expect(
      await marketingExecutionProvenance(
        { ...context, enabledPlugins: new Set() },
        "core.task",
        task,
      ),
    ).toEqual([]);
    expect(m.from).not.toHaveBeenCalled();
  });
  it("deduplicates the same Hypothesis across explicit tests", async () => {
    m.rows.marketing_experiment_links = [
      { experiment_id: experiment },
      { experiment_id: "second" },
    ];
    m.rows.marketing_experiments!.push({
      id: "second",
      title: "Another explicit test",
      hypothesis_id: hypothesis,
      status: "COMPLETE",
      evaluated_source_ids: [source],
      archived_at: null,
    });
    const links = await marketingExecutionProvenance(
      context,
      "core.task",
      task,
    );
    expect(links.filter((l) => l.label === "Based on Hypothesis")).toHaveLength(
      1,
    );
    expect(links.filter((l) => l.label === "Based on Evidence")).toHaveLength(
      1,
    );
  });
});
