import type { BoardElementRow } from "@/lib/supabase/database.types";
/** Keep source content visible. Placement is local geometry, not a new relation. */
export function nativeInsertionPoint(
  rows: BoardElementRow[],
  start: { x: number; y: number },
) {
  let point = {
    x: Math.min(990000, Math.max(-990000, start.x)),
    y: Math.min(970000, Math.max(-990000, start.y)),
  };
  const objects = rows.filter(
    (row) => !["SECTION", "GROUP"].includes(row.element_type),
  );
  for (let attempt = 0; attempt < 100; attempt++) {
    if (
      !objects.some(
        (row) =>
          point.x < row.x + row.width + 16 &&
          point.x + 316 > row.x &&
          point.y < row.y + row.height + 16 &&
          point.y + 196 > row.y,
      )
    )
      return point;
    point = { x: point.x, y: point.y + 204 };
  }
  throw Error("Choose another canvas area to place this linked item.");
}
