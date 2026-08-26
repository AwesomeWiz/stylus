"use client";

import { NodeResizer, type Node, type NodeProps } from "@xyflow/react";
import { MessageSquare } from "lucide-react";
import { memo, useState } from "react";

import type { BoardElementRow } from "@/lib/supabase/database.types";

export type WhiteboardNodeData = Record<string, unknown> & {
  canMutate: boolean;
  commentCount: number;
  element: BoardElementRow;
  imageUrl?: string;
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
      : typeof element.style.color === "string"
        ? element.style.color
        : "#18181b";
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
          data.onInteractionStart?.(element.id);
          setEditing(true);
        }
      }}
      role="button"
      style={sharedStyle}
      tabIndex={0}
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
  const fill =
    typeof element.style.fill === "string" ? element.style.fill : "#f4f4f5";
  const stroke =
    typeof element.style.stroke === "string" ? element.style.stroke : "#71717a";
  const stickyColor =
    typeof element.style.background === "string"
      ? element.style.background
      : typeof element.style.color === "string"
        ? element.style.color
        : "#fef3c7";
  const arrowColor =
    typeof element.style.color === "string" ? element.style.color : "#52525b";
  return (
    <div
      className={`relative h-full w-full ${selected ? "outline-primary outline-2 outline-offset-2" : ""}`}
      data-element-type={element.element_type}
      style={{ transform: `rotate(${element.rotation}deg)` }}
    >
      <NodeResizer
        color="var(--primary)"
        isVisible={Boolean(selected && data.canMutate)}
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
          aria-label={`${element.content.shape === "ellipse" ? "Ellipse" : "Rectangle"} shape`}
          className="h-full w-full border-2"
          role="img"
          style={{
            backgroundColor: fill,
            borderColor: stroke,
            borderRadius:
              element.content.shape === "ellipse" ? "9999px" : "8px",
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
            markerEnd={`url(#arrow-${element.id})`}
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
      {element.element_type === "IMAGE" ? (
        data.imageUrl ? (
          // Signed URLs are generated server-side for the private board bucket.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={
              typeof element.content.alt === "string"
                ? element.content.alt
                : "Board image"
            }
            className="pointer-events-none h-full w-full border bg-white"
            draggable={false}
            src={data.imageUrl}
            style={{
              objectFit:
                element.style.objectFit === "cover" ? "cover" : "contain",
            }}
          />
        ) : (
          <div
            className="bg-muted text-muted-foreground flex h-full items-center justify-center border text-sm"
            role="status"
          >
            Image unavailable
          </div>
        )
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
