"use client";
/* eslint-disable @next/next/no-img-element -- Ephemeral local blob thumbnail; no image fetching adapter. */
import { useRef, useState } from "react";
import { ImagePlus, Type, Link2 } from "lucide-react";
import type { WhiteboardTool } from "./whiteboard-toolbar";
import type { BoardElementRow } from "@/lib/supabase/database.types";
import {
  buildGuideIndex,
  guideMove,
  type SmartGuide,
} from "@/modules/whiteboards/guides";
import {
  creationGeometry,
  type CreationGeometry,
} from "@/modules/whiteboards/creation-geometry";
import { BoardGuides } from "./board-guides";

type Point = { x: number; y: number };
export function BoardPlacement({
  tool,
  shape,
  image,
  viewport,
  toWorld,
  getRows,
  snap,
  grid,
  onPlace,
  onCancel,
  onContext,
}: {
  tool: WhiteboardTool;
  shape: string;
  image?: string;
  viewport: { x: number; y: number; zoom: number };
  toWorld: (point: Point) => Point;
  getRows: () => BoardElementRow[];
  snap: boolean;
  grid: boolean;
  onPlace: (point: Point, geometry?: CreationGeometry) => void;
  onCancel: () => void;
  onContext: (event: React.MouseEvent) => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    start = useRef<{
      screen: Point;
      world: Point;
      index: ReturnType<typeof buildGuideIndex>;
      pointer: number;
    } | null>(null);
  const [pointer, setPointer] = useState<Point | null>(null),
    [drawing, setDrawing] = useState<{
      bounds: CreationGeometry;
      guides: SmartGuide[];
    } | null>(null);
  const draw = tool === "SHAPE" || tool === "SECTION" || tool === "ARROW";
  function update(event: React.PointerEvent) {
    const box = root.current!.getBoundingClientRect();
    setPointer({ x: event.clientX - box.left, y: event.clientY - box.top });
    const initial = start.current;
    if (!initial || initial.pointer !== event.pointerId || !draw) return null;
    if (
      Math.hypot(
        event.clientX - initial.screen.x,
        event.clientY - initial.screen.y,
      ) < 6
    ) {
      setDrawing(null);
      return null;
    }
    const end = toWorld({ x: event.clientX, y: event.clientY });
    // Reuse the existing guide/grid engine against the endpoint; constrain after snapping.
    const result = guideMove(
      initial.index,
      { ...end, width: 0, height: 0 },
      0,
      0,
      { zoom: viewport.zoom, snap, grid },
    );
    const bounds = creationGeometry(
      initial.world,
      { x: end.x + result.dx, y: end.y + result.dy },
      tool === "ARROW",
      event.shiftKey,
    );
    const next = { bounds, guides: event.shiftKey ? [] : result.guides };
    setDrawing(next);
    return next;
  }
  return (
    <div
      ref={root}
      data-board-placement={tool}
      className="absolute inset-0 z-[5] touch-none"
      style={{ cursor: "none" }}
      onPointerEnter={update}
      onPointerDown={(event) => {
        if (event.button !== 0 || start.current) return;
        event.preventDefault();
        event.stopPropagation();
        update(event);
        const point = toWorld({ x: event.clientX, y: event.clientY });
        const index = buildGuideIndex(getRows(), new Set(), {
          ...point,
          width: 0,
          height: 0,
        });
        const snapped = guideMove(
          index,
          { ...point, width: 0, height: 0 },
          0,
          0,
          { zoom: viewport.zoom, snap, grid },
        );
        start.current = {
          screen: { x: event.clientX, y: event.clientY },
          world: { x: point.x + snapped.dx, y: point.y + snapped.dy },
          pointer: event.pointerId,
          index,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        document.getElementById("board-canvas")?.focus({ preventScroll: true });
      }}
      onPointerMove={(event) => {
        event.stopPropagation();
        update(event);
      }}
      onPointerUp={(event) => {
        const initial = start.current;
        if (
          !initial ||
          initial.pointer !== event.pointerId ||
          event.button !== 0
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        const proposal = update(event);
        start.current = null;
        setDrawing(null);
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
        onPlace(initial.world, proposal?.bounds);
      }}
      onPointerCancel={() => {
        start.current = null;
        onCancel();
      }}
      onLostPointerCapture={() => {
        if (start.current) {
          start.current = null;
          onCancel();
        }
      }}
      onPointerLeave={() => {
        if (!start.current) setPointer(null);
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        start.current = null;
        onCancel();
        onContext(event);
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {pointer && !drawing ? (
          <div
            data-placement-ghost
            className="absolute flex h-10 w-12 items-center justify-center opacity-50"
            style={{ left: pointer.x + 14, top: pointer.y + 14 }}
          >
            <PlacementCue key={image} tool={tool} shape={shape} image={image} />
          </div>
        ) : null}
        {drawing ? (
          <svg
            data-placement-drawing
            className="absolute inset-0 h-full w-full overflow-visible"
          >
            <g
              transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}
            >
              <CreationPreview
                bounds={drawing.bounds}
                tool={tool}
                shape={shape}
                zoom={viewport.zoom}
              />
            </g>
          </svg>
        ) : null}
      </div>
      {drawing ? (
        <BoardGuides
          guides={drawing.guides}
          viewport={viewport}
          spacing={null}
        />
      ) : null}
      {pointer ? (
        <svg
          aria-hidden
          data-placement-cursor
          className="pointer-events-none absolute z-20"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          style={{ left: pointer.x - 10, top: pointer.y - 10 }}
          fill="none"
          strokeLinecap="round"
        >
          {/* Fixed dual-tone paint stays readable over either theme and user images. */}
          <path d="M10 3V17M3 10H17" stroke="#ffffff" strokeWidth="4" />
          <path d="M10 3V17M3 10H17" stroke="#191a1d" strokeWidth="2" />
        </svg>
      ) : null}
    </div>
  );
}
function PlacementCue({
  tool,
  shape,
  image,
}: {
  tool: WhiteboardTool;
  shape: string;
  image?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (tool === "IMAGE")
    return image && !failed ? (
      <img
        src={image}
        alt=""
        className="max-h-10 max-w-12 object-contain"
        onError={() => setFailed(true)}
      />
    ) : (
      <ImagePlus className="size-7" />
    );
  if (tool === "TEXT") return <Type className="size-7" />;
  if (tool === "LINK") return <Link2 className="size-7" />;
  if (tool === "ARROW")
    return (
      <svg viewBox="0 0 48 40" className="h-10 w-12">
        <path
          d={shape === "line" ? "M4 30L42 8" : "M4 30L42 8M29 8H42V21"}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  return (
    <div
      className="h-7 w-9 border-2"
      style={{
        width: shape === "circle" && tool === "SHAPE" ? 28 : 36,
        borderColor:
          tool === "SHAPE"
            ? "var(--board-shape-stroke)"
            : "var(--muted-foreground)",
        background:
          tool === "STICKY"
            ? "#fef3c7"
            : tool === "SHAPE"
              ? "var(--board-shape-fill)"
              : "transparent",
        borderRadius:
          shape === "circle" && tool === "SHAPE"
            ? "50%"
            : shape === "rounded_rectangle" && tool === "SHAPE"
              ? 6
              : 0,
        clipPath:
          shape === "diamond" && tool === "SHAPE"
            ? "polygon(50% 0,100% 50%,50% 100%,0 50%)"
            : undefined,
        borderStyle: tool === "SECTION" ? "dashed" : "solid",
      }}
    />
  );
}
function CreationPreview({
  bounds: b,
  tool,
  shape,
  zoom,
}: {
  bounds: CreationGeometry;
  tool: WhiteboardTool;
  shape: string;
  zoom: number;
}) {
  if (tool === "ARROW")
    return (
      <g
        transform={`rotate(${b.rotation} ${b.x + b.width / 2} ${b.y + b.height / 2})`}
        stroke="var(--foreground)"
        fill="none"
        strokeWidth={2}
      >
        <line x1={b.x + 2} y1={b.y + 12} x2={b.x + b.width - 8} y2={b.y + 12} />
        {shape !== "line" ? (
          <path
            d={`M${b.x + b.width - 16} ${b.y + 4}L${b.x + b.width - 8} ${b.y + 12}L${b.x + b.width - 16} ${b.y + 20}`}
          />
        ) : null}
      </g>
    );
  const props = {
    fill: tool === "SECTION" ? "none" : "var(--board-shape-fill)",
    fillOpacity: 0.55,
    stroke: "var(--board-shape-stroke)",
    strokeWidth: 1.5 / zoom,
  };
  return shape === "circle" && tool === "SHAPE" ? (
    <ellipse
      {...props}
      cx={b.x + b.width / 2}
      cy={b.y + b.height / 2}
      rx={b.width / 2}
      ry={b.height / 2}
    />
  ) : shape === "diamond" && tool === "SHAPE" ? (
    <polygon
      {...props}
      points={`${b.x + b.width / 2},${b.y} ${b.x + b.width},${b.y + b.height / 2} ${b.x + b.width / 2},${b.y + b.height} ${b.x},${b.y + b.height / 2}`}
    />
  ) : (
    <rect
      {...props}
      x={b.x}
      y={b.y}
      width={b.width}
      height={b.height}
      rx={shape === "rounded_rectangle" && tool === "SHAPE" ? 16 : 0}
      strokeDasharray={tool === "SECTION" ? 6 / zoom : undefined}
    />
  );
}
