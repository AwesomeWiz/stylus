"use client";
import { memo, type DragEvent, type KeyboardEvent } from "react";
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
import type { LayerDrop } from "@/modules/whiteboards/layers";
import { objectTitle } from "@/modules/whiteboards/operations";
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
export type BoardLayerEvents = {
  onElement: (id: string, element: HTMLDivElement | null) => void;
  onFocus: (id: string) => void;
  onHover: (id: string | null) => void;
  onKey: (id: string, event: KeyboardEvent<HTMLDivElement>) => void;
  onNameKey: (id: string, event: KeyboardEvent<HTMLInputElement>) => void;
  onDragStart: (id: string, event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (id: string, event: DragEvent<HTMLDivElement>) => void;
  onDrop: (id: string, event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onToggle: (id: string) => void;
  onNameCommit: (id: string) => void;
  onDraftChange: (value: string) => void;
  onRename: (id: string) => void;
  onSelect: (id: string, additive: boolean) => void;
  onLocate: (id: string) => void;
  onContext: (id: string, x: number, y: number) => void;
  onLock: (id: string, locked: boolean) => void;
};
type Props = {
  row: BoardElementRow;
  depth: number;
  container: boolean;
  expanded: boolean;
  ownSelected: boolean;
  parentChosen: boolean;
  childChosen: boolean;
  tabStop: boolean;
  renaming: boolean;
  draft: string;
  place: LayerDrop | null;
  dropError?: string | null;
  canUpdate: boolean;
  canDrop: boolean;
  hasContext: boolean;
  events: BoardLayerEvents;
};
/** Memo boundaries stop unchanged SVG/control trees from participating in a commit. */
export const BoardLayerRow = memo(function BoardLayerRow({
  row,
  depth,
  container,
  expanded,
  ownSelected,
  parentChosen,
  childChosen,
  tabStop,
  renaming,
  draft,
  place,
  dropError,
  canUpdate,
  canDrop,
  hasContext,
  events,
}: Props) {
  const Icon = icons[row.element_type];
  return (
    <div
      role="treeitem"
      ref={(element) => events.onElement(row.id, element)}
      style={{
        contentVisibility: "auto",
        containIntrinsicBlockSize: "auto var(--board-layer-row-size, 40px)",
      }}
      aria-owns={
        container && !!expanded ? `layer-children-${row.id}` : undefined
      }
      aria-level={depth + 1}
      aria-selected={ownSelected}
      aria-expanded={container ? !!expanded : undefined}
      aria-label={`${row.element_type.toLowerCase()} ${objectTitle(row)}${row.locked ? ", locked" : ""}${childChosen ? ", selected child" : ""}`}
      tabIndex={tabStop ? 0 : -1}
      data-layer-id={row.id}
      data-drop-kind={
        dropError
          ? "rejected"
          : place === "inside"
            ? row.element_type === "GROUP"
              ? "group"
              : "section"
            : place
              ? "reorder"
              : undefined
      }
      className={`group/layer relative flex min-h-10 items-center gap-1 rounded px-1 outline-offset-[-2px] ${ownSelected ? "bg-primary-subtle" : parentChosen ? "bg-muted/60" : "hover:bg-muted/50"} ${dropError ? "ring-destructive ring-2 ring-inset" : place === "inside" ? "ring-primary ring-2 ring-inset" : ""}`}
      onFocus={() => events.onFocus(row.id)}
      onMouseEnter={() => events.onHover(row.id)}
      onMouseLeave={() => events.onHover(null)}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button,input")) return;
        if (!ownSelected || event.shiftKey)
          events.onSelect(row.id, event.shiftKey);
      }}
      onContextMenu={(event) => {
        if (hasContext) {
          event.preventDefault();
          event.stopPropagation();
          events.onContext(row.id, event.clientX, event.clientY);
        }
      }}
      onKeyDown={(event) => events.onKey(row.id, event)}
      draggable={canDrop}
      onDragStart={(event) => events.onDragStart(row.id, event)}
      onDragEnd={events.onDragEnd}
      onDragOver={(event) => events.onDragOver(row.id, event)}
      onDrop={(event) => events.onDrop(row.id, event)}
    >
      {!dropError && (place === "before" || place === "after") ? (
        <span
          aria-hidden
          className={`bg-primary pointer-events-none absolute inset-x-0 h-0.5 ${place === "before" ? "top-0" : "bottom-0"}`}
        />
      ) : null}
      {place === "inside" || dropError ? (
        <span className="bg-popover absolute right-1 -bottom-3 z-10 max-w-48 truncate rounded border px-1 text-[10px]">
          {dropError ??
            (row.element_type === "GROUP"
              ? "Add to Group"
              : "Move into Section")}
        </span>
      ) : null}
      {container ? (
        <button
          tabIndex={-1}
          type="button"
          className="flex size-6 shrink-0 items-center justify-center"
          aria-label={`${!expanded ? "Expand" : "Collapse"} ${objectTitle(row)} layers`}
          onClick={() => events.onToggle(row.id)}
        >
          {!expanded ? (
            <ChevronRight aria-hidden className="size-3" />
          ) : (
            <ChevronDown aria-hidden className="size-3" />
          )}
        </button>
      ) : null}
      <Icon aria-hidden className="text-muted-foreground size-3.5 shrink-0" />
      {renaming ? (
        <input
          autoFocus
          aria-label="Layer name"
          className="bg-background text-foreground min-w-0 flex-1 rounded border px-1 py-1 text-xs"
          maxLength={200}
          value={draft}
          onChange={(e) => events.onDraftChange(e.target.value)}
          onBlur={() => events.onNameCommit(row.id)}
          onKeyDown={(event) => events.onNameKey(row.id, event)}
        />
      ) : (
        <button
          tabIndex={-1}
          type="button"
          className="min-w-0 flex-1 truncate py-2 text-left text-xs"
          title={objectTitle(row)}
          onClick={(e) => {
            if (!ownSelected || e.shiftKey) events.onSelect(row.id, e.shiftKey);
          }}
          onDoubleClick={() => events.onRename(row.id)}
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
      {canUpdate ? (
        <button
          tabIndex={-1}
          type="button"
          aria-label={`${row.locked ? "Unlock" : "Lock"} ${objectTitle(row)}`}
          title={row.locked ? "Unlock" : "Lock"}
          className={`flex size-7 shrink-0 items-center justify-center ${row.locked ? "" : "opacity-0 group-focus-within/layer:opacity-100 group-hover/layer:opacity-100 max-md:opacity-100"}`}
          onClick={() => events.onLock(row.id, !row.locked)}
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
        onClick={() => events.onLocate(row.id)}
      >
        <LocateFixed aria-hidden className="size-3" />
      </button>
      {hasContext ? (
        <button
          tabIndex={-1}
          type="button"
          aria-label={`Actions for ${objectTitle(row)}`}
          className="flex size-7 shrink-0 items-center justify-center"
          onClick={(event) => {
            const b = event.currentTarget.getBoundingClientRect();
            events.onContext(row.id, b.left, b.bottom);
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
  );
});
