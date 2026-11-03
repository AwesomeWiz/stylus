"use client";
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  type NodeChange,
  type ReactFlowInstance,
  type Viewport,
} from "@xyflow/react";
import { ListTree, Settings2, MoreHorizontal } from "lucide-react";
import {
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";
import { Button } from "@/components/ui/button";
import type { BoardElementRow, BoardRow } from "@/lib/supabase/database.types";
import {
  ancestors,
  expandedIds,
  indexBoardObjects,
  moveObjects,
  selectionRoots,
} from "@/modules/whiteboards/operations";
import { WhiteboardNode, type WhiteboardFlowNode } from "./whiteboard-node";
import { WhiteboardCursors } from "./whiteboard-cursors";
import { WhiteboardToolbar, type WhiteboardTool } from "./whiteboard-toolbar";
import { BoardCanvasNavigation } from "./board-controls";
import { focusBoardCanvas } from "./board-navigation";
import type { SelectionAction } from "./board-inspector";
import type { useBoardDocument } from "./use-board-document";
import type { useBoardCollaboration } from "./use-board-collaboration";
const nodeTypes = { whiteboard: WhiteboardNode };
type Point = { x: number; y: number };
const noMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
export interface BoardCanvasHandle {
  center: () => Point;
  locate: (id: string) => void;
  fit: (selection?: boolean) => void;
}
type DocumentHandlers = Pick<
  ReturnType<typeof useBoardDocument>,
  "getRows" | "commit" | "startInteraction" | "cancelInteraction" | "navigate"
>;
type Props = DocumentHandlers & {
  ref: Ref<BoardCanvasHandle>;
  board: BoardRow;
  userId: string;
  rows: BoardElementRow[];
  selected: string[];
  select: (id: string, additive?: boolean) => void;
  onSelection: import("react").Dispatch<
    import("react").SetStateAction<string[]>
  >;
  tool: WhiteboardTool;
  setTool: (tool: WhiteboardTool) => void;
  shape: string;
  setShape: (shape: string) => void;
  editable: boolean;
  canMutate: boolean;
  busy: boolean;
  canUndo: boolean;
  canRedo: boolean;
  shortcuts: boolean;
  minimap: boolean;
  grid: boolean;
  hasClipboard: boolean;
  onClipboard: (command: "COPY" | "CUT" | "PASTE", point?: Point) => void;
  onContext: (
    event: {
      clientX: number;
      clientY: number;
      preventDefault: () => void;
      stopPropagation: () => void;
    },
    id: string | null,
    point: Point,
  ) => void;
  onSectionDraw: (bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  action: (action: SelectionAction) => void;
  onMove: (dx: number, dy: number) => void;
  onInsert: (point: Point) => void;
  onImageRequest: (point: Point) => void;
  onFiles: (files: File[], point: Point) => void;
  onPanel: (panel: "INSPECTOR" | "OUTLINE" | null) => void;
  onError: (error: string) => void;
  collaboration: ReturnType<typeof useBoardCollaboration>;
  commentCounts: Map<string, number>;
  imageUrl: (row: BoardElementRow) => string | undefined;
  retryImage: (id: string) => void;
  onContentCommit: (id: string, content: Record<string, unknown>) => void;
  onResizeCommit: (
    id: string,
    bounds: { x: number; y: number; width: number; height: number },
  ) => void;
};
export function BoardCanvas({
  ref,
  board,
  userId,
  rows,
  selected,
  select,
  onSelection,
  tool,
  setTool,
  shape,
  setShape,
  editable,
  canMutate,
  busy,
  canUndo,
  canRedo,
  shortcuts,
  minimap,
  grid,
  hasClipboard,
  onClipboard,
  onContext,
  onSectionDraw,
  action,
  onMove,
  onInsert,
  onImageRequest,
  onFiles,
  onPanel,
  onError,
  collaboration,
  commentCounts,
  imageUrl,
  retryImage,
  onContentCommit,
  onResizeCommit,
  startInteraction,
  cancelInteraction,
  getRows,
  commit,
  navigate,
}: Props) {
  const [revealed, setRevealed] = useState<string[]>([]),
    [spacePan, setSpacePan] = useState(false),
    [preview, setPreview] = useState<Record<string, Point>>({}),
    [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const flow = useRef<ReactFlowInstance<WhiteboardFlowNode> | null>(null),
    canvas = useRef<HTMLDivElement>(null),
    drag = useRef<{
      rows: BoardElementRow[];
      ids: string[];
      origin: Point;
    } | null>(null);
  const marquee = useRef<{ additive: boolean; base: string[] } | null>(null);
  const sectionDraw = useRef<{ x: number; y: number } | null>(null),
    suppressPane = useRef(false);
  const [region, setRegion] = useState<{
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>(null),
    [dropSection, setDropSection] = useState<string | null>(null);
  const viewportKey = `stylus-board-viewport:${userId}:${board.organization_id}:${board.id}`;
  const selectedRows = selectionRoots(rows, selected);
  function insert(at: Point) {
    onInsert(at);
  }
  function imageRequest() {
    onImageRequest(center());
  }
  const chosen = useMemo(() => expandedIds(rows, selected), [rows, selected]);
  const structure = useMemo(() => indexBoardObjects(rows), [rows]);
  const nodes: WhiteboardFlowNode[] = useMemo(
    () =>
      rows.map((row) => {
        const parents = structure.parents.get(row.id) ?? [],
          grouped = parents.find((entry) => entry.element_type === "GROUP");
        return {
          id: row.id,
          className:
            dropSection === row.id
              ? "outline outline-2 outline-primary outline-offset-4"
              : undefined,
          type: "whiteboard",
          position: preview[row.id] ?? { x: row.x, y: row.y },
          selected: chosen.has(row.id),
          hidden: parents.some(
            (parent) =>
              parent.element_type === "SECTION" &&
              parent.content.collapsed &&
              !revealed.includes(parent.id),
          ),
          draggable:
            editable &&
            tool === "SELECT" &&
            !structure.immovable.has(row.id) &&
            (!grouped || chosen.has(grouped.id)),
          zIndex: structure.layers.get(row.id),
          style: { width: row.width, height: row.height },
          data: {
            element: row,
            canMutate:
              editable && !row.locked && !parents.some((entry) => entry.locked),
            commentCount: commentCounts.get(row.id) ?? 0,
            imageUrl: imageUrl(row),
            onImageRetry: retryImage,
            onContentCommit,
            onResizeCommit,
            onInteractionStart: startInteraction,
            onInteractionCancel: cancelInteraction,
          },
        };
      }),
    [
      rows,
      structure,
      startInteraction,
      cancelInteraction,
      preview,
      chosen,
      revealed,
      dropSection,
      editable,
      tool,
      commentCounts,
      imageUrl,
      retryImage,
      onContentCommit,
      onResizeCommit,
    ],
  );
  function center(): Point {
    const box = canvas.current?.getBoundingClientRect();
    return (
      flow.current?.screenToFlowPosition({
        x: (box?.left ?? 0) + (box?.width ?? 800) / 2,
        y: (box?.top ?? 0) + (box?.height ?? 600) / 2,
      }) ?? { x: 0, y: 0 }
    );
  }
  function locate(id: string) {
    const row = getRows().find((entry) => entry.id === id);
    if (!row) return;
    select(id);
    setRevealed(ancestors(row, getRows()).map((entry) => entry.id));
    void flow.current?.setCenter(
      row.x + row.width / 2,
      row.y + row.height / 2,
      { zoom: Math.min(viewport.zoom, 1), duration: noMotion() ? 0 : 150 },
    );
  }
  function keys(event: KeyboardEvent<HTMLDivElement>) {
    if (
      (event.target as HTMLElement).closest(
        "input,textarea,select,button,a,summary,[contenteditable=true]",
      )
    )
      return;
    const command = event.ctrlKey || event.metaKey,
      key = event.key.toLowerCase();
    if (
      event.key === "ContextMenu" ||
      (event.shiftKey && event.key === "F10")
    ) {
      event.preventDefault();
      const box = canvas.current!.getBoundingClientRect();
      onContext(
        {
          preventDefault: () => {},
          stopPropagation: () => {},
          clientX: box.left + box.width / 2,
          clientY: box.top + box.height / 2,
        } as import("react").MouseEvent,
        selected[0] ?? null,
        center(),
      );
      return;
    }
    if (command && ["c", "x", "v"].includes(key)) {
      if (key !== "v" || hasClipboard) {
        event.preventDefault();
        onClipboard(
          key === "c" ? "COPY" : key === "x" ? "CUT" : "PASTE",
          center(),
        );
      }
      return;
    }
    if (
      command &&
      (event.code === "BracketLeft" ||
        event.code === "BracketRight" ||
        ["[", "]", "{", "}"].includes(event.key))
    ) {
      event.preventDefault();
      const forward =
        event.code === "BracketRight" || ["]", "}"].includes(event.key);
      action(
        event.shiftKey
          ? forward
            ? "FRONT"
            : "BACK"
          : forward
            ? "FORWARD"
            : "BACKWARD",
      );
      return;
    }
    if (command && ["z", "y", "d", "g", "a"].includes(key)) {
      event.preventDefault();
      if (key === "a")
        onSelection(
          getRows()
            .filter((row) => !row.parent_id)
            .map((row) => row.id),
        );
      else if (key === "z" || key === "y")
        navigate(key === "y" || event.shiftKey ? "REDO" : "UNDO");
      else
        action(
          key === "d" ? "DUPLICATE" : event.shiftKey ? "UNGROUP" : "GROUP",
        );
      return;
    }
    if (event.key === "Escape") {
      setTool("SELECT");
      setSpacePan(false);
      onPanel(null);
      onSelection([]);
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      setSpacePan(true);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (tool !== "SELECT" && tool !== "PAN") insert(center());
      else if (selected.length) onPanel("INSPECTOR");
      return;
    }
    if (
      ["Delete", "Backspace"].includes(event.key) &&
      event.target === event.currentTarget
    ) {
      event.preventDefault();
      action("ARCHIVE");
      return;
    }
    if (event.key.startsWith("Arrow") && selected.length && editable) {
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      onMove(
        event.key === "ArrowLeft"
          ? -step
          : event.key === "ArrowRight"
            ? step
            : 0,
        event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0,
      );
      return;
    }
    if (shortcuts && !command && !event.altKey) {
      const next = (
        {
          v: "SELECT",
          h: "PAN",
          t: "TEXT",
          n: "STICKY",
          f: "SECTION",
        } as Record<string, WhiteboardTool>
      )[key];
      if (next) {
        event.preventDefault();
        setTool(next);
      }
    }
  }
  function fit(selection = false) {
    const targets = selection
      ? nodes.filter((node) => selected.includes(node.id) && !node.hidden)
      : nodes.filter((node) => !node.hidden);
    if (targets.length)
      void flow.current?.fitView({
        nodes: targets,
        padding: 0.2,
        duration: noMotion() ? 0 : 150,
      });
  }

  useImperativeHandle(ref, () => ({ center, locate, fit }));
  return (
    <div
      aria-label="Board canvas"
      className="focus-visible:ring-primary relative min-h-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-inset"
      id="board-canvas"
      onBlur={() => setSpacePan(false)}
      onPointerDownCapture={(event) => {
        if (
          tool === "SECTION" &&
          editable &&
          (event.target as Element).closest(".react-flow__pane") &&
          event.button === 0
        ) {
          sectionDraw.current = { x: event.clientX, y: event.clientY };
        }
      }}
      onPointerMoveCapture={(event) => {
        const start = sectionDraw.current,
          box = canvas.current?.getBoundingClientRect();
        if (start && box)
          setRegion({
            x: Math.min(start.x, event.clientX) - box.left,
            y: Math.min(start.y, event.clientY) - box.top,
            width: Math.abs(start.x - event.clientX),
            height: Math.abs(start.y - event.clientY),
          });
      }}
      onPointerUpCapture={(event) => {
        const start = sectionDraw.current;
        sectionDraw.current = null;
        setRegion(null);
        if (
          start &&
          Math.hypot(start.x - event.clientX, start.y - event.clientY) > 12
        ) {
          const a = flow.current!.screenToFlowPosition(start),
            b = flow.current!.screenToFlowPosition({
              x: event.clientX,
              y: event.clientY,
            });
          suppressPane.current = true;
          setTimeout(() => {
            suppressPane.current = false;
          }, 0);
          onSectionDraw({
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y),
            width: Math.max(24, Math.abs(a.x - b.x)),
            height: Math.max(24, Math.abs(a.y - b.y)),
          });
        }
      }}
      onKeyDown={keys}
      onKeyUp={(event) => {
        if (event.key === " ") setSpacePan(false);
      }}
      ref={canvas}
      role="region"
      tabIndex={0}
      onDragOver={(event) => {
        if (canMutate && event.dataTransfer.types.includes("Files"))
          event.preventDefault();
      }}
      onDrop={(event) => {
        if (!editable || !event.dataTransfer.files.length) return;
        event.preventDefault();
        onFiles(
          Array.from(event.dataTransfer.files),
          flow.current?.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          }) ?? center(),
        );
      }}
      onPaste={(event) => {
        if (
          !editable ||
          (event.target as Element).closest(
            "input,textarea,[contenteditable=true]",
          )
        )
          return;
        const files = Array.from(event.clipboardData.files);
        if (files.length) {
          event.preventDefault();
          onFiles(files, center());
        }
      }}
      onPointerMove={(event) => {
        const point = flow.current?.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        if (point) collaboration.updateCursor(point);
      }}
    >
      <ReactFlow<WhiteboardFlowNode>
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onlyRenderVisibleElements
        deleteKeyCode={null}
        nodesConnectable={false}
        nodesDraggable={editable && tool === "SELECT" && !spacePan}
        elementsSelectable={tool === "SELECT" && !spacePan}
        panOnDrag={tool === "PAN" || spacePan ? [0, 1, 2] : [1, 2]}
        selectionOnDrag={tool === "SELECT" && !spacePan}
        selectionKeyCode={null}
        multiSelectionKeyCode="Shift"
        minZoom={0.1}
        maxZoom={4}
        onInit={(instance) => {
          flow.current = instance;
          try {
            const stored = JSON.parse(
              localStorage.getItem(viewportKey) ?? "null",
            );
            if (
              stored &&
              [stored.x, stored.y, stored.zoom].every(Number.isFinite) &&
              stored.zoom >= 0.1 &&
              stored.zoom <= 4
            ) {
              void instance.setViewport(stored);
              return;
            }
          } catch {}
          if (rows.length) void instance.fitView({ padding: 0.2, maxZoom: 1 });
        }}
        onMove={(_event, next) => setViewport(next)}
        onMoveEnd={(_event, next) => {
          try {
            localStorage.setItem(viewportKey, JSON.stringify(next));
          } catch {}
        }}
        onPaneContextMenu={(event) =>
          onContext(
            event,
            null,
            flow.current?.screenToFlowPosition({
              x: event.clientX,
              y: event.clientY,
            }) ?? center(),
          )
        }
        onNodeContextMenu={(event, node) => {
          const row = getRows().find((r) => r.id === node.id),
            group = row
              ? ancestors(row, getRows()).find(
                  (r) => r.element_type === "GROUP",
                )
              : undefined;
          onContext(
            event,
            group?.id ?? node.id,
            flow.current?.screenToFlowPosition({
              x: event.clientX,
              y: event.clientY,
            }) ?? center(),
          );
        }}
        onPaneClick={(event) => {
          if (suppressPane.current) {
            suppressPane.current = false;
            return;
          }
          focusBoardCanvas();
          if (tool === "SELECT") onSelection([]);
          else
            insert(
              flow.current?.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
              }) ?? center(),
            );
        }}
        onNodeClick={(event, node) => {
          if (tool === "SELECT") {
            const row = getRows().find((entry) => entry.id === node.id);
            const group = row
              ? ancestors(row, getRows()).find(
                  (entry) => entry.element_type === "GROUP",
                )
              : undefined;
            select(group?.id ?? node.id, event.shiftKey);
          }
        }}
        onSelectionStart={(event) => {
          marquee.current = { additive: event.shiftKey, base: selected };
        }}
        onSelectionEnd={() => {
          marquee.current = null;
        }}
        onNodesChange={(changes: NodeChange<WhiteboardFlowNode>[]) => {
          const selectedChanges = changes.filter(
            (change) => change.type === "select",
          );
          if (selectedChanges.length && !drag.current && marquee.current)
            onSelection((ids) => {
              const next = new Set(ids);
              for (const change of selectedChanges)
                if (change.type === "select") {
                  if (change.selected) next.add(change.id);
                  else if (
                    !marquee.current?.additive ||
                    !marquee.current.base.includes(change.id)
                  )
                    next.delete(change.id);
                }
              return [...next];
            });
        }}
        onNodeDragStart={(_event, node) => {
          const rows = getRows(),
            ids = chosen.has(node.id)
              ? selectionRoots(rows, selected).map((row) => row.id)
              : [node.id];
          drag.current = {
            rows,
            ids,
            origin: { x: node.position.x, y: node.position.y },
          };
          for (const id of ids) startInteraction(id);
        }}
        onNodeDrag={(_event, node) => {
          const start = drag.current;
          if (!start) return;
          try {
            const moved = moveObjects(
              start.rows,
              start.ids,
              node.position.x - start.origin.x,
              node.position.y - start.origin.y,
            );
            const moving = expandedIds(start.rows, start.ids);
            const anchor = moved.find((r) => r.id === node.id);
            setDropSection(
              anchor
                ? (start.rows.find(
                    (r) =>
                      r.element_type === "SECTION" &&
                      !r.locked &&
                      !moving.has(r.id) &&
                      anchor.x + anchor.width / 2 >= r.x &&
                      anchor.x + anchor.width / 2 <= r.x + r.width &&
                      anchor.y + anchor.height / 2 >= r.y &&
                      anchor.y + anchor.height / 2 <= r.y + r.height,
                  )?.id ?? null)
                : null,
            );
            setPreview(
              Object.fromEntries(
                moved
                  .filter((row) => moving.has(row.id))
                  .map((row) => [row.id, { x: row.x, y: row.y }]),
              ),
            );
          } catch {}
        }}
        onNodeDragStop={(_event, node) => {
          const start = drag.current;
          drag.current = null;
          setPreview({});
          setDropSection(null);
          if (!start) return;
          try {
            const moved = moveObjects(
                start.rows,
                start.ids,
                node.position.x - start.origin.x,
                node.position.y - start.origin.y,
              ),
              ids = expandedIds(start.rows, start.ids),
              byId = new Map(moved.map((row) => [row.id, row]));
            void commit(
              getRows().map((row) =>
                ids.has(row.id) ? (byId.get(row.id) ?? row) : row,
              ),
            ).finally(() => {
              for (const id of start.ids) cancelInteraction(id);
            });
          } catch (caught) {
            onError((caught as Error).message);
          }
        }}
        proOptions={{ hideAttribution: true }}
      >
        {grid ? (
          <Background
            color="var(--muted-foreground)"
            size={1}
            gap={24}
            variant={BackgroundVariant.Dots}
          />
        ) : null}
        {minimap ? (
          <MiniMap
            ariaLabel="Board minimap"
            className="!right-2 !bottom-16 hidden md:block"
            nodeColor="var(--muted-foreground)"
            pannable
            zoomable
          />
        ) : null}
      </ReactFlow>
      {region ? (
        <div
          aria-hidden
          className="border-primary bg-primary/5 pointer-events-none absolute z-10 border-2"
          style={{
            left: region.x,
            top: region.y,
            width: region.width,
            height: region.height,
          }}
        />
      ) : null}
      {dropSection ? (
        <div
          role="status"
          className="bg-background absolute bottom-16 left-1/2 z-20 -translate-x-1/2 rounded border px-3 py-2 text-xs"
        >
          Use “Move to section” to place the selection here.
        </div>
      ) : null}
      <div className="absolute top-3 left-3 z-20">
        <WhiteboardToolbar
          activeTool={spacePan ? "PAN" : tool}
          canMutate={canMutate}
          busy={busy}
          canUndo={canUndo}
          canRedo={canRedo}
          onToolChange={setTool}
          onImageRequest={() => imageRequest()}
          onUndo={() => navigate("UNDO")}
          onRedo={() => navigate("REDO")}
          shape={shape}
          onShapeChange={setShape}
        />
      </div>
      <div className="absolute top-16 right-3 z-20 flex gap-1 md:top-3">
        <Button
          aria-label="Open Layers"
          onClick={() => onPanel("OUTLINE")}
          size="icon"
          title="Layers"
          variant="secondary"
        >
          <ListTree aria-hidden="true" className="size-4" />
        </Button>
        <Button
          aria-label="Open Properties"
          onClick={() => onPanel("INSPECTOR")}
          size="icon"
          title="Properties"
          variant="secondary"
        >
          <Settings2 aria-hidden="true" className="size-4" />
        </Button>
        <Button
          aria-label="Selection actions"
          title="Selection actions"
          size="icon"
          variant="secondary"
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            onContext(
              {
                preventDefault: () => event.preventDefault(),
                stopPropagation: () => event.stopPropagation(),
                clientX: box.left,
                clientY: box.bottom,
              },
              selected[0] ?? null,
              center(),
            );
          }}
        >
          <MoreHorizontal aria-hidden className="size-4" />
        </Button>
      </div>
      {!rows.length ? (
        <p className="text-muted-foreground pointer-events-none absolute top-1/2 left-1/2 max-w-[60%] -translate-x-1/2 -translate-y-1/2 text-center text-sm">
          {canMutate
            ? "Choose a tool, then click the canvas or press Enter to insert."
            : "This board is empty. Viewers can inspect and read shared work."}
        </p>
      ) : null}
      <WhiteboardCursors
        colorAssignments={collaboration.colors}
        currentUserId={userId}
        cursors={collaboration.cursors}
        presence={collaboration.presence}
        viewport={viewport}
      />
      <BoardCanvasNavigation
        zoom={viewport.zoom}
        hasSelection={Boolean(selectedRows.length)}
        onZoomOut={() => void flow.current?.zoomOut()}
        onZoomIn={() => void flow.current?.zoomIn()}
        onFit={() => fit()}
        onFitSelection={() => fit(true)}
      />
      <p aria-live="polite" className="sr-only">
        {selectedRows.length} selected.
      </p>
    </div>
  );
}
