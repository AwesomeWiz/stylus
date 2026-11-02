import type { BoardElementRow } from "@/lib/supabase/database.types";
import { objectTitle } from "@/modules/whiteboards/operations";
import { Button } from "@/components/ui/button";
export function BoardOutline({
  rows,
  selected,
  onSelect,
  onLocate,
}: {
  rows: BoardElementRow[];
  selected: string[];
  onSelect: (id: string, additive: boolean) => void;
  onLocate: (id: string) => void;
}) {
  function branch(parent: string | null, depth = 0) {
    if (depth > 2) return null;
    return (
      <ul className={depth ? "ml-3 border-l pl-3" : ""}>
        {rows
          .filter((row) => (row.parent_id ?? null) === parent)
          .map((row) => (
            <li className="py-1" key={row.id}>
              <div className="flex items-center gap-1">
                <button
                  aria-pressed={selected.includes(row.id)}
                  className="hover:bg-muted min-h-11 min-w-0 flex-1 rounded px-2 py-2 text-left text-sm [overflow-wrap:anywhere]"
                  onClick={(event) => onSelect(row.id, event.shiftKey)}
                  type="button"
                >
                  <span className="text-muted-foreground block text-xs capitalize">
                    {row.element_type.toLowerCase()}
                    {row.locked ? " · Locked" : ""}
                    {row.element_type === "SECTION" && row.content.collapsed
                      ? " · Collapsed"
                      : ""}
                  </span>
                  {objectTitle(row)}
                </button>
                <Button
                  aria-label={`Locate ${objectTitle(row)}`}
                  className="shrink-0 px-2 text-xs"
                  onClick={() => onLocate(row.id)}
                  variant="ghost"
                >
                  Locate
                </Button>
              </div>
              <span className="text-muted-foreground px-2 text-xs">
                Position {Math.round(row.x)}, {Math.round(row.y)} ·{" "}
                {Math.round(row.width)} × {Math.round(row.height)}
              </span>
              {row.element_type === "SECTION" || row.element_type === "GROUP"
                ? branch(row.id, depth + 1)
                : null}
            </li>
          ))}
      </ul>
    );
  }
  return (
    <section aria-label="Board object outline">
      <p className="text-muted-foreground mb-3 text-xs leading-5">
        Select to inspect. Shift-select adds an object. Locate reveals collapsed
        context without changing saved structure.
      </p>
      {rows.length ? (
        branch(null)
      ) : (
        <p className="text-sm">
          No objects yet. Choose a tool, then press Enter on the canvas to
          insert at its center.
        </p>
      )}
    </section>
  );
}
