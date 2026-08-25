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
  updateBoardElementAction,
  uploadBoardImageAction,
} from "@/modules/whiteboards/actions";
import {
  defaultElementData,
  defaultElementSize,
  nextZIndex,
  reorderElement,
} from "@/modules/whiteboards/elements";

import { WhiteboardNode, type WhiteboardFlowNode } from "./whiteboard-node";
import {
  SelectionToolbar,
  WhiteboardHeader,
  type WhiteboardSaveState,
} from "./whiteboard-chrome";
import { WhiteboardToolbar, type WhiteboardTool } from "./whiteboard-toolbar";

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

  const runMutation = useCallback((operation: () => Promise<void>) => {
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
      }
    });
  }, []);

  const replaceElement = useCallback(
    (element: BoardElementRow, signedUrl?: string) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === element.id
            ? flowNode(
                element,
                signedUrl ?? (node.data.imageUrl as string | undefined),
              )
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

  const onContentCommit = useCallback(
    (elementId: string, content: Record<string, unknown>) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === elementId
            ? {
                ...node,
                data: {
                  ...node.data,
                  element: { ...node.data.element, content },
                },
              }
            : node,
        ),
      );
      persistUpdate(elementId, { elementId, content });
    },
    [persistUpdate],
  );

  const onResizeCommit = useCallback(
    (
      elementId: string,
      dimensions: { height: number; width: number; x: number; y: number },
    ) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === elementId
            ? {
                ...node,
                data: {
                  ...node.data,
                  element: { ...node.data.element, ...dimensions },
                },
                position: { x: dimensions.x, y: dimensions.y },
                style: {
                  ...node.style,
                  height: dimensions.height,
                  width: dimensions.width,
                },
              }
            : node,
        ),
      );
      persistUpdate(elementId, { elementId, ...dimensions });
    },
    [persistUpdate],
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
    if (!canMutate || !selectedId || pending) return;
    const removed = nodes.find((node) => node.id === selectedId);
    if (!removed) return;
    setNodes((current) => current.filter((node) => node.id !== selectedId));
    setSelectedId(null);
    runMutation(async () => {
      const result = await archiveBoardElementAction(selectedId);
      if (result.status === "error") {
        setNodes((current) => [...current, removed]);
        throw new Error(result.message);
      }
    });
  }, [canMutate, nodes, pending, runMutation, selectedId]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']"))
        return;
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
  }, [removeSelected, selectedId]);

  function addElement(
    type: Exclude<WhiteboardTool, "SELECT" | "PAN" | "IMAGE">,
    position: { x: number; y: number },
  ) {
    const elementRows = nodes.map((node) => node.data.element);
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
      setNodes((current) => [...current, flowNode(result.data)]);
      setSelectedId(result.data.id);
      setActiveTool("SELECT");
    });
  }

  function handlePaneClick(event: React.MouseEvent) {
    if (
      !canMutate ||
      activeTool === "SELECT" ||
      activeTool === "PAN" ||
      pending ||
      !flowRef.current
    )
      return;
    const position = flowRef.current.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    if (activeTool === "IMAGE") {
      imagePositionRef.current = position;
      imageInputRef.current?.click();
      return;
    }
    addElement(activeTool, position);
  }

  function uploadImage(file: File) {
    const position = imagePositionRef.current;
    const size = defaultElementSize.IMAGE;
    const formData = new FormData();
    formData.set("boardId", board.id);
    formData.set("file", file);
    formData.set("height", String(size.height));
    formData.set("width", String(size.width));
    formData.set("x", String(position.x));
    formData.set("y", String(position.y));
    formData.set(
      "zIndex",
      String(nextZIndex(nodes.map((node) => node.data.element))),
    );
    runMutation(async () => {
      const result = await uploadBoardImageAction(formData);
      if (result.status === "error") throw new Error(result.message);
      setNodes((current) => [
        ...current,
        flowNode(result.data.element, result.data.signedUrl),
      ]);
      setSelectedId(result.data.element.id);
      setActiveTool("SELECT");
    });
  }

  function changeLayer(direction: "BACKWARD" | "FORWARD" | "FRONT" | "BACK") {
    if (!selectedId) return;
    const currentElements = nodes.map((node) => node.data.element);
    const reordered = reorderElement(currentElements, selectedId, direction);
    const changed = reordered.filter(
      (element) =>
        currentElements.find((current) => current.id === element.id)
          ?.z_index !== element.z_index,
    );
    if (changed.length === 0) return;
    setNodes((current) =>
      current.map((node) => {
        const element = reordered.find((candidate) => candidate.id === node.id);
        return element
          ? {
              ...node,
              data: { ...node.data, element },
              style: { ...node.style, zIndex: element.z_index },
            }
          : node;
      }),
    );
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
            if (!canMutate) return;
            setNodes((current) =>
              current.map((candidate) =>
                candidate.id === node.id
                  ? {
                      ...candidate,
                      data: {
                        ...candidate.data,
                        element: {
                          ...candidate.data.element,
                          x: node.position.x,
                          y: node.position.y,
                        },
                      },
                      position: node.position,
                    }
                  : candidate,
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
              canMutate={canMutate}
              onToolChange={setActiveTool}
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
