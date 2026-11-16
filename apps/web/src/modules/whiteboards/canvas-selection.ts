import type { BoardObjectIndex } from "./operations";
export function selectedGroupContext(
  index: BoardObjectIndex,
  ids: readonly string[],
) {
  if (!ids.length) return null;
  const parent = index.byId.get(ids[0]!)?.parent_id;
  return parent &&
    index.byId.get(parent)?.element_type === "GROUP" &&
    ids.every((id) => index.byId.get(id)?.parent_id === parent)
    ? parent
    : null;
}
/** Group context is derived from canonical selection, never a second object model. */
export function canvasSelectionTarget(
  index: BoardObjectIndex,
  ids: readonly string[],
  id: string,
  shift: boolean,
) {
  const context = selectedGroupContext(index, ids);
  const group = (index.parents.get(id) ?? []).find(
    (row) => row.element_type === "GROUP",
  );
  const target = group && context !== group.id ? group.id : id;
  // A new root/Group exits drill-in; Shift only extends compatible siblings there.
  return {
    id: target,
    additive:
      shift && (!context || index.byId.get(target)?.parent_id === context),
  };
}
