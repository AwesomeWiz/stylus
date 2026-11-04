"use client";
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";

import type { BoardElementRow } from "@/lib/supabase/database.types";
import {
  indexBoardObjects,
  type BoardObjectIndex,
  objectTitle,
} from "@/modules/whiteboards/operations";
import {
  indexBoardLayers,
  visibleBoardLayers,
  layerNamePatch,
  type LayerDrop,
  layerDropProblem,
} from "@/modules/whiteboards/layers";
import { BoardSearch } from "./board-search";
import { BoardLayerRow, type BoardLayerEvents } from "./board-layer-row";
import { useBoardEvent } from "./use-board-event";

type Target = { id: string | null; place: LayerDrop; problem?: string | null };
export const BoardOutline = memo(function BoardOutline({
  rows,
  objectIndex,
  active = true,
  isBusy,
  selected,
  onSelect,
  onLocate,
  onContext,
  onUpdate,
  onDrop,
  onHover,
}: {
  rows: BoardElementRow[];
  objectIndex?: BoardObjectIndex;
  active?: boolean;
  isBusy?: () => boolean;
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
  const structure = useMemo(
    () => objectIndex ?? indexBoardObjects(rows),
    [objectIndex, rows],
  );
  const hoverTarget = useRef<string | null>(null);
  const [layerIndex, setLayerIndex] = useState(() =>
    indexBoardLayers(undefined, rows),
  );
  const nextLayerIndex = useMemo(
    () => indexBoardLayers(layerIndex, rows),
    [layerIndex, rows],
  );
  if (nextLayerIndex !== layerIndex) setLayerIndex(nextLayerIndex);
  const children = nextLayerIndex.children;
  const collapsedIds = useMemo(() => new Set(collapsed), [collapsed]);
  const selectedIds = useMemo(() => new Set(selected), [selected]);
  const selectedAncestors = useMemo(
    () =>
      new Set(
        selected.flatMap((id) =>
          (structure.parents.get(id) ?? []).map((row) => row.id),
        ),
      ),
    [structure, selected],
  );
  const visible = useMemo(
    () => visibleBoardLayers(nextLayerIndex, collapsedIds),
    [nextLayerIndex, collapsedIds],
  );
  const visiblePositions = useMemo(
    () => new Map(visible.map((row, i) => [row.id, i])),
    [visible],
  );
  const rowElements = useRef(new Map<string, HTMLDivElement>());
  const selectedId = selected[0];
  useEffect(() => {
    if (
      !selected.some((id) =>
        (structure.parents.get(id) ?? []).some(
          (row) => row.element_type === "GROUP",
        ),
      )
    )
      return;
    setCollapsed((ids) => {
      const next = ids.filter((id) => !selectedAncestors.has(id));
      return next.length === ids.length ? ids : next;
    });
  }, [selected, structure, selectedAncestors]);
  const selectedVisibleId = selectedId
    ? visiblePositions.has(selectedId)
      ? selectedId
      : (structure.parents.get(selectedId) ?? []).find((row) =>
          visiblePositions.has(row.id),
        )?.id
    : undefined;
  useLayoutEffect(() => {
    if (!active) return;
    const element = selectedVisibleId
      ? rowElements.current.get(selectedVisibleId)
      : null;
    element?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [active, selectedVisibleId, visiblePositions]);
  useEffect(() => {
    if (!active) onHover?.(null);
  }, [active, onHover]);
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
    requestAnimationFrame(() => rowElements.current.get(id)?.focus());
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
    const problem = layerDropProblem(structure, drag.current, id, place);
    event.dataTransfer.dropEffect = problem ? "none" : "move";
    setMessage(
      problem ??
        (place === "inside"
          ? structure.byId.get(id ?? "")?.element_type === "GROUP"
            ? "Add to Group"
            : "Move into Section"
          : "Reorder layer"),
    );
    setDrop((old) =>
      old?.id === id && old.place === place && old.problem === problem
        ? old
        : { id, place, problem },
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
    if (target.problem) {
      setMessage(target.problem);
      return;
    }
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
  const handleElement = useBoardEvent(
    (id: string, element: HTMLDivElement | null) => {
      if (element) rowElements.current.set(id, element);
      else rowElements.current.delete(id);
    },
  );
  const handleFocus = useBoardEvent((id: string) => setFocused(id));
  const handleHover = useBoardEvent((id: string | null) => onHover?.(id));
  const handleKey = useBoardEvent(
    (id: string, event: KeyboardEvent<HTMLDivElement>) => {
      const row = structure.byId.get(id);
      if (!row) return;
      const container = ["SECTION", "GROUP"].includes(row.element_type);

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
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const i = visiblePositions.get(row.id) ?? -1;
        const next = visible[i + (event.key === "ArrowDown" ? 1 : -1)];
        if (next) focus(next.id);
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        const next = event.key === "Home" ? visible[0] : visible.at(-1);
        if (next) focus(next.id);
      } else if (event.key === "ArrowRight" && container) {
        event.preventDefault();
        if (collapsed.includes(row.id))
          setCollapsed((ids) => ids.filter((id) => id !== row.id));
        else if (children.get(row.id)?.[0]) focus(children.get(row.id)![0]!);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (container && !collapsed.includes(row.id))
          setCollapsed((ids) => [...ids, row.id]);
        else if (row.parent_id) focus(row.parent_id);
      }
    },
  );
  const handleNameKey = useBoardEvent(
    (id: string, e: KeyboardEvent<HTMLInputElement>) => {
      const row = structure.byId.get(id);
      if (!row) return;

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
    },
  );
  const handleDragStart = useBoardEvent(
    (id: string, event: DragEvent<HTMLDivElement>) => {
      if (isBusy?.()) {
        event.preventDefault();
        return;
      }
      drag.current = id;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("application/x-stylus-layer", id);
      setMessage(
        "Drop on a container to move inside, or between rows to reorder.",
      );
    },
  );
  const handleDragOver = useBoardEvent(
    (id: string, event: DragEvent<HTMLDivElement>) => {
      const row = structure.byId.get(id);
      if (!row) return;
      const b = event.currentTarget.getBoundingClientRect(),
        ratio = (event.clientY - b.top) / Math.max(1, b.height),
        container = ["SECTION", "GROUP"].includes(row.element_type);
      targetOver(
        event,
        id,
        container && ratio > 0.25 && ratio < 0.75
          ? "inside"
          : ratio < 0.5
            ? "before"
            : "after",
      );
    },
  );
  const handleDrop = useBoardEvent(
    (id: string, event: DragEvent<HTMLDivElement>) => {
      void dropped(event, drop ?? { id, place: "before" });
    },
  );
  const handleDragEnd = useBoardEvent(cleanup);
  const handleToggle = useBoardEvent((id: string) =>
    setCollapsed((ids) =>
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
    ),
  );
  const handleNameCommit = useBoardEvent((id: string) => {
    const row = structure.byId.get(id);
    if (row) void saveName(row);
  });
  const handleDraftChange = useBoardEvent((value: string) => setDraft(value));
  const handleRename = useBoardEvent((id: string) => {
    const row = structure.byId.get(id);
    if (row) rename(row);
  });
  const handleSelect = useBoardEvent(onSelect);
  const handleLocate = useBoardEvent(onLocate);
  const handleContext = useBoardEvent((id: string, x: number, y: number) =>
    onContext?.(id, x, y),
  );
  const handleLock = useBoardEvent((id: string, locked: boolean) => {
    void onUpdate?.(id, { locked });
  });
  const events: BoardLayerEvents = useMemo(
    () => ({
      onElement: handleElement,
      onFocus: handleFocus,
      onHover: handleHover,
      onKey: handleKey,
      onNameKey: handleNameKey,
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
      onDragEnd: handleDragEnd,
      onToggle: handleToggle,
      onNameCommit: handleNameCommit,
      onDraftChange: handleDraftChange,
      onRename: handleRename,
      onSelect: handleSelect,
      onLocate: handleLocate,
      onContext: handleContext,
      onLock: handleLock,
    }),
    [
      handleElement,
      handleFocus,
      handleHover,
      handleKey,
      handleNameKey,
      handleDragStart,
      handleDragOver,
      handleDrop,
      handleDragEnd,
      handleToggle,
      handleNameCommit,
      handleDraftChange,
      handleRename,
      handleSelect,
      handleLocate,
      handleContext,
      handleLock,
    ],
  );
  function branch(parent: string | null, depth = 0): React.ReactNode {
    if (depth > 2) return null;
    return (
      <ul
        id={parent ? `layer-children-${parent}` : undefined}
        role={depth ? "group" : "none"}
        className={depth ? "ml-3 border-l pl-1" : ""}
      >
        {(children.get(parent) ?? []).map((id) => {
          const row = structure.byId.get(id);
          if (!row) return null;
          const container = ["SECTION", "GROUP"].includes(row.element_type),
            expanded = !collapsedIds.has(id);
          return (
            <li role="none" key={id}>
              <BoardLayerRow
                row={row}
                depth={depth}
                container={container}
                expanded={expanded}
                ownSelected={selectedIds.has(id)}
                parentChosen={(structure.parents.get(id) ?? []).some((parent) =>
                  selectedIds.has(parent.id),
                )}
                childChosen={!expanded && selectedAncestors.has(id)}
                tabStop={focused === id || (!focused && visible[0]?.id === id)}
                renaming={renaming === id}
                draft={renaming === id ? draft : ""}
                place={drop?.id === id ? drop.place : null}
                dropError={drop?.id === id ? drop.problem : null}
                canUpdate={!!onUpdate}
                canDrop={
                  !!onDrop && !structure.immovable.has(id) && renaming !== id
                }
                hasContext={!!onContext}
                events={events}
              />
              {container && expanded ? branch(id, depth + 1) : null}
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <section
      aria-label="Board layers"
      ref={root}
      className="[--board-layer-row-size:40px] max-md:[--board-layer-row-size:44px]"
    >
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
          Board root · drop here to detach
        </div>
      ) : null}
      <p className="text-muted-foreground mt-2 text-xs" role="status">
        {message}
      </p>
    </section>
  );
});
