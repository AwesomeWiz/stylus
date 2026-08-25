"use client";

import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import type { BoardElementRow, BoardRow } from "@/lib/supabase/database.types";
import {
  archiveBoardElementAction,
  createBoardElementAction,
  renameBoardAction,
  restoreBoardElementAction,
  updateBoardElementAction,
  uploadBoardImageAction,
} from "@/modules/whiteboards/actions";
import {
  defaultElementData,
  defaultElementSize,
  nextZIndex,
  reorderElement,
} from "@/modules/whiteboards/elements";
import {
  createWhiteboardHistory,
  diffWhiteboardSnapshots,
  recordWhiteboardHistory,
  redoWhiteboardHistory,
  undoWhiteboardHistory,
} from "@/modules/whiteboards/history";
import { boardImageFileSchema } from "@/modules/whiteboards/schemas";

import { WhiteboardNode, type WhiteboardFlowNode } from "./whiteboard-node";
import {
  SelectionToolbar,
  WhiteboardHeader,
  type WhiteboardSaveState,
} from "./whiteboard-chrome";
import { WhiteboardToolbar, type WhiteboardTool } from "./whiteboard-toolbar";
import { WhiteboardInspector } from "./whiteboard-inspector";

const nodeTypes = { whiteboard: WhiteboardNode };

function flowNode(
  element: BoardElementRow,
  imageUrl?: string,
): WhiteboardFlowNode {
  return {
    data: {
      canMutate: false,
      element,
      imageUrl,
      onContentCommit: () => undefined,
      onResizeCommit: () => undefined,
    },
    draggable: true,
    id: element.id,
    position: { x: element.x, y: element.y },
    style: {
      height: element.height,
      width: element.width,
      zIndex: element.z_index,
    },
    type: "whiteboard",
  };
}

export function WhiteboardWorkspace({
  board,
  canMutate,
  elements,
  imageUrls,
}: {
  board: BoardRow;
  canMutate: boolean;
  elements: BoardElementRow[];
  imageUrls: Record<string, string>;
}) {
  const [nodes, setNodes] = useState<WhiteboardFlowNode[]>(() =>
    elements.map((element) => flowNode(element, imageUrls[element.id])),
  );
  const [history, setHistory] = useState(() =>
    createWhiteboardHistory(elements),
  );
  const [activeTool, setActiveTool] = useState<WhiteboardTool>("SELECT");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<WhiteboardSaveState>("SAVED");
  const [error, setError] = useState<string | null>(null);
  const [lastRetry, setLastRetry] = useState<(() => Promise<void>) | null>(
    null,
  );
  const [title, setTitle] = useState(board.title);
  const [renaming, setRenaming] = useState(false);
  const [pending, startTransition] = useTransition();
  const flowRef = useRef<ReactFlowInstance<WhiteboardFlowNode> | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imagePositionRef = useRef({ x: 0, y: 0 });
  const historyRef = useRef(history);
  const imageUrlsRef = useRef(imageUrls);
  const mutationLockRef = useRef(false);

  const syncNodes = useCallback((snapshot: BoardElementRow[]) => {
    setNodes((current) => {
      const byId = new Map(current.map((node) => [node.id, node]));
      return snapshot.map((element) => {
        const existing = byId.get(element.id);
        return {
          ...flowNode(
            element,
            existing?.data.imageUrl ?? imageUrlsRef.current[element.id],
          ),
          selected: existing?.selected,
        };
      });
    });
  }, []);

  const recordSnapshot = useCallback(
    (snapshot: BoardElementRow[]) => {
      const next = recordWhiteboardHistory(historyRef.current, snapshot);
      historyRef.current = next;
      setHistory(next);
      syncNodes(snapshot);
    },
    [syncNodes],
  );

  const runMutation = useCallback((operation: () => Promise<void>) => {
    if (mutationLockRef.current) return;
    mutationLockRef.current = true;
    setSaveState("SAVING");
    setError(null);
    startTransition(async () => {
      try {
        await operation();
        setSaveState("SAVED");
        setLastRetry(null);
      } catch (caught) {
        setSaveState("ERROR");
        setError(
          caught instanceof Error
            ? caught.message
            : "The change could not be saved.",
        );
        setLastRetry(() => operation);
      } finally {
        mutationLockRef.current = false;
      }
    });
  }, []);

  const replaceElement = useCallback(
    (element: BoardElementRow, signedUrl?: string) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === element.id
            ? {
                ...flowNode(
                  element,
                  signedUrl ?? (node.data.imageUrl as string | undefined),
                ),
                selected: node.selected,
              }
            : node,
        ),
      );
    },
    [],
  );

  const persistUpdate = useCallback(
    (
      elementId: string,
      changes: Parameters<typeof updateBoardElementAction>[0],
    ) => {
      runMutation(async () => {
        const result = await updateBoardElementAction({
          ...changes,
          elementId,
        });
        if (result.status === "error") throw new Error(result.message);
        replaceElement(result.data);
      });
    },
    [replaceElement, runMutation],
  );

  const persistHistoryTransition = useCallback(
    async (from: BoardElementRow[], to: BoardElementRow[]) => {
      const diff = diffWhiteboardSnapshots(from, to);
      const results = await Promise.all([
        ...diff.archiveIds.map((id) => archiveBoardElementAction(id)),
        ...diff.restore.map((element) => restoreBoardElementAction(element.id)),
        ...diff.update.map((element) =>
          updateBoardElementAction({
            content: element.content,
            elementId: element.id,
            height: element.height,
            metadata: element.metadata,
            rotation: element.rotation,
            style: element.style,
            width: element.width,
            x: element.x,
            y: element.y,
            zIndex: element.z_index,
          }),
        ),
      ]);
      const failed = results.find((result) => result.status === "error");
      if (failed?.status === "error") throw new Error(failed.message);
    },
    [],
  );

  const navigateHistory = useCallback(
    (direction: "UNDO" | "REDO") => {
      if (!canMutate || pending || mutationLockRef.current) return;
      const current = historyRef.current;
      const next =
        direction === "UNDO"
          ? undoWhiteboardHistory(current)
          : redoWhiteboardHistory(current);
      if (next === current) return;
      historyRef.current = next;
      setHistory(next);
      syncNodes(next.present);
      if (!next.present.some((element) => element.id === selectedId))
        setSelectedId(null);
      runMutation(() =>
        persistHistoryTransition(current.present, next.present),
      );
    },
    [
      canMutate,
      pending,
      persistHistoryTransition,
      runMutation,
      selectedId,
      syncNodes,
    ],
  );

  const onContentCommit = useCallback(
    (elementId: string, content: Record<string, unknown>) => {
      if (mutationLockRef.current) return;
      recordSnapshot(
        historyRef.current.present.map((element) =>
          element.id === elementId ? { ...element, content } : element,
        ),
      );
      persistUpdate(elementId, { elementId, content });
    },
    [persistUpdate, recordSnapshot],
  );

  const onStyleCommit = useCallback(
    (elementId: string, style: Record<string, unknown>) => {
      if (mutationLockRef.current) return;
      recordSnapshot(
        historyRef.current.present.map((element) =>
          element.id === elementId ? { ...element, style } : element,
        ),
      );
      persistUpdate(elementId, { elementId, style });
    },
    [persistUpdate, recordSnapshot],
  );

  const onResizeCommit = useCallback(
    (
      elementId: string,
      dimensions: { height: number; width: number; x: number; y: number },
    ) => {
      if (mutationLockRef.current) return;
      recordSnapshot(
        historyRef.current.present.map((element) =>
          element.id === elementId ? { ...element, ...dimensions } : element,
        ),
      );
      persistUpdate(elementId, { elementId, ...dimensions });
    },
    [persistUpdate, recordSnapshot],
  );

  const renderedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: { ...node.data, canMutate, onContentCommit, onResizeCommit },
        draggable: canMutate && activeTool === "SELECT",
      })),
    [activeTool, canMutate, nodes, onContentCommit, onResizeCommit],
  );
  const selectedElement = nodes.find((node) => node.id === selectedId)?.data
    .element;

  const removeSelected = useCallback(() => {
    if (!canMutate || !selectedId || pending || mutationLockRef.current) return;
    const removed = historyRef.current.present.find(
      (element) => element.id === selectedId,
    );
    if (!removed) return;
    recordSnapshot(
      historyRef.current.present.filter((element) => element.id !== selectedId),
    );
    setSelectedId(null);
    runMutation(async () => {
      const result = await archiveBoardElementAction(selectedId);
      if (result.status === "error") throw new Error(result.message);
    });
  }, [canMutate, pending, recordSnapshot, runMutation, selectedId]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.matches("input, textarea, select, [contenteditable='true']")
      )
        return;
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        navigateHistory(event.shiftKey ? "REDO" : "UNDO");
        return;
      }
      if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        navigateHistory("REDO");
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        removeSelected();
      }
      if (event.key === "Escape") {
        setSelectedId(null);
        setNodes((current) =>
          current.map((node) => ({ ...node, selected: false })),
        );
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [navigateHistory, removeSelected, selectedId]);

  function addElement(
    type: Exclude<WhiteboardTool, "SELECT" | "PAN" | "IMAGE">,
    position: { x: number; y: number },
  ) {
    if (mutationLockRef.current) return;
    const elementRows = historyRef.current.present;
    const size = defaultElementSize[type];
    const defaults = defaultElementData(type);
    runMutation(async () => {
      const result = await createBoardElementAction({
        boardId: board.id,
        ...defaults,
        elementType: type,
        height: size.height,
        metadata: {},
        rotation: 0,
        width: size.width,
        x: position.x,
        y: position.y,
        zIndex: nextZIndex(elementRows),
      });
      if (result.status === "error") throw new Error(result.message);
      recordSnapshot([...historyRef.current.present, result.data]);
      setSelectedId(result.data.id);
      setActiveTool("SELECT");
    });
  }

  function handlePaneClick(event: React.MouseEvent) {
    if (
      !canMutate ||
      activeTool === "SELECT" ||
      activeTool === "PAN" ||
      activeTool === "IMAGE" ||
      pending ||
      !flowRef.current
    )
      return;
    const position = flowRef.current.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    addElement(activeTool, position);
  }

  function requestImagePicker() {
    if (!canMutate || pending || mutationLockRef.current) return;
    const canvas = document.querySelector<HTMLElement>(
      "[data-testid='whiteboard-canvas']",
    );
    const bounds = canvas?.getBoundingClientRect();
    if (bounds && flowRef.current) {
      imagePositionRef.current = flowRef.current.screenToFlowPosition({
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      });
    }
    imageInputRef.current?.click();
  }

  function uploadImage(file: File) {
    if (mutationLockRef.current) return;
    const validation = boardImageFileSchema.safeParse(file);
    if (!validation.success) {
      setSaveState("ERROR");
      setError(validation.error.issues[0]?.message ?? "Choose a valid image.");
      return;
    }
    const position = imagePositionRef.current;
    const size = defaultElementSize.IMAGE;
    const formData = new FormData();
    formData.set("boardId", board.id);
    formData.set("file", file);
    formData.set("height", String(size.height));
    formData.set("width", String(size.width));
    formData.set("x", String(position.x));
    formData.set("y", String(position.y));
    formData.set("zIndex", String(nextZIndex(historyRef.current.present)));
    runMutation(async () => {
      const result = await uploadBoardImageAction(formData);
      if (result.status === "error") throw new Error(result.message);
      imageUrlsRef.current = {
        ...imageUrlsRef.current,
        [result.data.element.id]: result.data.signedUrl,
      };
      recordSnapshot([...historyRef.current.present, result.data.element]);
      setSelectedId(result.data.element.id);
      setActiveTool("SELECT");
    });
  }

  function changeLayer(direction: "BACKWARD" | "FORWARD" | "FRONT" | "BACK") {
    if (!selectedId || mutationLockRef.current) return;
    const currentElements = historyRef.current.present;
    const reordered = reorderElement(currentElements, selectedId, direction);
    const changed = reordered.filter(
      (element) =>
        currentElements.find((current) => current.id === element.id)
          ?.z_index !== element.z_index,
    );
    if (changed.length === 0) return;
    recordSnapshot(reordered);
    runMutation(async () => {
      const results = await Promise.all(
        changed.map((element) =>
          updateBoardElementAction({
            elementId: element.id,
            zIndex: element.z_index,
          }),
        ),
      );
      const failed = results.find((result) => result.status === "error");
      if (failed?.status === "error") throw new Error(failed.message);
    });
  }

  function saveTitle() {
    if (title.trim() === board.title) return setRenaming(false);
    runMutation(async () => {
      const result = await renameBoardAction(board.id, title);
      if (result.status === "error") throw new Error(result.message);
      setTitle(result.data.title);
      setRenaming(false);
    });
  }

  return (
    <section className="bg-muted/30 flex h-[calc(100dvh-4rem)] min-h-[34rem] flex-col overflow-hidden border-y lg:h-screen">
      <WhiteboardHeader
        canMutate={canMutate}
        onRename={saveTitle}
        onRenamingChange={setRenaming}
        onRetry={lastRetry ? () => runMutation(lastRetry) : undefined}
        renaming={renaming}
        saveState={saveState}
        setTitle={setTitle}
        title={title}
      />
      {error ? (
        <div
          className="bg-destructive/10 text-destructive border-b px-4 py-2 text-sm"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1" data-testid="whiteboard-canvas">
        <ReactFlow<WhiteboardFlowNode>
          deleteKeyCode={null}
          fitView
          maxZoom={2.5}
          minZoom={0.15}
          nodeTypes={nodeTypes}
          nodes={renderedNodes}
          nodesConnectable={false}
          nodesDraggable={canMutate && activeTool === "SELECT"}
          onInit={(instance) => {
            flowRef.current = instance;
          }}
          onNodeDragStop={(_event, node) => {
            if (!canMutate || mutationLockRef.current) return;
            recordSnapshot(
              historyRef.current.present.map((element) =>
                element.id === node.id
                  ? { ...element, x: node.position.x, y: node.position.y }
                  : element,
              ),
            );
            persistUpdate(node.id, {
              elementId: node.id,
              x: node.position.x,
              y: node.position.y,
            });
          }}
          onNodesChange={(changes: NodeChange<WhiteboardFlowNode>[]) =>
            setNodes((current) => applyNodeChanges(changes, current))
          }
          onPaneClick={handlePaneClick}
          onSelectionChange={({ nodes: selected }) =>
            setSelectedId(selected[0]?.id ?? null)
          }
          panOnDrag={activeTool === "PAN" ? true : [1, 2]}
          selectionOnDrag={activeTool === "SELECT"}
        >
          <Background
            color="var(--border)"
            gap={20}
            size={1}
            variant={BackgroundVariant.Dots}
          />
          <Controls position="bottom-right" showInteractive={false} />
        </ReactFlow>
        <div className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2">
          <div className="pointer-events-auto">
            <WhiteboardToolbar
              activeTool={activeTool}
              busy={pending}
              canMutate={canMutate}
              canRedo={history.future.length > 0}
              canUndo={history.past.length > 0}
              onImageRequest={requestImagePicker}
              onRedo={() => navigateHistory("REDO")}
              onToolChange={setActiveTool}
              onUndo={() => navigateHistory("UNDO")}
            />
          </div>
        </div>
        {selectedId && canMutate ? (
          <SelectionToolbar
            element={selectedElement}
            onLayerChange={changeLayer}
            onRemove={removeSelected}
            onShapeChange={(shape) => {
              if (!selectedElement) return;
              onContentCommit(selectedElement.id, {
                ...selectedElement.content,
                shape,
              });
            }}
            pending={pending}
          />
        ) : null}
        {selectedElement && canMutate ? (
          <div className="pointer-events-none absolute top-16 left-1/2 z-10 -translate-x-1/2">
            <div className="pointer-events-auto">
              <WhiteboardInspector
                element={selectedElement}
                onStyleChange={(style) =>
                  onStyleCommit(selectedElement.id, style)
                }
                pending={pending}
              />
            </div>
          </div>
        ) : null}
        {!canMutate ? (
          <p className="bg-background/95 text-muted-foreground absolute bottom-3 left-3 z-10 rounded-md border px-3 py-2 text-xs shadow-sm">
            View only
          </p>
        ) : null}
        <input
          accept="image/png,image/jpeg,image/webp"
          aria-label="Upload board image"
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) uploadImage(file);
            event.currentTarget.value = "";
          }}
          ref={imageInputRef}
          type="file"
        />
      </div>
    </section>
  );
}
