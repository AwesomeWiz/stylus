"use client";
import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Frame,
  Group,
  ImageIcon,
  Type,
  StickyNote,
  Shapes,
  ArrowRight,
  Link2,
  LockKeyhole,
  Unlock,
  MoreHorizontal,
  LocateFixed,
} from "lucide-react";
import type { BoardElementRow } from "@/lib/supabase/database.types";
import { objectTitle } from "@/modules/whiteboards/operations";
import { BoardPropertyField } from "./board-property-field";
const icons = {
  SECTION: Frame,
  GROUP: Group,
  IMAGE: ImageIcon,
  TEXT: Type,
  STICKY: StickyNote,
  SHAPE: Shapes,
  ARROW: ArrowRight,
  LINK: Link2,
};
export function BoardOutline({
  rows,
  selected,
  onSelect,
  onLocate,
  onContext,
  onUpdate,
}: {
  rows: BoardElementRow[];
  selected: string[];
  onSelect: (id: string, additive: boolean) => void;
  onLocate: (id: string) => void;
  onContext?: (id: string, x: number, y: number) => void;
  onUpdate?: (
    id: string,
    patch: Partial<BoardElementRow>,
  ) => Promise<BoardElementRow | null>;
}) {
  const [collapsed, setCollapsed] = useState<string[]>([]),
    [renaming, setRenaming] = useState<string | null>(null);
  function branch(parent: string | null, depth = 0): React.ReactNode {
    if (depth > 2) return null;
    return (
      <ul className={depth ? "ml-2 border-l pl-2" : ""}>
        {rows
          .filter((r) => (r.parent_id ?? null) === parent)
          .sort((a, b) => b.z_index - a.z_index || a.id.localeCompare(b.id))
          .map((row) => {
            const container = ["SECTION", "GROUP"].includes(row.element_type),
              Icon = icons[row.element_type];
            return (
              <li
                key={row.id}
                className="py-1"
                onContextMenu={(e) => {
                  if (onContext) {
                    e.preventDefault();
                    e.stopPropagation();
                    onContext(row.id, e.clientX, e.clientY);
                  }
                }}
              >
                <div
                  className={`flex items-center gap-0.5 rounded ${selected.includes(row.id) ? "bg-primary-subtle" : ""}`}
                >
                  {container ? (
                    <button
                      type="button"
                      aria-label={`${collapsed.includes(row.id) ? "Expand" : "Collapse"} ${objectTitle(row)} layers`}
                      aria-expanded={!collapsed.includes(row.id)}
                      className="flex min-h-10 w-6 shrink-0 items-center justify-center"
                      onClick={() =>
                        setCollapsed((ids) =>
                          ids.includes(row.id)
                            ? ids.filter((id) => id !== row.id)
                            : [...ids, row.id],
                        )
                      }
                    >
                      {collapsed.includes(row.id) ? (
                        <ChevronRight className="size-3" />
                      ) : (
                        <ChevronDown className="size-3" />
                      )}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`${row.element_type.toLowerCase()} ${row.locked ? "Locked " : ""}${objectTitle(row)}`}
                    aria-pressed={selected.includes(row.id)}
                    className="flex min-h-10 min-w-0 flex-1 items-center gap-2 px-1 text-left text-xs"
                    onClick={(e) => onSelect(row.id, e.shiftKey)}
                    title={
                      onUpdate ? "Rename with F2 or double-click" : undefined
                    }
                    onKeyDown={(e) => {
                      if (e.key === "F2" && onUpdate) {
                        e.preventDefault();
                        setRenaming(row.id);
                      }
                    }}
                    onDoubleClick={() => onUpdate && setRenaming(row.id)}
                  >
                    <Icon aria-hidden className="size-3.5 shrink-0" />
                    <span className="truncate">{objectTitle(row)}</span>
                  </button>
                  {onUpdate ? (
                    <button
                      type="button"
                      aria-label={`${row.locked ? "Unlock" : "Lock"} ${objectTitle(row)}`}
                      className="flex size-10 shrink-0 items-center justify-center"
                      onClick={() =>
                        void onUpdate(row.id, { locked: !row.locked })
                      }
                    >
                      {row.locked ? (
                        <LockKeyhole aria-hidden className="size-3" />
                      ) : (
                        <Unlock
                          aria-hidden
                          className="text-muted-foreground size-3"
                        />
                      )}
                    </button>
                  ) : row.locked ? (
                    <LockKeyhole aria-label="Locked" className="size-3" />
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Locate ${objectTitle(row)}`}
                    title="Locate on canvas"
                    className="flex size-10 shrink-0 items-center justify-center"
                    onClick={() => onLocate(row.id)}
                  >
                    <LocateFixed aria-hidden className="size-3" />
                  </button>
                  {onContext ? (
                    <button
                      type="button"
                      aria-label={`Actions for ${objectTitle(row)}`}
                      className="flex size-10 shrink-0 items-center justify-center"
                      onClick={(e) => {
                        const b = e.currentTarget.getBoundingClientRect();
                        onContext(row.id, b.left, b.bottom);
                      }}
                    >
                      <MoreHorizontal aria-hidden className="size-3" />
                    </button>
                  ) : null}
                </div>
                {renaming === row.id && onUpdate ? (
                  <BoardPropertyField
                    label="Layer name"
                    value={objectTitle(row)}
                    onCommit={async (value) => {
                      const key = ["TEXT", "STICKY"].includes(row.element_type)
                        ? "text"
                        : row.element_type === "IMAGE"
                          ? "alt"
                          : "title";
                      const saved = await onUpdate(row.id, {
                        content: { ...row.content, [key]: value },
                      });
                      if (saved) setRenaming(null);
                      return !!saved;
                    }}
                  />
                ) : null}
                <span className="sr-only">
                  Position {Math.round(row.x)}, {Math.round(row.y)} ·{" "}
                  {Math.round(row.width)} × {Math.round(row.height)}
                  {row.content.collapsed ? " · Collapsed Section" : ""}
                </span>
                {container && !collapsed.includes(row.id)
                  ? branch(row.id, depth + 1)
                  : null}
              </li>
            );
          })}
      </ul>
    );
  }
  return (
    <section aria-label="Board layers">
      {rows.length ? (
        branch(null)
      ) : (
        <p className="text-sm">No objects yet. Choose a tool to start.</p>
      )}
    </section>
  );
}
