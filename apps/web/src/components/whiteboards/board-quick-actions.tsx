"use client";
import {
  Copy,
  LockKeyhole,
  MessageSquare,
  MoreHorizontal,
  Palette,
  Group,
  Frame,
  Smile,
  ImagePlus,
} from "lucide-react";
import type {
  BoardElementRow,
  BoardReactionKind,
  BoardReactionSummary,
  TaskMember,
} from "@/lib/supabase/database.types";
import type { SelectionAction } from "./board-inspector";
import { BoardTypography } from "./board-typography";
import { BoardReactions } from "./board-reactions";
import { STICKY_COLORS } from "./whiteboard-inspector";
export function BoardQuickActions({
  selection,
  busy,
  canMutate,
  onAction,
  onStyle,
  onComment,
  onMore,
  onReplace,
  onReaction,
  reactions,
  pending,
  members,
  top,
}: {
  selection: BoardElementRow[];
  busy: boolean;
  canMutate: boolean;
  onAction: (action: SelectionAction) => void;
  onStyle: (id: string, style: Record<string, unknown>) => Promise<boolean>;
  onComment: () => void;
  onMore: (event: React.MouseEvent) => void;
  onReplace: (id: string) => void;
  onReaction?: (id: string, kind: BoardReactionKind) => void;
  reactions: BoardReactionSummary[];
  pending: string[];
  members: TaskMember[];
  top: number;
}) {
  const row = selection.length === 1 ? selection[0] : undefined;
  if (!selection.length || busy) return null;
  const button =
    "hover:bg-muted flex size-10 items-center justify-center rounded disabled:opacity-50";
  return (
    <div
      role="toolbar"
      aria-label="Selection quick actions"
      className="bg-background absolute left-1/2 z-20 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-1 rounded-lg border p-1 shadow-sm"
      style={{ top }}
    >
      {row && ["TEXT", "STICKY"].includes(row.element_type) ? (
        <div className="hidden min-[1440px]:block">
          <BoardTypography
            row={row}
            compact
            disabled={!canMutate || row.locked}
            onChange={(style) => onStyle(row.id, style)}
          />
        </div>
      ) : null}
      {canMutate && row?.element_type === "STICKY" ? (
        <details className="relative">
          <summary
            aria-label="Quick sticky color"
            title="Sticky color"
            className={`${button} cursor-pointer list-none`}
          >
            <Palette aria-hidden className="size-4" />
          </summary>
          <div className="bg-popover absolute top-full left-0 mt-2 flex gap-1 rounded border p-2">
            {STICKY_COLORS.map((color) => (
              <button
                key={color.label}
                aria-label={`Quick ${color.label} sticky`}
                title={color.label}
                type="button"
                className="size-9 rounded border"
                style={{ backgroundColor: color.background }}
                onClick={(event) => {
                  void onStyle(row.id, { ...row.style, ...color });
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                }}
              />
            ))}
          </div>
        </details>
      ) : null}
      {canMutate && selection.length >= 2 ? (
        <>
          <button
            type="button"
            className={button}
            title="Group selection"
            aria-label="Quick group selection"
            onClick={() => onAction("GROUP")}
          >
            <Group aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            className={button}
            title="Create Section from selection"
            aria-label="Quick create section"
            onClick={() => onAction("SECTION")}
          >
            <Frame aria-hidden className="size-4" />
          </button>
        </>
      ) : null}
      {canMutate ? (
        <button
          type="button"
          className={button}
          title="Duplicate"
          aria-label="Quick duplicate"
          onClick={() => onAction("DUPLICATE")}
        >
          <Copy aria-hidden className="size-4" />
        </button>
      ) : null}
      {canMutate && row?.element_type === "IMAGE" ? (
        <button
          type="button"
          className={button}
          title="Replace image"
          aria-label="Quick replace image"
          onClick={() => onReplace(row.id)}
        >
          <ImagePlus aria-hidden className="size-4" />
        </button>
      ) : null}
      <button
        type="button"
        className={button}
        title="Comment"
        aria-label="Quick comment"
        onClick={onComment}
      >
        <MessageSquare aria-hidden className="size-4" />
      </button>
      {canMutate ? (
        <button
          type="button"
          className={button}
          title="Lock / unlock"
          aria-label="Quick lock or unlock"
          onClick={() => onAction("LOCK")}
        >
          <LockKeyhole aria-hidden className="size-4" />
        </button>
      ) : null}
      {canMutate && row ? (
        <details className="relative">
          <summary
            aria-label="React to object"
            title="React"
            className={`${button} cursor-pointer list-none`}
          >
            <Smile aria-hidden className="size-4" />
          </summary>
          <div className="absolute top-full right-0 mt-2 min-w-48">
            <BoardReactions
              all
              elementId={row.id}
              rows={reactions.filter(
                (reaction) => reaction.element_id === row.id,
              )}
              canMutate
              pending={pending}
              members={members}
              onToggle={onReaction}
            />
          </div>
        </details>
      ) : null}
      <button
        type="button"
        className={button}
        title="More selection actions"
        aria-label="More selection actions"
        onClick={onMore}
      >
        <MoreHorizontal aria-hidden className="size-4" />
      </button>
    </div>
  );
}
