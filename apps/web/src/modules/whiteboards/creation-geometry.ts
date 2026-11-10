type Point = { x: number; y: number };
export type CreationGeometry = Point & {
  width: number;
  height: number;
  rotation?: number;
};

/** Geometry uses world coordinates; the click/drag threshold is measured separately in pixels. */
export function creationGeometry(
  start: Point,
  end: Point,
  line: boolean,
  constrain: boolean,
): CreationGeometry {
  let dx = end.x - start.x,
    dy = end.y - start.y;
  if (line) {
    let angle = Math.atan2(dy, dx);
    if (constrain) angle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    const length = Math.max(14, Math.min(9990, Math.hypot(dx, dy)));
    dx = Math.cos(angle) * length;
    dy = Math.sin(angle) * length;
    // Existing Arrow renderer draws from local x=2 to width-8, centered vertically.
    const width = length + 10;
    return {
      x: start.x + dx / 2 + 3 * Math.cos(angle) - width / 2,
      y: start.y + dy / 2 + 3 * Math.sin(angle) - 12,
      width,
      height: 24,
      rotation: (angle * 180) / Math.PI,
    };
  }
  if (constrain) {
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    dx = (dx < 0 ? -1 : 1) * size;
    dy = (dy < 0 ? -1 : 1) * size;
  }
  const width = Math.max(24, Math.min(10000, Math.abs(dx))),
    height = Math.max(24, Math.min(10000, Math.abs(dy)));
  return {
    x: dx < 0 ? start.x - width : start.x,
    y: dy < 0 ? start.y - height : start.y,
    width,
    height,
  };
}
