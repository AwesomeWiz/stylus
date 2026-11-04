import type { BoardElementRow } from "@/lib/supabase/database.types";

type LayerStructure = Pick<
  BoardElementRow,
  "id" | "parent_id" | "z_index" | "element_type"
>;
export type BoardLayerIndex = {
  records: LayerStructure[];
  children: Map<string | null, string[]>;
};
/** Display-order projection of canonical ownership; no geometry/content snapshots. */
export function indexBoardLayers(
  previous: BoardLayerIndex | undefined,
  rows: BoardElementRow[],
): BoardLayerIndex {
  if (
    previous &&
    rows.length === previous.records.length &&
    rows.every((row, i) => {
      const old = previous.records[i]!;
      return (
        row.id === old.id &&
        row.parent_id === old.parent_id &&
        row.z_index === old.z_index &&
        row.element_type === old.element_type
      );
    })
  )
    return previous;
  const records = rows.map(({ id, parent_id, z_index, element_type }) => ({
    id,
    parent_id,
    z_index,
    element_type,
  }));
  const groups = new Map<string | null, LayerStructure[]>();
  for (const row of records) {
    const key = row.parent_id ?? null,
      list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  const children = new Map<string | null, string[]>();
  for (const [key, list] of groups)
    children.set(
      key,
      list
        .sort((a, b) => b.z_index - a.z_index || a.id.localeCompare(b.id))
        .map((row) => row.id),
    );
  return { records, children };
}
export function visibleBoardLayers(
  index: BoardLayerIndex,
  collapsed: ReadonlySet<string>,
) {
  const result: { id: string; depth: number }[] = [];
  function visit(parent: string | null, depth: number) {
    if (depth > 2) return;
    for (const id of index.children.get(parent) ?? []) {
      result.push({ id, depth });
      if (!collapsed.has(id)) visit(id, depth + 1);
    }
  }
  visit(null, 0);
  return result;
}
import {
  ancestors,
  canMoveObject,
  expandedIds,
  indexBoardObjects,
  type BoardObjectIndex,
  objectBounds,
} from "./operations";
export type LayerDrop = "before" | "after" | "inside" | "root";

/** Indexed hover validation; no full-board operation or mutation on pointer frames. */
export function layerDropProblem(
  index: BoardObjectIndex,
  sourceId: string,
  targetId: string | null,
  place: LayerDrop,
) {
  const source = index.byId.get(sourceId),
    target = targetId ? index.byId.get(targetId) : undefined;
  if (!source || index.immovable.has(sourceId))
    return "Unlock the layer and its children first.";
  if (
    targetId &&
    (!target ||
      targetId === sourceId ||
      (index.parents.get(targetId) ?? []).some((r) => r.id === sourceId))
  )
    return "A layer cannot be dropped into itself or its children.";
  const parentId =
    place === "root"
      ? null
      : place === "inside"
        ? targetId
        : (target?.parent_id ?? null);
  const parent = parentId ? index.byId.get(parentId) : undefined;
  if (
    parentId &&
    (!parent ||
      !["SECTION", "GROUP"].includes(parent.element_type) ||
      index.immovable.has(parentId))
  )
    return "Choose an unlocked Group or Section.";
  if (source.element_type === "SECTION" && parentId)
    return "Sections cannot nest.";
  if (
    source.element_type === "GROUP" &&
    parent &&
    parent.element_type !== "SECTION"
  )
    return "Groups cannot contain other Groups.";
  if (place === "inside" && !parent) return "Drop into a Group or Section.";
  if (parent?.element_type === "GROUP" && source.parent_id !== parent.id) {
    const bounds = objectBounds([parent, source]);
    if (bounds.width > 10000 || bounds.height > 10000)
      return "Move the object closer; this Group would exceed its maximum size.";
  }
  const oldAncestors = new Set(
    (index.parents.get(sourceId) ?? []).map((r) => r.id),
  );
  const moving = 1 + (index.descendantCounts.get(sourceId) ?? 0);
  for (const container of parent
    ? [parent, ...(index.parents.get(parent.id) ?? [])]
    : []) {
    if (
      !oldAncestors.has(container.id) &&
      (index.descendantCounts.get(container.id) ?? 0) + moving > 199
    )
      return "A container supports at most 199 descendants.";
  }
  return null;
}

/** One bounded operation; coordinates and child identities never change. */
export function dropLayer(
  rows: BoardElementRow[],
  sourceId: string,
  targetId: string | null,
  place: LayerDrop,
) {
  const source = rows.find((r) => r.id === sourceId),
    target = rows.find((r) => r.id === targetId);
  const problem = layerDropProblem(
    indexBoardObjects(rows),
    sourceId,
    targetId,
    place,
  );
  if (problem) throw Error(problem);
  if (!source || !canMoveObject(source, rows))
    throw Error("Unlock the layer and its children first.");
  const movingIds = expandedIds(rows, [sourceId]);
  if (targetId && (!target || movingIds.has(targetId)))
    throw Error("A layer cannot be dropped into itself or its children.");
  const parentId =
    place === "root"
      ? null
      : place === "inside"
        ? targetId
        : (target?.parent_id ?? null);
  const parent = rows.find((r) => r.id === parentId);
  if (parentId && (!parent || !canMoveObject(parent, rows)))
    throw Error("Choose an unlocked container.");
  if (source.element_type === "SECTION" && parentId)
    throw Error("Sections cannot nest.");
  if (
    source.element_type === "GROUP" &&
    parent &&
    parent.element_type !== "SECTION"
  )
    throw Error("Groups cannot contain other Groups.");
  if (place === "inside" && !parent)
    throw Error("Drop into a Section or an existing Group.");
  let next = rows;
  if (parentId !== (source.parent_id ?? null))
    next = rows.map((row) =>
      row.id === sourceId ? { ...row, parent_id: parentId } : row,
    );
  if (parent?.element_type === "GROUP" && parentId !== source.parent_id) {
    // Union only expands bounds: changed dimensions avoid the database's
    // container-translation rule and preserve every child's world coordinates.
    const bounds = objectBounds([parent, source]);
    if (
      bounds.x !== parent.x ||
      bounds.y !== parent.y ||
      bounds.width !== parent.width ||
      bounds.height !== parent.height
    )
      next = next.map((row) =>
        row.id === parent.id ? { ...row, ...bounds } : row,
      );
  }
  const ordered = [...next].sort(
    (a, b) => a.z_index - b.z_index || a.id.localeCompare(b.id),
  );
  const moving = ordered.filter((r) => movingIds.has(r.id)),
    rest = ordered.filter((r) => !movingIds.has(r.id));
  const targetIds = target ? expandedIds(next, [target.id]) : new Set<string>();
  const indexes = rest.flatMap((r, i) => (targetIds.has(r.id) ? [i] : []));
  const index =
    place === "root"
      ? rest.length
      : place === "after"
        ? Math.min(...indexes)
        : Math.max(...indexes) + 1;
  if (!Number.isFinite(index))
    throw Error("Drop target is no longer available.");
  const positions = new Map<string, number>(),
    low = rest[index - 1]?.z_index ?? -1000001,
    high = rest[index]?.z_index ?? 1000001;
  if (high - low - 1 >= moving.length) {
    // Prefer nearby integers at the ends instead of huge hidden offsets.
    const start =
      index === rest.length
        ? low + 1
        : index === 0
          ? high - moving.length
          : low + 1;
    moving.forEach((r, i) => positions.set(r.id, start + i));
  } else {
    const result = [...rest.slice(0, index), ...moving, ...rest.slice(index)];
    let a = 0,
      b = result.length - 1;
    while (a < result.length && result[a]!.id === ordered[a]!.id) a++;
    while (b >= a && result[b]!.id === ordered[b]!.id) b--;
    if (a > b) return next;
    // Reuse the affected integer slots; extend to all rows only on small boards.
    if (result.length <= 200) {
      a = 0;
      b = result.length - 1;
    }
    if (b - a + 1 > 200)
      throw Error(
        "This reorder affects more than 200 objects. Use a nearer drop or Bring to front/Send to back.",
      );
    const lo = result[a - 1]?.z_index ?? -1000001,
      hi = result[b + 1]?.z_index ?? 1000001;
    if (hi - lo - 1 < b - a + 1)
      throw Error(
        "There is no bounded layer-order space here. Use Bring to front or Send to back.",
      );
    const step = Math.max(1, Math.floor((hi - lo) / (b - a + 2)));
    for (let i = a; i <= b; i++)
      positions.set(result[i]!.id, lo + (i - a + 1) * step);
  }
  next = next.map((r) =>
    positions.has(r.id) && positions.get(r.id) !== r.z_index
      ? { ...r, z_index: positions.get(r.id)! }
      : r,
  );
  const changed = next.filter((r, i) => r !== rows[i]).map((r) => r.id);
  if (expandedIds(rows, changed).size > 200)
    throw Error("This action affects more than 200 objects.");
  return next;
}

export function layerNamePatch(
  row: BoardElementRow,
  value: string,
): Partial<BoardElementRow> {
  const label = value.trim();
  if (!label || label.length > 200)
    throw Error("Use a name from 1 to 200 characters.");
  return ["SECTION", "GROUP", "LINK"].includes(row.element_type)
    ? { content: { ...row.content, title: label } }
    : { metadata: { ...row.metadata, label } };
}
export function parentSelected(
  row: BoardElementRow,
  rows: BoardElementRow[],
  selected: string[],
) {
  return ancestors(row, rows).some((r) => selected.includes(r.id));
}
