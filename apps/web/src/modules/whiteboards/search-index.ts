import type { BoardElementRow } from "@/lib/supabase/database.types";
import { objectTitle } from "./operations";

export type BoardSearchEntry = {
  id: string;
  title: string;
  text: unknown;
  note: unknown;
  alt: unknown;
  normalized: string;
};
/** Only changed searchable content is normalized; geometry/audit updates reuse entries. */
export function updateBoardSearchIndex(
  previous: BoardSearchEntry[],
  rows: BoardElementRow[],
  nativeTitles?: ReadonlyMap<string, string>,
) {
  const byId = new Map(previous.map((entry) => [entry.id, entry]));
  const next = rows.map((row) => {
    const old = byId.get(row.id),
      title =
        row.element_type === "ENTITY_CARD"
          ? (nativeTitles?.get(row.id) ?? "Stylus item")
          : objectTitle(row),
      { text, note, alt } = row.content;
    if (
      old &&
      old.title === title &&
      old.text === text &&
      old.note === note &&
      old.alt === alt
    )
      return old;
    return {
      id: row.id,
      title,
      text,
      note,
      alt,
      normalized: [title, text, note, alt]
        .filter((value) => typeof value === "string")
        .join(" ")
        .toLocaleLowerCase(),
    };
  });
  return next.length === previous.length &&
    next.every((entry, i) => entry === previous[i])
    ? previous
    : next;
}
