import { describe, it, expect } from "vitest";
import { object } from "@/test/board-fixtures";
import { stabilizeFlowNodes, previewFlowNodes } from "./flow-nodes";
import type { WhiteboardFlowNode } from "./whiteboard-node";
const callbacks = { onContentCommit: () => {}, onResizeCommit: () => {} };
function node(element = object()): WhiteboardFlowNode {
  return {
    id: element.id,
    type: "whiteboard",
    position: { x: element.x, y: element.y },
    style: { width: element.width, height: element.height },
    data: { element, canMutate: true, commentCount: 0, ...callbacks },
  };
}
describe("stable canvas nodes", () => {
  it("retains node, data and element identities for a successful confirmation/own timestamp echo", () => {
    const before = [node()],
      after = [
        node({
          ...before[0]!.data.element,
          updated_at: "2026-11-03T12:00:00Z",
        }),
      ];
    expect(stabilizeFlowNodes(before, after)).toBe(before);
  });
  it("changes only the edited node and keeps unrelated nodes untouched", () => {
    const before = [node(), node()];
    const next = stabilizeFlowNodes(before, [
      node({ ...before[0]!.data.element, x: 100 }),
      node(before[1]!.data.element),
    ]);
    expect(next[0]).not.toBe(before[0]);
    expect(next[1]).toBe(before[1]);
  });
  it("pointer preview changes only moving positions without mutating canonical data", () => {
    const before = [node(), node()];
    const next = previewFlowNodes(before, {
      [before[0]!.id]: { x: 200, y: 50 },
    });
    expect(next[1]).toBe(before[1]);
    expect(next[0]!.data).toBe(before[0]!.data);
    expect(next[0]!.position.x).toBe(200);
    expect(before[0]!.data.element.x).not.toBe(200);
  });
});
