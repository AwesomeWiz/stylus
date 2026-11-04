import type { BoardElementRow } from "@/lib/supabase/database.types";
import { objectBounds, visualBounds } from "./operations";
type Box = ReturnType<typeof visualBounds>;
type Anchor = { value: number; box: Box };
export type SmartGuide = {
  axis: "x" | "y";
  value: number;
  from: number;
  to: number;
};
export function buildGuideIndex(
  rows: BoardElementRow[],
  excluded: Set<string>,
  bounds: Box,
) {
  const boxes = rows
    .filter(
      (r) =>
        !excluded.has(r.id) &&
        r.element_type !== "SECTION" &&
        r.element_type !== "GROUP",
    )
    .map(visualBounds)
    .sort(
      (a, b) =>
        Math.hypot(a.x - bounds.x, a.y - bounds.y) -
        Math.hypot(b.x - bounds.x, b.y - bounds.y),
    )
    .slice(0, 128);
  const anchors = (axis: "x" | "y", dimension: "width" | "height") =>
    boxes
      .flatMap((box) =>
        [0, 0.5, 1].map((f) => ({
          value: box[axis] + box[dimension] * f,
          box,
        })),
      )
      .sort((a, b) => a.value - b.value);
  return { boxes, x: anchors("x", "width"), y: anchors("y", "height") };
}
function nearest(anchors: Anchor[], value: number, threshold: number) {
  let lo = 0,
    hi = anchors.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (anchors[mid]!.value < value) lo = mid + 1;
    else hi = mid;
  }
  return [anchors[lo - 1], anchors[lo]]
    .filter((a): a is Anchor => !!a && Math.abs(a.value - value) <= threshold)
    .sort((a, b) => Math.abs(a.value - value) - Math.abs(b.value - value))[0];
}
export function guideMove(
  index: ReturnType<typeof buildGuideIndex>,
  bounds: Box,
  dx: number,
  dy: number,
  {
    zoom = 1,
    snap = true,
    grid = false,
    bypass = false,
  }: { zoom?: number; snap?: boolean; grid?: boolean; bypass?: boolean } = {},
) {
  if (bypass)
    return {
      dx,
      dy,
      guides: [] as SmartGuide[],
      spacing: null as null | { x: number; y: number; gap: number },
    };
  if (grid) {
    dx = Math.round((bounds.x + dx) / 24) * 24 - bounds.x;
    dy = Math.round((bounds.y + dy) / 24) * 24 - bounds.y;
  }
  const guides: SmartGuide[] = [];
  for (const axis of ["x", "y"] as const) {
    const size = axis === "x" ? "width" : "height",
      other = axis === "x" ? "y" : "x",
      otherSize = axis === "x" ? "height" : "width",
      delta = axis === "x" ? dx : dy;
    const matches = [0, 0.5, 1]
      .flatMap((f) => {
        const value = bounds[axis] + delta + bounds[size] * f,
          target = nearest(index[axis], value, (snap ? 6 : 1.5) / zoom);
        return target ? [{ target, offset: target.value - value }] : [];
      })
      .sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset));
    const match = matches[0];
    if (match) {
      if (snap) {
        if (axis === "x") dx += match.offset;
        else dy += match.offset;
      }
      const otherDelta = axis === "x" ? dy : dx;
      guides.push({
        axis,
        value: match.target.value,
        from: Math.min(bounds[other] + otherDelta, match.target.box[other]),
        to: Math.max(
          bounds[other] + otherDelta + bounds[otherSize],
          match.target.box[other] + match.target.box[otherSize],
        ),
      });
    }
  }
  const box = { ...bounds, x: bounds.x + dx, y: bounds.y + dy },
    near = index.boxes.filter(
      (b) => b.y < box.y + box.height && b.y + b.height > box.y,
    ),
    left = near
      .filter((b) => b.x + b.width <= box.x)
      .sort((a, b) => b.x + b.width - a.x - a.width)[0],
    right = near
      .filter((b) => b.x >= box.x + box.width)
      .sort((a, b) => a.x - b.x)[0];
  const gap = left ? box.x - left.x - left.width : 0;
  const spacing =
    left && right && Math.abs(gap - (right.x - box.x - box.width)) <= 2 / zoom
      ? { x: box.x + box.width / 2, y: box.y - 12 / zoom, gap }
      : null;
  return { dx, dy, guides, spacing };
}
export { objectBounds };
