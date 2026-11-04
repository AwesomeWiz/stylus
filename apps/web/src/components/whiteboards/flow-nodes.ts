import { sameElement } from "@/modules/whiteboards/history";
import type { WhiteboardFlowNode } from "./whiteboard-node";

/** Preserve render identity across timestamps/own echoes and unrelated updates. */
export function stabilizeFlowNodes(
  previous: WhiteboardFlowNode[],
  candidates: WhiteboardFlowNode[],
) {
  const byId = new Map(previous.map((node) => [node.id, node]));
  const next = candidates.map((candidate) => {
    const old = byId.get(candidate.id);
    if (!old) return candidate;
    const element =
      old.data.element === candidate.data.element ||
      sameElement(old.data.element, candidate.data.element)
        ? old.data.element
        : candidate.data.element;
    const data: WhiteboardFlowNode["data"] = { ...candidate.data, element };
    if (JSON.stringify(data.reactions) === JSON.stringify(old.data.reactions))
      data.reactions = old.data.reactions;
    if (
      JSON.stringify(data.reactionPending) ===
      JSON.stringify(old.data.reactionPending)
    )
      data.reactionPending = old.data.reactionPending;
    const sameData = Object.keys(data).every(
      (key) => data[key] === old.data[key],
    );
    const samePosition =
      old.position.x === candidate.position.x &&
      old.position.y === candidate.position.y;
    const sameStyle =
      old.style?.width === candidate.style?.width &&
      old.style?.height === candidate.style?.height;
    if (
      sameData &&
      samePosition &&
      sameStyle &&
      old.selected === candidate.selected &&
      old.hidden === candidate.hidden &&
      old.draggable === candidate.draggable &&
      old.zIndex === candidate.zIndex &&
      old.className === candidate.className
    )
      return old;
    return {
      ...candidate,
      position: samePosition ? old.position : candidate.position,
      style: sameStyle ? old.style : candidate.style,
      data: sameData ? old.data : data,
    };
  });
  return next.length === previous.length &&
    next.every((node, index) => node === previous[index])
    ? previous
    : next;
}

export function previewFlowNodes(
  nodes: WhiteboardFlowNode[],
  positions: Record<string, { x: number; y: number }>,
) {
  if (!Object.keys(positions).length) return nodes;
  return nodes.map((node) =>
    positions[node.id] ? { ...node, position: positions[node.id]! } : node,
  );
}
