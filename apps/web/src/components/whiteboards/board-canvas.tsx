"use client";
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  type NodeChange,
  type ReactFlowInstance,
  type Viewport,
  type ReactFlowProps,
} from "@xyflow/react";
import { ListTree, Settings2, MoreHorizontal } from "lucide-react";
import {
  useImperativeHandle,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Button } from "@/components/ui/button";
import type {
  BoardElementRow,
  BoardRow,
  BoardReactionSummary,
  BoardReactionKind,
  TaskMember,
} from "@/lib/supabase/database.types";
import {
  expandedIds,
  indexBoardObjects,
  moveObjects,
  selectionRoots,
  duplicateObjects,
  objectBounds,
  type BoardObjectIndex,
} from "@/modules/whiteboards/operations";
import {
  buildGuideIndex,
  guideMove,
  type SmartGuide,
} from "@/modules/whiteboards/guides";
import { BoardGuides } from "./board-guides";
import { BoardQuickActions } from "./board-quick-actions";
import { WhiteboardNode, type WhiteboardFlowNode } from "./whiteboard-node";
import { stabilizeFlowNodes, previewFlowNodes } from "./flow-nodes";
import { WhiteboardCursors } from "./whiteboard-cursors";
import { WhiteboardToolbar, type WhiteboardTool } from "./whiteboard-toolbar";
import { BoardCanvasNavigation } from "./board-controls";
import { focusBoardCanvas } from "./board-navigation";
import type { SelectionAction } from "./board-inspector";
import type { useBoardDocument } from "./use-board-document";
import type { useBoardCollaboration } from "./use-board-collaboration";
import { useBoardEvent } from "./use-board-event";
import {
  selectedGroupContext,
  canvasSelectionTarget,
} from "@/modules/whiteboards/canvas-selection";
type FlowProps = ReactFlowProps<WhiteboardFlowNode>;
const nodeTypes = { whiteboard: WhiteboardNode };
const noReactions: BoardReactionSummary[] = [];
const noPending: string[] = [];
const noMembers: TaskMember[] = [];
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
  | "getRows"
  | "commit"
  | "startInteraction"
  | "cancelInteraction"
  | "navigate"
  | "isBusy"
>;
type Props = DocumentHandlers & {
  presentationSectionId?: string | null;
  ref: Ref<BoardCanvasHandle>;
  board: BoardRow;
  userId: string;
  rows: BoardElementRow[];
  objectIndex?: BoardObjectIndex;
  highlighted?: string | null;
  reactions?: BoardReactionSummary[];
  reactionPending?: string[];
  members?: TaskMember[];
  onReaction?: (id: string, kind: BoardReactionKind) => void;
  onVisibleObjects?: (ids: string[]) => void;
  onStyle?: (id: string, style: Record<string, unknown>) => Promise<boolean>;
  onReplace?: (id: string) => void;
  onObjectComment?: (id: string) => void;
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
  snapObjects?: boolean;
  snapGrid?: boolean;
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
  onPanel: (panel: "INSPECTOR" | "OUTLINE" | "COMMENTS" | null) => void;
  onError: (error: string) => void;
  collaboration: ReturnType<typeof useBoardCollaboration>;
  commentCounts: Map<string, number>;
  imageUrl: (row: BoardElementRow) => string | undefined;
  retryImage: (id: string) => void;
  onContentCommit: (
    id: string,
    content: Record<string, unknown>,
    height?: number,
  ) => void;
  onResizeCommit: (
    id: string,
    bounds: { x: number; y: number; width: number; height: number },
  ) => void;
};
export function BoardCanvas({
  presentationSectionId = null,
  ref,
  board,
  userId,
  rows,
  objectIndex,
  highlighted,
  reactions = noReactions,
  reactionPending = noPending,
  members = noMembers,
  onReaction,
  onVisibleObjects,
  onStyle,
  onReplace,
  onObjectComment,
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
  snapObjects = true,
  snapGrid = false,
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
  isBusy,
}: Props) {
  const [revealed, setRevealed] = useState<string[]>([]),
    [spacePan, setSpacePan] = useState(false),
    [preview, setPreview] = useState<Record<string, Point>>({}),
    [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [settledViewport, setSettledViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    zoom: 1,
  });
  const [copies, setCopies] = useState<BoardElementRow[]>([]);
  const [manipulating, setManipulating] = useState(false);
  const [guides, setGuides] = useState<SmartGuide[]>([]),
    [spacing, setSpacing] = useState<{
      x: number;
      y: number;
      gap: number;
    } | null>(null);
  const resizeGuideIndex = useRef<ReturnType<typeof buildGuideIndex> | null>(
    null,
  );
  const flow = useRef<ReactFlowInstance<WhiteboardFlowNode> | null>(null),
    canvas = useRef<HTMLDivElement>(null),
    drag = useRef<{
      rows: BoardElementRow[];
      ids: string[];
      origin: Point;
      moving: BoardElementRow[];
      sourceIds: string[];
      duplicate: boolean;
      bounds: ReturnType<typeof objectBounds>;
      index: ReturnType<typeof buildGuideIndex>;
      delta: { dx: number; dy: number };
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
  const presentationRestore = useRef<{
    viewport: Viewport;
    revealed: string[];
  } | null>(null);
  const frameSection = useBoardEvent((id: string) => {
    const target = flow.current?.getNode(id);
    if (target)
      void flow.current?.fitView({
        nodes: [target],
        padding: 0.15,
        maxZoom: 1,
        duration: noMotion() ? 0 : 150,
      });
  });
  const changePresentation = useBoardEvent((id: string | null) => {
    if (id) {
      if (!presentationRestore.current)
        presentationRestore.current = {
          viewport: flow.current?.getViewport() ?? viewport,
          revealed,
        };
      setRevealed([id]);
      return requestAnimationFrame(() => frameSection(id));
    }
    const previous = presentationRestore.current;
    if (previous) {
      presentationRestore.current = null;
      setRevealed(previous.revealed);
      return requestAnimationFrame(
        () =>
          void flow.current?.setViewport(previous.viewport, { duration: 0 }),
      );
    }
    return 0;
  });
  useEffect(() => {
    let frame = changePresentation(presentationSectionId);
    const observer =
      presentationSectionId && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() =>
              frameSection(presentationSectionId),
            );
          })
        : null;
    if (observer && canvas.current) observer.observe(canvas.current);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [presentationSectionId, changePresentation, frameSection]);
  const selectedRows = useMemo(
    () => selectionRoots(rows, selected),
    [rows, selected],
  );
  const selectedIds = useMemo(() => new Set(selected), [selected]);
  function insert(at: Point) {
    onInsert(at);
  }
  function imageRequest() {
    onImageRequest(center());
  }
  const chosen = useMemo(() => expandedIds(rows, selected), [rows, selected]);
  const structure = useMemo(
    () => objectIndex ?? indexBoardObjects(rows),
    [objectIndex, rows],
  );
  const groupContext = selectedGroupContext(structure, selected);
  const doubleClickStart = useRef<{ id: string; active: boolean } | null>(null);
  const activateText = useBoardEvent((id: string) => {
    const group = (structure.parents.get(id) ?? []).find(
      (row) => row.element_type === "GROUP",
    );
    if (
      group &&
      !(
        groupContext === group.id &&
        selected.length === 1 &&
        selected[0] === id
      )
    ) {
      onSelection([id]);
      return false;
    }
    return true;
  });
  const exitGroup = useBoardEvent((id: string) => {
    const group = (structure.parents.get(id) ?? []).find(
      (row) => row.element_type === "GROUP",
    );
    if (group) onSelection([group.id]);
  });
  const canOpenLink = useBoardEvent((id: string) => {
    if (presentationSectionId) return true;
    const group = (structure.parents.get(id) ?? []).find(
      (row) => row.element_type === "GROUP",
    );
    return !group || (groupContext === group.id && selected.includes(id));
  });
  const handleResizePreview = useCallback(
    (
      id: string,
      bounds: { x: number; y: number; width: number; height: number } | null,
    ) => {
      if (!bounds) {
        resizeGuideIndex.current = null;
        setGuides([]);
        setSpacing(null);
        setManipulating(false);
        return;
      }
      setManipulating(true);
      if (!resizeGuideIndex.current)
        resizeGuideIndex.current = buildGuideIndex(
          getRows(),
          new Set([id]),
          bounds,
        );
      const result = guideMove(resizeGuideIndex.current, bounds, 0, 0, {
        zoom: flow.current?.getViewport?.().zoom ?? 1,
        snap: false,
      });
      setGuides(result.guides);
    },
    [getRows],
  );
  const visualRows = useMemo(
    () => [
      ...rows,
      ...copies.filter((copy) => !rows.some((row) => row.id === copy.id)),
    ],
    [rows, copies],
  );
  const copyIds = useMemo(() => new Set(copies.map((row) => row.id)), [copies]);
  const copyRoots = useMemo(
    () =>
      new Set(
        selectionRoots(
          copies,
          copies.map((row) => row.id),
        ).map((row) => row.id),
      ),
    [copies],
  );
  const byReaction = useMemo(() => {
    const result = new Map<string, BoardReactionSummary[]>();
    for (const row of reactions)
      result.set(row.element_id, [...(result.get(row.element_id) ?? []), row]);
    return result;
  }, [reactions]);
  useEffect(() => {
    if (!onVisibleObjects) return;
    const box = canvas.current?.getBoundingClientRect(),
      view = settledViewport;
    const ids = rows
      .filter(
        (row) =>
          row.x + row.width >= -view.x / view.zoom &&
          row.y + row.height >= -view.y / view.zoom &&
          row.x < ((box?.width || 1200) - view.x) / view.zoom &&
          row.y < ((box?.height || 900) - view.y) / view.zoom,
      )
      .map((row) => row.id);
    onVisibleObjects(ids);
  }, [rows, settledViewport, onVisibleObjects]);
  const candidates: WhiteboardFlowNode[] = useMemo(
    () =>
      visualRows.map((row) => {
        const parents = structure.parents.get(row.id) ?? [],
          grouped = parents.find((entry) => entry.element_type === "GROUP");
        return {
          id: row.id,
          className:
            dropSection === row.id || highlighted === row.id
              ? "outline outline-2 outline-primary outline-offset-4"
              : undefined,
          type: "whiteboard",
          position: { x: row.x, y: row.y },
          selected:
            !presentationSectionId &&
            (copies.length ? copyIds.has(row.id) : chosen.has(row.id)),
          hidden: parents.some(
            (parent) =>
              parent.element_type === "SECTION" &&
              parent.content.collapsed &&
              !revealed.includes(parent.id),
          ),
          draggable:
            canMutate &&
            !presentationSectionId &&
            tool === "SELECT" &&
            !spacePan &&
            !structure.immovable.has(row.id) &&
            (!grouped ||
              chosen.has(grouped.id) ||
              (groupContext === grouped.id && selectedIds.has(row.id))),
          zIndex: structure.layers.get(row.id),
          style: { width: row.width, height: row.height },
          width: row.width,
          height: row.height,
          measured: { width: row.width, height: row.height },
          data: {
            selectionRoot: copies.length
              ? copyRoots.has(row.id)
              : selectedIds.has(row.id),
            element: row,
            canMutate:
              canMutate &&
              !presentationSectionId &&
              !row.locked &&
              !parents.some((entry) => entry.locked),
            votingLocked: !!row.locked || parents.some((entry) => entry.locked),
            commentCount: presentationSectionId
              ? 0
              : (commentCounts.get(row.id) ?? 0),
            onOpenComments: onObjectComment,
            reactions: presentationSectionId
              ? noReactions
              : (byReaction.get(row.id) ?? noReactions),
            canReact: canMutate && !presentationSectionId,
            reactionPending: reactionPending.filter((key) =>
              key.startsWith(row.id + ":"),
            ),
            members,
            onReaction,
            imageUrl: imageUrl(row),
            onImageRetry: retryImage,
            onContentCommit,
            onTextActivate: activateText,
            onTextEscape: exitGroup,
            onLinkActivate: canOpenLink,
            onResizeCommit,
            onResizePreview: handleResizePreview,
            isBusy,
            onInteractionStart: startInteraction,
            onInteractionCancel: cancelInteraction,
          },
        };
      }),
    [
      visualRows,
      copies.length,
      copyIds,
      copyRoots,
      handleResizePreview,
      isBusy,
      structure,
      startInteraction,
      cancelInteraction,
      chosen,
      selectedIds,
      revealed,
      dropSection,
      highlighted,
      canMutate,
      tool,
      spacePan,
      presentationSectionId,
      commentCounts,
      onObjectComment,
      byReaction,
      reactionPending,
      members,
      onReaction,
      imageUrl,
      retryImage,
      onContentCommit,
      activateText,
      exitGroup,
      canOpenLink,
      groupContext,
      onResizeCommit,
    ],
  );
  const [stableNodes, setStableNodes] = useState(candidates);
  const reconciled = useMemo(
    () => stabilizeFlowNodes(stableNodes, candidates),
    [stableNodes, candidates],
  );
  if (reconciled !== stableNodes) setStableNodes(reconciled);
  const nodes = useMemo(
    () => previewFlowNodes(reconciled, preview),
    [reconciled, preview],
  );
  const handleNodeContextMenu = useBoardEvent<
    Parameters<NonNullable<FlowProps["onNodeContextMenu"]>>,
    void
  >((event, node) => {
    if (presentationSectionId) {
      event.preventDefault();
      return;
    }
    const group = (structure.parents.get(node.id) ?? []).find(
      (row) => row.element_type === "GROUP",
    );
    onContext(
      event,
      group && groupContext !== group.id ? group.id : node.id,
      flow.current?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }) ?? center(),
    );
  });
  const handleNodeClick = useBoardEvent<
    Parameters<NonNullable<FlowProps["onNodeClick"]>>,
    void
  >((event, node) => {
    if (tool === "SELECT" && !presentationSectionId) {
      if (event.detail !== 2)
        doubleClickStart.current = {
          id: node.id,
          active:
            selected.length === 1 && selected[0] === node.id && !!groupContext,
        };
      const target = canvasSelectionTarget(
        structure,
        selected,
        node.id,
        event.shiftKey,
      );
      select(target.id, target.additive);
    }
  });
  const handleNodeDragStart = useBoardEvent<
    Parameters<NonNullable<FlowProps["onNodeDragStart"]>>,
    void
  >((event, node) => {
    if (
      !editable ||
      isBusy() ||
      spacePan ||
      tool !== "SELECT" ||
      presentationSectionId
    )
      return;
    setManipulating(true);
    const original = getRows(),
      immovable = indexBoardObjects(original).immovable,
      sourceIds = (
        chosen.has(node.id)
          ? selectionRoots(original, selected).map((row) => row.id)
          : [node.id]
      ).filter((id) => !immovable.has(id));
    if (!sourceIds.length) {
      setManipulating(false);
      return;
    }
    if (!chosen.has(node.id)) onSelection(sourceIds);
    let working = original,
      ids = sourceIds,
      duplicate = false;
    if (
      "altKey" in event &&
      event.altKey &&
      !sourceIds.some(
        (id) =>
          original.find((row) => row.id === id)?.element_type === "SECTION",
      )
    ) {
      try {
        const result = duplicateObjects(original, sourceIds, userId);
        const created = result.rows
          .filter((row) => !original.some((old) => old.id === row.id))
          .map((row) => ({ ...row, x: row.x - 24, y: row.y - 24 }));
        working = [...original, ...created];
        ids = result.ids;
        duplicate = true;
        setCopies(created);
      } catch (error) {
        onError((error as Error).message);
        return;
      }
    }
    const movingIds = expandedIds(working, ids),
      moving = working.filter((row) => movingIds.has(row.id)),
      bounds = objectBounds(selectionRoots(working, ids));
    drag.current = {
      rows: working,
      ids,
      sourceIds,
      duplicate,
      origin: { x: node.position.x, y: node.position.y },
      moving,
      bounds,
      index: buildGuideIndex(original, movingIds, bounds),
      delta: { dx: NaN, dy: NaN },
    };
    for (const id of ids) startInteraction(id);
  });
  const handleNodeDrag = useBoardEvent<
    Parameters<NonNullable<FlowProps["onNodeDrag"]>>,
    void
  >((event, node) => {
    const start = drag.current;
    if (!start) return;
    const result = guideMove(
      start.index,
      start.bounds,
      node.position.x - start.origin.x,
      node.position.y - start.origin.y,
      {
        zoom: flow.current?.getViewport().zoom ?? 1,
        snap: snapObjects,
        grid: snapGrid,
        bypass: !!("ctrlKey" in event && (event.ctrlKey || event.metaKey)),
      },
    );
    start.delta = { dx: result.dx, dy: result.dy };
    setGuides(result.guides);
    setSpacing(result.spacing);
    const positions: Record<string, Point> = {};
    for (const row of start.moving)
      positions[row.id] = { x: row.x + result.dx, y: row.y + result.dy };
    if (start.duplicate) {
      const originals = expandedIds(getRows(), start.sourceIds);
      for (const row of getRows())
        if (originals.has(row.id)) positions[row.id] = { x: row.x, y: row.y };
    }
    setPreview(positions);
  });
  const handleNodeDragStop = useBoardEvent<
    Parameters<NonNullable<FlowProps["onNodeDragStop"]>>,
    void
  >((_event, node) => {
    const start = drag.current;
    drag.current = null;
    setManipulating(false);
    setDropSection(null);
    setGuides([]);
    setSpacing(null);
    if (!start) return;
    try {
      const delta = Number.isFinite(start.delta.dx)
        ? start.delta
        : {
            dx: node.position.x - start.origin.x,
            dy: node.position.y - start.origin.y,
          };
      const moved = moveObjects(start.rows, start.ids, delta.dx, delta.dy),
        ids = expandedIds(start.rows, start.ids),
        byId = new Map(
          moved.filter((row) => ids.has(row.id)).map((row) => [row.id, row]),
        );
      const next = start.duplicate
        ? [...getRows(), ...byId.values()]
        : getRows().map((row) => byId.get(row.id) ?? row);
      // The preview stays until confirmed state is visible, including rollback.
      void commit(next)
        .then((saved) => {
          if (start.duplicate) onSelection(saved ? start.ids : start.sourceIds);
        })
        .finally(() => {
          setCopies([]);
          setPreview({});
          for (const id of start.ids) cancelInteraction(id);
        });
    } catch (error) {
      setCopies([]);
      setPreview({});
      for (const id of start.ids) cancelInteraction(id);
      onError((error as Error).message);
    }
  });
  const handlePendingPointer = useBoardEvent(
    (
      event:
        ReactMouseEvent<HTMLDivElement> | ReactPointerEvent<HTMLDivElement>,
    ) => {
      if (
        canMutate &&
        tool === "SELECT" &&
        !spacePan &&
        (!editable || isBusy()) &&
        event.button === 0 &&
        (event.target as Element).closest(".react-flow__node") &&
        !(event.target as Element).closest("button,input,textarea,a")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
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
  const locate = useBoardEvent((id: string) => {
    const row = structure.byId.get(id);
    if (!row) return;
    select(id);
    const parents = (structure.parents.get(id) ?? []).map((row) => row.id);
    setRevealed((previous) =>
      previous.length === parents.length &&
      previous.every((id, i) => id === parents[i])
        ? previous
        : parents,
    );
    if (row.element_type === "SECTION") {
      frameSection(id);
      return;
    }
    void flow.current?.setCenter(
      row.x + row.width / 2,
      row.y + row.height / 2,
      {
        zoom: Math.min(flow.current?.getViewport().zoom ?? 1, 1),
        duration: noMotion() ? 0 : 150,
      },
    );
  });
  function keys(event: KeyboardEvent<HTMLDivElement>) {
    if (presentationSectionId) return;
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
      onSelection(groupContext ? [groupContext] : []);
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
      else if (
        selected.length === 1 &&
        structure.byId.get(selected[0]!)?.element_type === "GROUP"
      ) {
        const child = [...(structure.children.get(selected[0]!) ?? [])].sort(
          (a, b) => b.z_index - a.z_index || a.id.localeCompare(b.id),
        )[0];
        if (child) onSelection([child.id]);
        else onPanel("INSPECTOR");
      } else if (selected.length) onPanel("INSPECTOR");
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
      onDoubleClickCapture={(event) => {
        if (
          !!presentationSectionId ||
          tool !== "SELECT" ||
          (event.target as Element).closest(
            "input,textarea,select,button,summary,[data-board-popup]",
          )
        )
          return;
        const id = (event.target as Element).closest<HTMLElement>(
          ".react-flow__node",
        )?.dataset.id;
        if (
          !id ||
          !(structure.parents.get(id) ?? []).some(
            (row) => row.element_type === "GROUP",
          )
        )
          return;
        // The browser's hit target already resolves visible z-order, including overlaps.
        if (
          doubleClickStart.current?.id !== id ||
          !doubleClickStart.current.active
        ) {
          event.preventDefault();
          event.stopPropagation();
          onSelection([id]);
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setSpacePan(false);
      }}
      onPointerDownCapture={(event) => {
        if (presentationSectionId) return;
        handlePendingPointer(event);
        if (event.defaultPrevented) return;
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
      onMouseDownCapture={handlePendingPointer}
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
        nodesDraggable={
          !presentationSectionId && canMutate && tool === "SELECT" && !spacePan
        }
        elementsSelectable={
          !presentationSectionId && tool === "SELECT" && !spacePan
        }
        panOnDrag={
          presentationSectionId
            ? false
            : tool === "PAN" || spacePan
              ? [0, 1, 2]
              : [1, 2]
        }
        panOnScroll={!presentationSectionId}
        panOnScrollSpeed={1}
        zoomOnScroll={false}
        zoomOnPinch={!presentationSectionId}
        zoomActivationKeyCode={
          presentationSectionId ? null : ["Control", "Meta"]
        }
        zoomOnDoubleClick={false}
        selectionOnDrag={
          !presentationSectionId && tool === "SELECT" && !spacePan
        }
        selectionKeyCode={null}
        selectNodesOnDrag={false}
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
          if (rows.length)
            requestAnimationFrame(() =>
              requestAnimationFrame(
                () => void instance.fitView({ padding: 0.2, maxZoom: 1 }),
              ),
            );
        }}
        onMove={(_event, next) => setViewport(next)}
        onMoveEnd={(_event, next) => {
          setSettledViewport(next);
          if (presentationSectionId) return;
          try {
            localStorage.setItem(viewportKey, JSON.stringify(next));
          } catch {}
        }}
        onPaneContextMenu={(event) =>
          presentationSectionId
            ? event.preventDefault()
            : onContext(
                event,
                null,
                flow.current?.screenToFlowPosition({
                  x: event.clientX,
                  y: event.clientY,
                }) ?? center(),
              )
        }
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={(event) => {
          if (presentationSectionId) return;
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
        onNodeClick={handleNodeClick}
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
              return next.size === ids.length && ids.every((id) => next.has(id))
                ? ids
                : [...next];
            });
        }}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        proOptions={{ hideAttribution: true }}
      >
        {grid && !presentationSectionId ? (
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
      <div
        hidden={!!presentationSectionId}
        className="contents [&[hidden]]:hidden"
      >
        <BoardGuides guides={guides} viewport={viewport} spacing={spacing} />
        {onStyle && onReplace && !manipulating ? (
          <BoardQuickActions
            selection={selectedRows}
            busy={busy}
            canMutate={canMutate}
            onAction={action}
            onStyle={onStyle}
            onComment={() => onPanel("COMMENTS")}
            onReplace={onReplace}
            reactions={reactions}
            pending={reactionPending}
            members={members}
            onReaction={onReaction}
            top={
              selectedRows.length
                ? Math.max(
                    12,
                    Math.min(
                      objectBounds(selectedRows).y * viewport.zoom +
                        viewport.y -
                        64,
                      180,
                    ),
                  )
                : 12
            }
            onMore={(event) => {
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
          />
        ) : null}
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
        <div className="absolute bottom-[max(4.25rem,env(safe-area-inset-bottom))] left-1/2 z-20 -translate-x-1/2">
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
            onComment={() => onPanel("COMMENTS")}
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
    </div>
  );
}
