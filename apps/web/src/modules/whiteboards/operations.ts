import type {
  BoardElementRow,
  BoardElementType,
} from "@/lib/supabase/database.types";
import { defaultElementData, defaultElementSize, nextZIndex } from "./elements";
import { diffWhiteboardSnapshots } from "./history";

export const BOARD_OPERATION_LIMIT = 200;
export function objectTitle(row: BoardElementRow) {
  return String(
    row.content.title ??
      row.content.text ??
      row.content.alt ??
      (
        {
          IMAGE: "Image",
          SHAPE: row.content.shape ?? "Shape",
          ARROW: "Arrow",
        } as Record<string, unknown>
      )[row.element_type] ??
      row.element_type.toLowerCase(),
  ).slice(0, 200);
}
export function ancestors(row: BoardElementRow, rows: BoardElementRow[]) {
  const result: BoardElementRow[] = [];
  let parent = rows.find((item) => item.id === row.parent_id);
  while (
    parent &&
    !result.some((item) => item.id === parent!.id) &&
    result.length < 3
  ) {
    result.push(parent);
    parent = rows.find((item) => item.id === parent!.parent_id);
  }
  return result;
}
export function expandedIds(rows: BoardElementRow[], ids: string[]) {
  const result = new Set(ids);
  for (let i = 0; i < 3; i++)
    for (const row of rows)
      if (row.parent_id && result.has(row.parent_id)) result.add(row.id);
  return result;
}
export function selectionRoots(rows: BoardElementRow[], ids: string[]) {
  const selected = new Set(ids);
  return rows.filter(
    (row) =>
      selected.has(row.id) &&
      !ancestors(row, rows).some((parent) => selected.has(parent.id)),
  );
}
export function isObjectLocked(row: BoardElementRow, rows: BoardElementRow[]) {
  return Boolean(
    row.locked || ancestors(row, rows).some((parent) => parent.locked),
  );
}
export function canMoveObject(row: BoardElementRow, rows: BoardElementRow[]) {
  if (row.element_type !== "SECTION" && row.element_type !== "GROUP")
    return !isObjectLocked(row, rows);
  const descendants = expandedIds(rows, [row.id]);
  return !rows.some(
    (item) => descendants.has(item.id) && isObjectLocked(item, rows),
  );
}
/** Build once per committed snapshot, never once per pointer/cursor movement. */
export function indexBoardObjects(rows: BoardElementRow[]) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const parents = new Map<string, BoardElementRow[]>();
  const immovable = new Set<string>();
  const children = new Map<string, BoardElementRow[]>();
  const layers = new Map(rows.map((row) => [row.id, row.z_index]));
  for (const row of rows) {
    if (row.parent_id)
      children.set(row.parent_id, [
        ...(children.get(row.parent_id) ?? []),
        row,
      ]);
    const chain: BoardElementRow[] = [];
    let parent = byId.get(row.parent_id ?? "");
    while (parent && chain.length < 3) {
      chain.push(parent);
      parent = byId.get(parent.parent_id ?? "");
    }
    parents.set(row.id, chain);
    if (row.locked || chain.some((entry) => entry.locked)) {
      immovable.add(row.id);
      for (const entry of chain) immovable.add(entry.id);
    }
  }
  // Frames stay behind their own children, while persisted order still controls
  // the entire block relative to other board objects.
  for (const kind of ["GROUP", "SECTION"])
    for (const row of rows)
      if (row.element_type === kind) {
        const owned = children.get(row.id) ?? [];
        layers.set(
          row.id,
          owned.length
            ? Math.min(
                row.z_index,
                ...owned.map((child) => layers.get(child.id)!),
              ) - 0.25
            : row.z_index,
        );
      }
  return { parents, immovable, layers };
}
export function visualBounds(row: BoardElementRow) {
  const angle = (row.rotation * Math.PI) / 180,
    width =
      Math.abs(Math.cos(angle)) * row.width +
      Math.abs(Math.sin(angle)) * row.height,
    height =
      Math.abs(Math.sin(angle)) * row.width +
      Math.abs(Math.cos(angle)) * row.height;
  return {
    x: row.x + (row.width - width) / 2,
    y: row.y + (row.height - height) / 2,
    width,
    height,
  };
}
export function objectBounds(rows: BoardElementRow[]) {
  const boxes = rows.map(visualBounds),
    x = Math.min(...boxes.map((r) => r.x)),
    y = Math.min(...boxes.map((r) => r.y));
  return {
    x,
    y,
    width: Math.max(...boxes.map((r) => r.x + r.width)) - x,
    height: Math.max(...boxes.map((r) => r.y + r.height)) - y,
  };
}
export function sectionFromSelection(
  rows: BoardElementRow[],
  ids: string[],
  make: (bounds: ReturnType<typeof objectBounds>) => BoardElementRow,
) {
  const selected = selectionRoots(rows, ids);
  if (
    !selected.length ||
    selected.some(
      (r) =>
        r.parent_id || r.element_type === "SECTION" || !canMoveObject(r, rows),
    )
  )
    throw Error(
      "Choose unlocked loose objects or Groups. Sections cannot nest.",
    );
  const section = make(objectBounds(selected)),
    chosen = new Set(selected.map((r) => r.id));
  if (expandedIds(rows, [...chosen]).size + 1 > 200)
    throw Error(
      "This action affects more than 200 objects. Reduce the selection and try again.",
    );
  return {
    rows: [
      section,
      ...rows.map((r) =>
        chosen.has(r.id) ? { ...r, parent_id: section.id } : r,
      ),
    ],
    id: section.id,
  };
}
export function createLocalObject(
  type: BoardElementType,
  boardId: string,
  organizationId: string,
  userId: string,
  rows: BoardElementRow[],
  position: { x: number; y: number },
  overrides: Partial<BoardElementRow> = {},
): BoardElementRow {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    board_id: boardId,
    organization_id: organizationId,
    element_type: type,
    ...defaultElementData(type),
    ...defaultElementSize[type],
    ...position,
    rotation: 0,
    z_index: nextZIndex(rows),
    parent_id: null,
    locked: false,
    metadata: {},
    archived_at: null,
    created_by: userId,
    updated_by: userId,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}
export function projectObject(row: BoardElementRow) {
  return {
    id: row.id,
    element_type: row.element_type,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    rotation: row.rotation,
    z_index: row.z_index,
    parent_id: row.parent_id ?? null,
    locked: row.locked ?? false,
    content: row.content,
    style: row.style,
    metadata: row.metadata,
  };
}
export function operationPayload(
  boardId: string,
  before: BoardElementRow[],
  after: BoardElementRow[],
) {
  const diff = diffWhiteboardSnapshots(before, after);
  const payload = {
    boardId,
    archiveIds: diff.archiveIds,
    upserts: [...diff.restore, ...diff.update].map(projectObject),
  };
  if (
    payload.archiveIds.length + payload.upserts.length >
    BOARD_OPERATION_LIMIT
  )
    throw new Error("Choose at most 200 objects for one operation.");
  return payload;
}
export function moveObjects(
  rows: BoardElementRow[],
  ids: string[],
  dx: number,
  dy: number,
) {
  const roots = selectionRoots(rows, ids).filter((row) =>
    canMoveObject(row, rows),
  );
  if (!roots.length)
    throw new Error(
      "Unlock the selected objects and their children before moving.",
    );
  const moving = expandedIds(
    rows,
    roots.map((row) => row.id),
  );
  return rows.map((row) =>
    moving.has(row.id) ? { ...row, x: row.x + dx, y: row.y + dy } : row,
  );
}
export function groupObjects(
  rows: BoardElementRow[],
  ids: string[],
  make: (
    bounds: ReturnType<typeof objectBounds>,
    parentId: string | null,
  ) => BoardElementRow,
) {
  const selected = selectionRoots(rows, ids);
  if (
    selected.length < 2 ||
    selected.some(
      (row) =>
        ["SECTION", "GROUP"].includes(row.element_type) ||
        isObjectLocked(row, rows),
    )
  )
    throw new Error(
      "Choose at least two unlocked objects; ungroup existing groups first.",
    );
  const parentId = selected[0]!.parent_id ?? null;
  if (
    selected.some((row) => (row.parent_id ?? null) !== parentId) ||
    rows.some((row) => row.id === parentId && row.element_type === "GROUP")
  )
    throw new Error("Group objects from the same Section or from the board.");
  const group = make(objectBounds(selected), parentId);
  const chosen = new Set(selected.map((row) => row.id));
  return [
    ...rows.map((row) =>
      chosen.has(row.id) ? { ...row, parent_id: group.id } : row,
    ),
    group,
  ];
}
export function ungroupObjects(rows: BoardElementRow[], ids: string[]) {
  const groups = rows.filter(
    (row) => ids.includes(row.id) && row.element_type === "GROUP",
  );
  if (!groups.length || groups.some((row) => !canMoveObject(row, rows)))
    throw new Error("Select an unlocked group and unlock its children first.");
  const groupMap = new Map(groups.map((row) => [row.id, row]));
  return rows
    .filter((row) => !groupMap.has(row.id))
    .map((row) =>
      row.parent_id && groupMap.has(row.parent_id)
        ? { ...row, parent_id: groupMap.get(row.parent_id)!.parent_id ?? null }
        : row,
    );
}
export function assignSection(
  rows: BoardElementRow[],
  ids: string[],
  sectionId: string | null,
) {
  const section = rows.find((row) => row.id === sectionId);
  if (
    sectionId &&
    (!section || section.element_type !== "SECTION" || section.locked)
  )
    throw new Error("Choose an unlocked Section.");
  const selected = selectionRoots(rows, ids);
  if (
    selected.some(
      (row) =>
        row.element_type === "SECTION" ||
        !canMoveObject(row, rows) ||
        ancestors(row, rows)[0]?.element_type === "GROUP",
    )
  )
    throw new Error(
      "Sections cannot nest. Ungroup or unlock these objects first.",
    );
  const chosen = new Set(selected.map((row) => row.id));
  return rows.map((row) =>
    chosen.has(row.id) ? { ...row, parent_id: sectionId } : row,
  );
}
export function archiveObjects(
  rows: BoardElementRow[],
  ids: string[],
  keepSectionChildren = false,
) {
  const roots = selectionRoots(rows, ids);
  const removed = new Set<string>();
  for (const row of roots) {
    if (isObjectLocked(row, rows))
      throw new Error("Unlock selected objects before archiving.");
    if (row.element_type === "SECTION" && keepSectionChildren)
      removed.add(row.id);
    else for (const id of expandedIds(rows, [row.id])) removed.add(id);
  }
  return rows
    .filter((row) => !removed.has(row.id))
    .map((row) =>
      row.parent_id && removed.has(row.parent_id)
        ? { ...row, parent_id: null }
        : row,
    );
}
export function duplicateObjects(
  rows: BoardElementRow[],
  ids: string[],
  userId: string,
) {
  const chosen = expandedIds(
    rows,
    selectionRoots(rows, ids).map((row) => row.id),
  );
  const originals = rows.filter((row) => chosen.has(row.id));
  if (!originals.length || originals.length > 200)
    throw new Error("Duplicate between 1 and 200 objects.");
  const newIds = new Map(originals.map((row) => [row.id, crypto.randomUUID()]));
  const now = new Date().toISOString(),
    top = nextZIndex(rows);
  const copies = originals.map((row, index) => ({
    ...row,
    id: newIds.get(row.id)!,
    parent_id: newIds.get(row.parent_id ?? "") ?? row.parent_id ?? null,
    x: row.x + 24,
    y: row.y + 24,
    z_index: top + index,
    created_by: userId,
    updated_by: userId,
    created_at: now,
    updated_at: now,
    content: ["SECTION", "GROUP"].includes(row.element_type)
      ? { ...row.content, title: `${objectTitle(row)} (copy)`.slice(0, 200) }
      : { ...row.content },
  }));
  return {
    rows: [...rows, ...copies],
    ids: selectionRoots(
      copies,
      copies.map((row) => row.id),
    ).map((row) => row.id),
  };
}
export type Alignment =
  "left" | "center" | "right" | "top" | "middle" | "bottom";
export function alignObjects(
  rows: BoardElementRow[],
  ids: string[],
  alignment: Alignment,
) {
  const selected = selectionRoots(rows, ids);
  if (selected.length < 2)
    throw new Error("Select at least two objects to align.");
  const bounds = objectBounds(selected);
  let result = rows;
  for (const row of selected)
    if (canMoveObject(row, rows)) {
      const box = visualBounds(row);
      const x =
        alignment === "left"
          ? bounds.x
          : alignment === "center"
            ? bounds.x + (bounds.width - box.width) / 2
            : alignment === "right"
              ? bounds.x + bounds.width - box.width
              : box.x;
      const y =
        alignment === "top"
          ? bounds.y
          : alignment === "middle"
            ? bounds.y + (bounds.height - box.height) / 2
            : alignment === "bottom"
              ? bounds.y + bounds.height - box.height
              : box.y;
      result = moveObjects(result, [row.id], x - box.x, y - box.y);
    }
  return result;
}
export function distributeObjects(
  rows: BoardElementRow[],
  ids: string[],
  axis: "x" | "y",
) {
  const selected = selectionRoots(rows, ids);
  if (selected.length < 3 || selected.some((row) => !canMoveObject(row, rows)))
    throw new Error("Select at least three unlocked objects to distribute.");
  const dimension = axis === "x" ? "width" : "height";
  const ordered = selected
    .map((row) => ({ row, box: visualBounds(row) }))
    .sort(
      (a, b) => a.box[axis] - b.box[axis] || a.row.id.localeCompare(b.row.id),
    );
  const start = ordered[0]!.box[axis],
    end = Math.max(...ordered.map((r) => r.box[axis] + r.box[dimension]));
  const gap =
    (end - start - ordered.reduce((sum, r) => sum + r.box[dimension], 0)) /
    (ordered.length - 1);
  let offset = start,
    result = rows;
  for (const { row, box } of ordered) {
    result = moveObjects(
      result,
      [row.id],
      axis === "x" ? offset - box.x : 0,
      axis === "y" ? offset - box.y : 0,
    );
    offset += box[dimension] + gap;
  }
  return result;
}
export function matchObjectSize(
  rows: BoardElementRow[],
  ids: string[],
  dimension: "width" | "height",
) {
  const selected = selectionRoots(rows, ids);
  if (
    selected.length < 2 ||
    selected.some(
      (row) =>
        ["SECTION", "GROUP", "ARROW"].includes(row.element_type) ||
        isObjectLocked(row, rows),
    )
  )
    throw new Error(
      "Choose at least two unlocked text, image, link or shape objects.",
    );
  const size = Math.max(...selected.map((row) => row[dimension]));
  const chosen = new Set(selected.map((row) => row.id));
  return rows.map((row) => {
    if (!chosen.has(row.id)) return row;
    const other = dimension === "width" ? "height" : "width";
    return {
      ...row,
      [dimension]: size,
      ...((row.element_type === "IMAGE" && row.style.aspectLock !== false) ||
      (row.element_type === "SHAPE" && row.content.shape === "circle")
        ? { [other]: (row[other] * size) / row[dimension] }
        : {}),
    };
  });
}
export function layerObjects(
  rows: BoardElementRow[],
  ids: string[],
  direction: "BACKWARD" | "FORWARD" | "FRONT" | "BACK",
) {
  const chosen = expandedIds(rows, ids),
    ordered = [...rows].sort(
      (a, b) => a.z_index - b.z_index || a.id.localeCompare(b.id),
    );
  const selected = ordered.filter((row) => chosen.has(row.id)),
    rest = ordered.filter((row) => !chosen.has(row.id));
  if (!selected.length) return rows;
  const positions = new Map<string, number>();
  if (direction === "FRONT" || direction === "BACK") {
    const start =
      direction === "FRONT"
        ? Math.max(...rows.map((row) => row.z_index)) + 1
        : Math.min(...rows.map((row) => row.z_index)) - selected.length;
    selected.forEach((row, i) => positions.set(row.id, start + i));
  } else {
    const first = ordered.findIndex((row) => chosen.has(row.id)),
      last = ordered.findLastIndex((row) => chosen.has(row.id));
    const neighbor =
      direction === "FORWARD"
        ? ordered.slice(last + 1).find((row) => !chosen.has(row.id))
        : ordered.slice(0, first).findLast((row) => !chosen.has(row.id));
    if (!neighbor) return rows;
    const values = [...selected, neighbor]
      .map((row) => row.z_index)
      .sort((a, b) => a - b);
    const block =
      direction === "FORWARD"
        ? [neighbor, ...selected]
        : [...selected, neighbor];
    if (new Set(values).size === values.length)
      block.forEach((row, i) => positions.set(row.id, values[i]!));
    else {
      const target =
        rest.findIndex((row) => row.id === neighbor.id) +
        (direction === "FORWARD" ? 1 : 0);
      rest.splice(target, 0, ...selected);
      rest.forEach((row, i) => positions.set(row.id, i + 1));
    }
  }
  return rows.map((row) =>
    positions.has(row.id) && row.z_index !== positions.get(row.id)
      ? { ...row, z_index: positions.get(row.id)! }
      : row,
  );
}
