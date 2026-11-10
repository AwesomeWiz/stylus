import { describe, it, expect } from "vitest";
import {
  attentionGroups,
  attentionItemSchema,
  type AttentionItem,
} from "./public";
const row: AttentionItem = {
  id: "task",
  kind: "task",
  title: "Due work",
  href: "/tasks?task=example",
  scope: "personal",
  reason: "Overdue",
  timestamp: null,
  ownerId: null,
  rank: 1,
};
describe("daily attention public contract", () => {
  it("deduplicates canonical work and orders reasons deterministically", () => {
    expect(
      attentionGroups([
        row,
        row,
        { ...row, id: "blocked", rank: 0 },
      ]).personal.map((r) => r.id),
    ).toEqual(["blocked", "task"]);
  });
  it("bounds each category without displaying aggregate counts", () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({
      ...row,
      id: String(i),
    }));
    const groups = attentionGroups([
      ...rows,
      ...rows.map((r) => ({ ...r, id: "team" + r.id, scope: "team" as const })),
      ...rows.map((r) => ({ ...r, id: "learn" + r.id, kind: "learning" })),
    ]);
    expect(groups.personal).toHaveLength(12);
    expect(groups.team).toHaveLength(12);
    expect(groups.learning).toHaveLength(3);
  });
  it("rejects unsafe openers, invalid ownership and privileged extra fields", () => {
    for (const patch of [
      { href: "https://example.test" },
      { ownerId: "actor" },
      { timestamp: "yesterday" },
      { rank: 20 },
      { secret: "private" },
    ])
      expect(attentionItemSchema.safeParse({ ...row, ...patch }).success).toBe(
        false,
      );
  });
  it("keeps an evaluation and checkpoint visible when blocked Tasks fill the page", () => {
    const tasks = Array.from({ length: 20 }, (_, i) => ({
      ...row,
      id: `task-${i}`,
      rank: 0,
    }));
    const groups = attentionGroups([
      ...tasks,
      { ...row, id: "evaluation", kind: "experiment", rank: 2 },
      { ...row, id: "checkpoint", kind: "milestone", rank: 3 },
    ]);
    expect(groups.personal).toHaveLength(12);
    expect(groups.personal.filter((i) => i.kind === "task")).toHaveLength(10);
    expect(groups.personal.slice(-2).map((i) => i.id)).toEqual([
      "evaluation",
      "checkpoint",
    ]);
  });
});
