"use client";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
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
import {
  expandedIds,
  indexBoardObjects,
  objectTitle,
} from "@/modules/whiteboards/operations";
import { layerNamePatch, type LayerDrop } from "@/modules/whiteboards/layers";
import { BoardSearch } from "./board-search";
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
type Target = { id: string | null; place: LayerDrop };
export function BoardOutline({
  rows,
  selected,
  onSelect,
  onLocate,
  onContext,
  onUpdate,
  onDrop,
  onHover,
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
  onDrop?: (
    id: string,
    target: string | null,
    place: LayerDrop,
  ) => Promise<boolean>;
  onHover?: (id: string | null) => void;
}) {
  const [collapsed, setCollapsed] = useState<string[]>([]),
    [renaming, setRenaming] = useState<string | null>(null),
    [draft, setDraft] = useState(""),
    [message, setMessage] = useState(""),
    [focused, setFocused] = useState<string | null>(null),
    [drop, setDrop] = useState<Target | null>(null);
  const root = useRef<HTMLElement>(null),
    drag = useRef<string | null>(null),
    expand = useRef<ReturnType<typeof setTimeout> | null>(null),
    scroll = useRef<ReturnType<typeof setInterval> | null>(null),
    scrollSpeed = useRef(0),
    saving = useRef(false),
    skipBlur = useRef(false);
  const structure = useMemo(() => indexBoardObjects(rows), [rows]);
  const hoverTarget = useRef<string | null>(null);
  const children = useMemo(() => {
    const map = new Map<string | null, BoardElementRow[]>();
    for (const row of rows) {
      const key = row.parent_id ?? null;
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    for (const list of map.values())
      list.sort((a, b) => b.z_index - a.z_index || a.id.localeCompare(b.id));
    return map;
  }, [rows]);
  const visible: BoardElementRow[] = [];
  function collect(parent: string | null, depth = 0) {
    if (depth > 2) return;
    for (const row of children.get(parent) ?? []) {
      visible.push(row);
      if (!collapsed.includes(row.id)) collect(row.id, depth + 1);
    }
  }
  collect(null);
  function cleanup() {
    hoverTarget.current = null;
    if (expand.current) clearTimeout(expand.current);
    if (scroll.current) clearInterval(scroll.current);
    expand.current = null;
    scroll.current = null;
    scrollSpeed.current = 0;
    drag.current = null;
    setDrop(null);
  }
  useEffect(
    () => () => {
      if (expand.current) clearTimeout(expand.current);
      if (scroll.current) clearInterval(scroll.current);
    },
    [],
  );
  function focus(id: string) {
    setFocused(id);
    requestAnimationFrame(() =>
      root.current
        ?.querySelector<HTMLElement>(`[data-layer-id="${id}"]`)
        ?.focus(),
    );
  }
  function rename(row: BoardElementRow) {
    if (!onUpdate || structure.immovable.has(row.id)) return;
    setRenaming(row.id);
    setDraft(objectTitle(row));
    setMessage("");
  }
  async function saveName(row: BoardElementRow) {
    if (skipBlur.current) {
      skipBlur.current = false;
      return;
    }
    if (saving.current || !onUpdate) return;
    try {
      const patch = layerNamePatch(row, draft);
      saving.current = true;
      const result = await onUpdate(row.id, patch);
      if (!result)
        throw Error("Name could not save. The saved name is unchanged.");
      setRenaming(null);
      focus(row.id);
      setMessage("Layer renamed.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      saving.current = false;
    }
  }
  function targetOver(event: DragEvent, id: string | null, place: LayerDrop) {
    if (!drag.current || !onDrop) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDrop((old) =>
      old?.id === id && old.place === place ? old : { id, place },
    );
    const hoverKey = id && place === "inside" ? id : null;
    if (hoverTarget.current !== hoverKey) {
      if (expand.current) clearTimeout(expand.current);
      hoverTarget.current = hoverKey;
      if (hoverKey && collapsed.includes(hoverKey))
        expand.current = setTimeout(
          () =>
            setCollapsed((ids) => ids.filter((value) => value !== hoverKey)),
          500,
        );
    }
    const region =
      root.current?.closest<HTMLElement>("[data-board-scroll]") ?? root.current;
    if (region) {
      const box = region.getBoundingClientRect();
      scrollSpeed.current =
        event.clientY < box.top + 40
          ? -8
          : event.clientY > box.bottom - 40
            ? 8
            : 0;
      if (!scroll.current)
        scroll.current = setInterval(() => {
          region.scrollTop += scrollSpeed.current;
        }, 16);
    }
  }
  async function dropped(event: DragEvent, target: Target) {
    event.preventDefault();
    event.stopPropagation();
    const id = drag.current;
    cleanup();
    if (!id || !onDrop) return;
    try {
      const saved = await onDrop(id, target.id, target.place);
      setMessage(
        saved
          ? "Layer moved."
          : "Layer could not move. Saved structure is unchanged.",
      );
      if (saved) focus(id);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  function branch(parent: string | null, depth = 0): React.ReactNode {
    if (depth > 2) return null;
    return (
      <ul
        id={parent ? `layer-children-${parent}` : undefined}
        role={depth ? "group" : undefined}
        className={depth ? "ml-3 border-l pl-1" : ""}
      >
        {(children.get(parent) ?? []).map((row) => {
          const container = ["SECTION", "GROUP"].includes(row.element_type),
            Icon = icons[row.element_type],
            ownSelected = selected.includes(row.id),
            parentChosen = (structure.parents.get(row.id) ?? []).some((r) =>
              selected.includes(r.id),
            ),
            childChosen =
              collapsed.includes(row.id) &&
              [...expandedIds(rows, [row.id])].some(
                (id) => id !== row.id && selected.includes(id),
              );
          const place = drop?.id === row.id ? drop.place : null;
          return (
            <li role="none" key={row.id}>
              <div
                role="treeitem"
                aria-owns={
                  container && !collapsed.includes(row.id)
                    ? `layer-children-${row.id}`
                    : undefined
                }
                aria-level={depth + 1}
                aria-selected={ownSelected}
                aria-expanded={
                  container ? !collapsed.includes(row.id) : undefined
                }
                aria-label={`${row.element_type.toLowerCase()} ${objectTitle(row)}${row.locked ? ", locked" : ""}${childChosen ? ", selected child" : ""}`}
                tabIndex={
                  focused === row.id || (!focused && visible[0]?.id === row.id)
                    ? 0
                    : -1
                }
                data-layer-id={row.id}
                className={`group/layer relative flex min-h-10 items-center gap-1 rounded px-1 outline-offset-[-2px] ${ownSelected ? "bg-primary-subtle" : parentChosen ? "bg-muted/60" : "hover:bg-muted/50"} ${place === "inside" ? "ring-primary ring-2 ring-inset" : ""}`}
                onFocus={() => setFocused(row.id)}
                onMouseEnter={() => onHover?.(row.id)}
                onMouseLeave={() => onHover?.(null)}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("button,input"))
                    return;
                  if (!ownSelected || event.shiftKey)
                    onSelect(row.id, event.shiftKey);
                }}
                onContextMenu={(event) => {
                  if (onContext) {
                    event.preventDefault();
                    event.stopPropagation();
                    onContext(row.id, event.clientX, event.clientY);
                  }
                }}
                onKeyDown={(event) => {
                  if ((event.target as HTMLElement).tagName === "INPUT") return;
                  if (event.key === "F2") {
                    event.preventDefault();
                    rename(row);
                  } else if (
                    event.key === "ContextMenu" ||
                    (event.shiftKey && event.key === "F10")
                  ) {
                    event.preventDefault();
                    const b = event.currentTarget.getBoundingClientRect();
                    onContext?.(row.id, b.left, b.bottom);
                  } else if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(row.id, event.shiftKey);
                  } else if (
                    event.key === "ArrowDown" ||
                    event.key === "ArrowUp"
                  ) {
                    event.preventDefault();
                    const i = visible.findIndex((r) => r.id === row.id);
                    const next =
                      visible[i + (event.key === "ArrowDown" ? 1 : -1)];
                    if (next) focus(next.id);
                  } else if (event.key === "Home" || event.key === "End") {
                    event.preventDefault();
                    const next =
                      event.key === "Home" ? visible[0] : visible.at(-1);
                    if (next) focus(next.id);
                  } else if (event.key === "ArrowRight" && container) {
                    event.preventDefault();
                    if (collapsed.includes(row.id))
                      setCollapsed((ids) => ids.filter((id) => id !== row.id));
                    else if (children.get(row.id)?.[0])
                      focus(children.get(row.id)![0]!.id);
                  } else if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    if (container && !collapsed.includes(row.id))
                      setCollapsed((ids) => [...ids, row.id]);
                    else if (row.parent_id) focus(row.parent_id);
                  }
                }}
                draggable={
                  !!onDrop &&
                  !structure.immovable.has(row.id) &&
                  renaming !== row.id
                }
                onDragStart={(event) => {
                  drag.current = row.id;
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData(
                    "application/x-stylus-layer",
                    row.id,
                  );
                  setMessage(
                    "Drop on a container to move inside, or between rows to reorder.",
                  );
                }}
                onDragEnd={cleanup}
                onDragOver={(event) => {
                  const b = event.currentTarget.getBoundingClientRect(),
                    ratio = (event.clientY - b.top) / Math.max(1, b.height);
                  targetOver(
                    event,
                    row.id,
                    container && ratio > 0.25 && ratio < 0.75
                      ? "inside"
                      : ratio < 0.5
                        ? "before"
                        : "after",
                  );
                }}
                onDrop={(event) =>
                  void dropped(event, drop ?? { id: row.id, place: "before" })
                }
              >
                {place === "before" || place === "after" ? (
                  <span
                    aria-hidden
                    className={`bg-primary pointer-events-none absolute inset-x-0 h-0.5 ${place === "before" ? "top-0" : "bottom-0"}`}
                  />
                ) : null}
                {container ? (
                  <button
                    tabIndex={-1}
                    type="button"
                    className="flex size-6 shrink-0 items-center justify-center"
                    aria-label={`${collapsed.includes(row.id) ? "Expand" : "Collapse"} ${objectTitle(row)} layers`}
                    onClick={() =>
                      setCollapsed((ids) =>
                        ids.includes(row.id)
                          ? ids.filter((id) => id !== row.id)
                          : [...ids, row.id],
                      )
                    }
                  >
                    {collapsed.includes(row.id) ? (
                      <ChevronRight aria-hidden className="size-3" />
                    ) : (
                      <ChevronDown aria-hidden className="size-3" />
                    )}
                  </button>
                ) : null}
                <Icon
                  aria-hidden
                  className="text-muted-foreground size-3.5 shrink-0"
                />
                {renaming === row.id ? (
                  <input
                    autoFocus
                    aria-label="Layer name"
                    className="bg-background text-foreground min-w-0 flex-1 rounded border px-1 py-1 text-xs"
                    maxLength={200}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => void saveName(row)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        skipBlur.current = true;
                        setRenaming(null);
                        focus(row.id);
                        requestAnimationFrame(() => {
                          skipBlur.current = false;
                        });
                      }
                    }}
                  />
                ) : (
                  <button
                    tabIndex={-1}
                    type="button"
                    className="min-w-0 flex-1 truncate py-2 text-left text-xs"
                    title={objectTitle(row)}
                    onClick={(e) => {
                      if (!ownSelected || e.shiftKey)
                        onSelect(row.id, e.shiftKey);
                    }}
                    onDoubleClick={() => rename(row)}
                  >
                    {objectTitle(row)}
                  </button>
                )}
                {childChosen ? (
                  <span
                    className="bg-primary size-1.5 shrink-0 rounded-full"
                    aria-label="Selected child"
                  />
                ) : null}
                {onUpdate ? (
                  <button
                    tabIndex={-1}
                    type="button"
                    aria-label={`${row.locked ? "Unlock" : "Lock"} ${objectTitle(row)}`}
                    title={row.locked ? "Unlock" : "Lock"}
                    className={`flex size-7 shrink-0 items-center justify-center ${row.locked ? "" : "opacity-0 group-focus-within/layer:opacity-100 group-hover/layer:opacity-100 max-md:opacity-100"}`}
                    onClick={() =>
                      void onUpdate(row.id, { locked: !row.locked })
                    }
                  >
                    {row.locked ? (
                      <LockKeyhole aria-hidden className="size-3" />
                    ) : (
                      <Unlock aria-hidden className="size-3" />
                    )}
                  </button>
                ) : row.locked ? (
                  <LockKeyhole aria-label="Locked" className="size-3" />
                ) : null}
                <button
                  tabIndex={-1}
                  type="button"
                  aria-label={`Locate ${objectTitle(row)}`}
                  title="Locate"
                  className="flex size-7 shrink-0 items-center justify-center opacity-0 group-focus-within/layer:opacity-100 group-hover/layer:opacity-100 max-md:opacity-100"
                  onClick={() => onLocate(row.id)}
                >
                  <LocateFixed aria-hidden className="size-3" />
                </button>
                {onContext ? (
                  <button
                    tabIndex={-1}
                    type="button"
                    aria-label={`Actions for ${objectTitle(row)}`}
                    className="flex size-7 shrink-0 items-center justify-center"
                    onClick={(event) => {
                      const b = event.currentTarget.getBoundingClientRect();
                      onContext(row.id, b.left, b.bottom);
                    }}
                  >
                    <MoreHorizontal aria-hidden className="size-3" />
                  </button>
                ) : null}
                <span className="sr-only">
                  Position {Math.round(row.x)}, {Math.round(row.y)};{" "}
                  {Math.round(row.width)} by {Math.round(row.height)}
                  {parentChosen ? "; parent selected" : ""}
                </span>
              </div>
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
    <section aria-label="Board layers" ref={root}>
      <BoardSearch rows={rows} onLocate={onLocate}>
        {rows.length ? (
          <div role="tree" aria-label="Objects" aria-multiselectable>
            {branch(null)}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No objects yet. Choose a tool to start.
          </p>
        )}
      </BoardSearch>
      {onDrop ? (
        <div
          className={`text-muted-foreground mt-3 rounded border border-dashed px-3 py-3 text-xs ${drop?.place === "root" ? "border-primary bg-primary-subtle" : ""}`}
          onDragOver={(event) => targetOver(event, null, "root")}
          onDrop={(event) => void dropped(event, { id: null, place: "root" })}
        >
          Board root · drop here to detach from a Section
        </div>
      ) : null}
      <p className="text-muted-foreground mt-2 text-xs" role="status">
        {message}
      </p>
    </section>
  );
}
