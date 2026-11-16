import type { BoardElementRow } from "@/lib/supabase/database.types";
export type BoardPresentationState = {
  id: string;
  index: number;
  notice: string | null;
};
/** Layers displays highest stored layer first, with UUID as the stable tie break. */
export function presentationSections(rows: BoardElementRow[]) {
  return rows
    .filter(
      (row) =>
        row.element_type === "SECTION" && !row.parent_id && !row.archived_at,
    )
    .sort((a, b) => b.z_index - a.z_index || a.id.localeCompare(b.id));
}
export function presentationTitle(row: BoardElementRow) {
  return String(row.content.title ?? "").trim() || "Untitled section";
}
export function startPresentation(
  sections: BoardElementRow[],
  selected: readonly string[],
): BoardPresentationState | null {
  const index = sections.findIndex((row) => selected.includes(row.id));
  const at = index < 0 ? 0 : index;
  return sections[at] ? { id: sections[at].id, index: at, notice: null } : null;
}
export function reconcilePresentation(
  state: BoardPresentationState | null,
  sections: BoardElementRow[],
) {
  if (!state) return null;
  const index = sections.findIndex((row) => row.id === state.id);
  if (index >= 0) return state.index === index ? state : { ...state, index };
  const fallback = Math.min(state.index, sections.length - 1);
  return sections[fallback]
    ? {
        id: sections[fallback].id,
        index: fallback,
        notice:
          "The previous Section is unavailable. Showing the nearest Section.",
      }
    : null;
}
export function movePresentation(
  state: BoardPresentationState,
  sections: BoardElementRow[],
  delta: number,
) {
  const index = Math.max(0, Math.min(sections.length - 1, state.index + delta));
  return sections[index] && sections[index].id !== state.id
    ? { id: sections[index].id, index, notice: null }
    : state;
}
