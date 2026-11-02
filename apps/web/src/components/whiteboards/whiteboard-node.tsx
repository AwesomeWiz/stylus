"use client";

import { NodeResizer, type Node, type NodeProps } from "@xyflow/react";
import { LockKeyhole, MessageSquare } from "lucide-react";
import { memo, useState } from "react";

import type { BoardElementRow } from "@/lib/supabase/database.types";
import { boardPaint } from "@/modules/whiteboards/elements";

export type WhiteboardNodeData = Record<string, unknown> & {
  canMutate: boolean;
  commentCount: number;
  element: BoardElementRow;
  imageUrl?: string;
  onImageRetry?: (elementId: string) => void;
  onInteractionCancel?: (elementId: string) => void;
  onInteractionStart?: (elementId: string) => void;
  onContentCommit: (
    elementId: string,
    content: Record<string, unknown>,
  ) => void;
  onResizeCommit: (
    elementId: string,
    dimensions: { height: number; width: number; x: number; y: number },
  ) => void;
};

export type WhiteboardFlowNode = Node<WhiteboardNodeData, "whiteboard">;

function textValue(content: Record<string, unknown>) {
  return typeof content.text === "string" ? content.text : "";
}

function EditableText({ data }: { data: WhiteboardNodeData }) {
  const { element } = data;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(() => textValue(element.content));
  const fontSize =
    typeof element.style.fontSize === "number" ? element.style.fontSize : 18;
  const textAlign = ["left", "center", "right"].includes(
    String(element.style.align),
  )
    ? (element.style.align as "left" | "center" | "right")
    : "left";
  const color =
    element.element_type === "STICKY" && !element.style.background
      ? "#713f12"
      : element.element_type === "TEXT" &&
          (!element.style.color || element.style.color === "#18181b")
        ? "var(--foreground)"
        : boardPaint(element.style.color, "#18181b");
  const sharedStyle = { color, fontSize, textAlign };

  if (editing && data.canMutate) {
    return (
      <textarea
        aria-label={
          element.element_type === "STICKY" ? "Edit sticky note" : "Edit text"
        }
        autoFocus
        className="nodrag nowheel h-full w-full resize-none bg-transparent p-3 outline-none"
        maxLength={5000}
        onBlur={() => {
          setEditing(false);
          if (text !== textValue(element.content))
            data.onContentCommit(element.id, { ...element.content, text });
          else data.onInteractionCancel?.(element.id);
        }}
        onChange={(event) => setText(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") event.currentTarget.blur();
          event.stopPropagation();
        }}
        style={sharedStyle}
        value={text}
      />
    );
  }

  return (
    <div
      aria-label={`${element.element_type === "STICKY" ? "Sticky note" : "Text"}: ${text || "Empty"}`}
      className="h-full w-full p-3 whitespace-pre-wrap"
      onDoubleClick={() => {
        if (data.canMutate) data.onInteractionStart?.(element.id);
        setEditing(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && data.canMutate) {
          event.preventDefault();
          event.stopPropagation();
          data.onInteractionStart?.(element.id);
          setEditing(true);
        }
      }}
      role={data.canMutate ? "button" : undefined}
      style={sharedStyle}
      tabIndex={data.canMutate ? 0 : -1}
      title={data.canMutate ? "Double-click to edit" : undefined}
    >
      {text || (data.canMutate ? "Double-click to edit" : "Empty")}
    </div>
  );
}

function WhiteboardNodeComponent({
  data,
  selected,
}: NodeProps<WhiteboardFlowNode>) {
  const { element } = data;
  const fill = boardPaint(element.style.fill, "#f4f4f5");
  const stroke = boardPaint(element.style.stroke, "#71717a");
  const stickyColor =
    typeof element.style.background === "string"
      ? boardPaint(element.style.background, "#fef3c7")
      : boardPaint(element.style.color, "#fef3c7");
  const arrowColor = boardPaint(element.style.color, "#52525b");
  return (
    <div
      className={`relative h-full w-full ${selected ? "outline-primary outline-2 outline-offset-2" : ""}`}
      data-element-type={element.element_type}
      style={{ transform: `rotate(${element.rotation}deg)` }}
    >
      <NodeResizer
        color="var(--primary)"
        handleStyle={{ width: 10, height: 10, zIndex: 30 }}
        lineStyle={{ zIndex: 20 }}
        isVisible={Boolean(
          selected && data.canMutate && element.element_type !== "GROUP",
        )}
        keepAspectRatio={
          (element.element_type === "IMAGE" &&
            element.style.aspectLock !== false) ||
          (element.element_type === "SHAPE" &&
            element.content.shape === "circle")
        }
        minHeight={24}
        minWidth={24}
        onResizeStart={() => data.onInteractionStart?.(element.id)}
        onResizeEnd={(_event, params) =>
          data.onResizeCommit(element.id, {
            height: params.height,
            width: params.width,
            x: params.x,
            y: params.y,
          })
        }
      />
      {element.element_type === "SECTION" ||
      element.element_type === "GROUP" ? (
        <div
          className={`h-full w-full rounded-md border-2 ${element.element_type === "GROUP" ? "border-dashed" : "bg-muted/20"}`}
        >
          <div className="bg-background absolute -top-7 left-0 max-w-full truncate rounded border px-2 py-1 text-xs font-medium">
            {String(element.content.title ?? element.element_type)}
            {element.locked ? " · Locked" : ""}
            {element.content.collapsed ? " · Collapsed" : ""}
          </div>
        </div>
      ) : null}
      {element.element_type === "LINK" ? (
        <div className="bg-background flex h-full flex-col gap-2 overflow-hidden rounded-md border p-3">
          <a
            className="nodrag text-primary truncate text-sm font-medium underline"
            href={
              /^https?:\/\//i.test(String(element.content.url))
                ? String(element.content.url)
                : undefined
            }
            rel="noopener noreferrer"
            target="_blank"
          >
            {String(element.content.title ?? "Link")}
          </a>
          <p className="text-muted-foreground truncate text-xs">
            {String(element.content.url ?? "")}
          </p>
          <p className="line-clamp-3 text-sm">
            {String(element.content.note ?? "")}
          </p>
        </div>
      ) : null}
      {data.commentCount > 0 ? (
        <div
          aria-label={`${data.commentCount} ${data.commentCount === 1 ? "comment" : "comments"} on this element`}
          className="bg-background text-foreground pointer-events-none absolute -top-3 -right-3 z-10 flex h-6 min-w-6 items-center justify-center gap-1 rounded-full border px-1.5 text-[11px] font-semibold shadow-sm"
          role="status"
        >
          <MessageSquare aria-hidden="true" className="size-3" />
          {data.commentCount}
        </div>
      ) : null}
      {element.element_type === "TEXT" ? (
        <EditableText data={data} key={textValue(element.content)} />
      ) : null}
      {element.element_type === "STICKY" ? (
        <div
          className="h-full w-full border border-black/10 shadow-sm"
          style={{ backgroundColor: stickyColor }}
        >
          <EditableText data={data} key={textValue(element.content)} />
        </div>
      ) : null}
      {element.element_type === "SHAPE" ? (
        <div
          aria-label={`${String(element.content.shape ?? "rectangle")} shape`}
          className="h-full w-full border-2"
          role="img"
          style={{
            backgroundColor: fill,
            borderColor: stroke,
            borderRadius: ["ellipse", "circle"].includes(
              String(element.content.shape),
            )
              ? "9999px"
              : element.content.shape === "rounded_rectangle"
                ? "16px"
                : "0px",
            clipPath:
              element.content.shape === "diamond"
                ? "polygon(50% 0,100% 50%,50% 100%,0 50%)"
                : undefined,
          }}
        />
      ) : null}
      {element.element_type === "ARROW" ? (
        <svg
          aria-label="Arrow"
          className="h-full w-full overflow-visible"
          role="img"
          viewBox={`0 0 ${element.width} ${element.height}`}
        >
          <defs>
            <marker
              id={`arrow-${element.id}`}
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="7"
              refY="4"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill={arrowColor} />
            </marker>
          </defs>
          <line
            markerEnd={
              element.content.line === true
                ? undefined
                : `url(#arrow-${element.id})`
            }
            stroke={arrowColor}
            strokeWidth={
              typeof element.style.strokeWidth === "number"
                ? element.style.strokeWidth
                : 2
            }
            x1="2"
            x2={element.width - 8}
            y1={element.height / 2}
            y2={element.height / 2}
          />
        </svg>
      ) : null}
      {element.locked ? (
        <span
          aria-label="Locked object"
          className="bg-background absolute top-1 right-1 z-10 rounded border p-1"
        >
          <LockKeyhole aria-hidden="true" className="size-3" />
        </span>
      ) : null}
      {element.element_type === "IMAGE" ? (
        <BoardImage data={data} key={data.imageUrl ?? "pending"} />
      ) : null}
    </div>
  );
}

function BoardImage({ data }: { data: WhiteboardNodeData }) {
  const { element } = data;
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative h-full w-full overflow-hidden border bg-white">
      {data.imageUrl && !failed ? (
        // Authenticated private preview; never pass this URL into persisted metadata.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={String(element.content.alt ?? "Board image")}
          className="pointer-events-none h-full w-full"
          draggable={false}
          src={data.imageUrl}
          onError={() => setFailed(true)}
          style={{
            objectFit:
              element.style.objectFit === "cover" ? "cover" : "contain",
            objectPosition: `${Number(element.style.cropX ?? 50)}% ${Number(element.style.cropY ?? 50)}%`,
            transform: `scale(${Number(element.style.cropZoom ?? 1)})`,
            transformOrigin: `${Number(element.style.cropX ?? 50)}% ${Number(element.style.cropY ?? 50)}%`,
          }}
        />
      ) : (
        <div className="bg-muted text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-2 text-center text-sm">
          <p role="status">
            {data.imageUrl === undefined && !failed
              ? "Loading image preview?"
              : "Image preview unavailable"}
          </p>
          <button
            aria-label="Retry image preview"
            className="nodrag bg-background min-h-10 rounded border px-3 text-sm"
            onClick={(event) => {
              event.stopPropagation();
              data.onImageRetry?.(element.id);
            }}
            type="button"
          >
            Retry preview
          </button>
        </div>
      )}
      {element.content.caption ? (
        <p className="bg-background/95 absolute bottom-0 left-0 max-w-full truncate px-2 text-xs">
          {String(element.content.caption)}
        </p>
      ) : null}
    </div>
  );
}

export const WhiteboardNode = memo(
  WhiteboardNodeComponent,
  (previous, next) =>
    previous.selected === next.selected &&
    previous.data.element === next.data.element &&
    previous.data.imageUrl === next.data.imageUrl &&
    previous.data.commentCount === next.data.commentCount &&
    previous.data.canMutate === next.data.canMutate,
);
