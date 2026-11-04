import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  operation: vi.fn(),
  rename: vi.fn(),
  upload: vi.fn(),
  comments: vi.fn(),
  images: vi.fn(),
  snapshot: vi.fn(),
  reactions: vi.fn(),
  setReaction: vi.fn(),
  refresh: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  setViewport: vi.fn(),
  fit: vi.fn(),
  zoom: vi.fn(),
  center: vi.fn(),
  flowSnapshots: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/modules/whiteboards/actions", () => ({
  applyBoardOperationAction: mocks.operation,
  renameBoardAction: mocks.rename,
  uploadBoardImageAction: mocks.upload,
  setBoardReactionAction: mocks.setReaction,
}));
vi.mock("@/modules/whiteboards/read-actions", () => ({
  readBoardCommentsAction: mocks.comments,
  readBoardImagesAction: mocks.images,
  readBoardSnapshotAction: mocks.snapshot,
  readBoardReactionsAction: mocks.reactions,
}));
vi.mock("@/modules/whiteboards/realtime", () => ({
  subscribeToBoardCollaboration: mocks.subscribe,
}));
vi.mock("@xyflow/react", () => ({
  Background: () => null,
  BackgroundVariant: { Dots: "dots" },
  MiniMap: () => <div aria-label="Board minimap" />,
  ReactFlow: ({
    nodes,
    onInit,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
    onNodesChange,
    onNodeClick,
    onPaneClick,
    onMove,
    onMoveEnd,
    children,
  }: {
    nodes: import("./whiteboard-node").WhiteboardFlowNode[];
    onInit: (value: unknown) => void;
    onNodeDragStart: (event: unknown, node: unknown) => void;
    onNodeDrag: (event: unknown, node: unknown) => void;
    onNodeDragStop: (event: unknown, node: unknown) => void;
    onNodesChange: (changes: unknown[]) => void;
    onNodeClick: (event: { shiftKey: boolean }, node: unknown) => void;
    onPaneClick: (event: unknown) => void;
    onMove: (
      event: unknown,
      viewport: { x: number; y: number; zoom: number },
    ) => void;
    onMoveEnd: (
      event: unknown,
      viewport: { x: number; y: number; zoom: number },
    ) => void;
    children: React.ReactNode;
  }) => {
    mocks.flowSnapshots(nodes);
    onInit({
      screenToFlowPosition: (p: unknown) => p,
      fitView: mocks.fit,
      setViewport: mocks.setViewport,
      zoomIn: mocks.zoom,
      zoomOut: mocks.zoom,
      setCenter: mocks.center,
      getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
      getNode: (id: string) => nodes.find((node) => node.id === id),
    });
    return (
      <div>
        <button
          onClick={() => {
            onMove(null, { x: 100, y: 150, zoom: 0.75 });
            onMoveEnd(null, { x: 100, y: 150, zoom: 0.75 });
          }}
        >
          Pan viewport
        </button>
        <span data-testid="node-count">{nodes.length}</span>
        <span data-testid="first-node-comment-count">
          {nodes[0]?.data.commentCount ?? 0}
        </span>
        <output data-testid="positions">
          {JSON.stringify(nodes.map((node) => [node.id, node.position]))}
        </output>
        <button onClick={() => onPaneClick({ clientX: 40, clientY: 60 })}>
          Canvas pane
        </button>
        <button
          disabled={!nodes[0]}
          onClick={() => {
            onNodeDragStart({}, nodes[0]);
            onNodeDrag({}, { ...nodes[0], position: { x: 100, y: 120 } });
          }}
        >
          Preview drag
        </button>
        <button
          disabled={!nodes[0]}
          onClick={() => {
            onNodeDragStart(
              {},
              {
                ...nodes[0],
                position: {
                  x: nodes[0]!.data.element.x,
                  y: nodes[0]!.data.element.y,
                },
              },
            );
            onNodeDragStop({}, { ...nodes[0], position: { x: 250, y: 310 } });
          }}
        >
          Drag first
        </button>
        <button
          disabled={!nodes[0]}
          onClick={(event) => {
            onNodesChange([
              { id: nodes[0]!.id, type: "select", selected: true },
            ]);
            onNodeClick(event, nodes[0]);
          }}
        >
          Select first
        </button>
        {children}
      </div>
    );
  },
}));
import type {
  BoardCommentRow,
  BoardElementRow,
} from "@/lib/supabase/database.types";
import { board, object } from "@/test/board-fixtures";
import { WhiteboardWorkspace } from "./whiteboard-workspace";
const sticky = object();
const comment: BoardCommentRow = {
  resolved_at: null,
  resolved_by: null,
  id: crypto.randomUUID(),
  board_id: board.id,
  organization_id: board.organization_id,
  author_id: board.created_by,
  body: "Needs another pass",
  created_at: board.created_at,
  updated_at: board.updated_at,
  archived_at: null,
  element_id: sticky.id,
  parent_id: null,
};
function mount(
  elements: BoardElementRow[] = [sticky],
  canMutate = true,
  comments: BoardCommentRow[] = [],
) {
  return render(
    <WhiteboardWorkspace
      board={board}
      canMutate={canMutate}
      elements={elements}
      comments={comments}
      imageUrls={{}}
    />,
  );
}
function inspect() {
  fireEvent.click(screen.getByRole("button", { name: "Select first" }));
  fireEvent.click(screen.getByRole("button", { name: "Open Properties" }));
}
function historyButton(name: string) {
  const more = screen.getByLabelText("More tools");
  if (!more.closest("details")?.hasAttribute("open"))
    more.closest("details")?.setAttribute("open", "");
  return screen.getByRole("button", { name });
}
let saved = new Map<string, BoardElementRow>();
describe("Boards V2 workspace", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    saved = new Map([[sticky.id, sticky]]);
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: !query.includes("reduced-motion"),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    mocks.operation.mockImplementation(
      async (
        input: ReturnType<
          typeof import("@/modules/whiteboards/operations").operationPayload
        >,
      ) => ({
        status: "success",
        data: [
          ...input.upserts.map((entry) => {
            const row = {
              ...(saved.get(entry.id) ?? object({ id: entry.id })),
              ...entry,
              updated_at: new Date(
                Date.now() + Math.random() * 10000,
              ).toISOString(),
            };
            saved.set(row.id, row);
            return row;
          }),
          ...input.archiveIds.map((id: string) => ({
            ...saved.get(id)!,
            archived_at: new Date().toISOString(),
          })),
        ],
      }),
    );
    mocks.comments.mockResolvedValue({
      status: "success",
      comments: [comment],
      before: null,
    });
    mocks.images.mockResolvedValue({ status: "success", images: [] });
    mocks.reactions.mockResolvedValue({ status: "success", rows: [] });
    mocks.setReaction.mockResolvedValue({ status: "success" });
    mocks.snapshot.mockResolvedValue({
      status: "success",
      rows: [sticky],
      canMutate: true,
    });
    mocks.subscribe.mockReturnValue({
      unsubscribe: mocks.unsubscribe,
      updateCursor: vi.fn(),
    });
  });
  it("reconstructs persisted elements and exposes honest saved state", () => {
    mount();
    expect(screen.getByTestId("node-count")).toHaveTextContent("1");
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });
  it("keeps an unrelated node identical while another object saves and confirms", async () => {
    const other = object({ content: { text: "Unaffected" } });
    let confirm!: (value: unknown) => void;
    mocks.operation.mockReturnValue(
      new Promise((resolve) => {
        confirm = resolve;
      }),
    );
    mount([sticky, other]);
    const before = mocks.flowSnapshots.mock.calls
      .at(-1)![0]
      .find((node: { id: string }) => node.id === other.id);
    fireEvent.click(screen.getByRole("button", { name: "Drag first" }));
    await waitFor(() =>
      expect(screen.getByText("Saving…")).toBeInTheDocument(),
    );
    const during = mocks.flowSnapshots.mock.calls
      .at(-1)![0]
      .find((node: { id: string }) => node.id === other.id);
    expect(during).toBe(before);
    expect(during.draggable).toBe(true);
    await act(async () =>
      confirm({
        status: "success",
        data: [
          { ...sticky, x: 250, y: 310, updated_at: "2026-11-04T01:00:00Z" },
        ],
      }),
    );
    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
    expect(
      mocks.flowSnapshots.mock.calls
        .at(-1)![0]
        .find((node: { id: string }) => node.id === other.id),
    ).toBe(before);
  });
  it("locates exact current geometry and focuses a resized Section without modifying children", async () => {
    const section = object({
        element_type: "SECTION",
        content: { title: "Focus section" },
        width: 600,
        height: 400,
      }),
      child = object({
        parent_id: section.id,
        x: 80,
        y: 90,
        content: { text: "Located child" },
      });
    render(
      <WhiteboardWorkspace
        board={board}
        canMutate
        elements={[section, child]}
        comments={[]}
        imageUrls={{}}
        currentUser={{ id: board.created_by, displayName: "Member" }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Locate Located child" }),
    );
    expect(mocks.center).toHaveBeenCalledWith(
      child.x + child.width / 2,
      child.y + child.height / 2,
      expect.objectContaining({ zoom: 1 }),
    );
    const channel = mocks.subscribe.mock.calls[0]![0];
    act(() =>
      channel.onElement({
        ...section,
        width: 900,
        updated_at: "2026-11-04T01:00:00Z",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Locate Focus section" }),
    );
    expect(mocks.fit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        nodes: [
          expect.objectContaining({
            id: section.id,
            data: expect.objectContaining({
              element: expect.objectContaining({ width: 900 }),
            }),
          }),
        ],
      }),
    );
    expect(mocks.operation).not.toHaveBeenCalled();
  });
  it("does not starve visible image previews behind the 200-object feedback limit", async () => {
    const text = Array.from({ length: 205 }, () =>
        object({ element_type: "TEXT" }),
      ),
      image = object({
        element_type: "IMAGE",
        metadata: {
          storagePath: `${board.organization_id}/${board.id}/asset.png`,
        },
      });
    mount([...text, image]);
    await waitFor(() =>
      expect(mocks.images).toHaveBeenCalledWith(
        expect.objectContaining({ ids: [image.id] }),
      ),
    );
    await waitFor(() => expect(mocks.reactions).toHaveBeenCalled());
    expect(
      mocks.reactions.mock.calls.every(([input]) => input.ids.length <= 200),
    ).toBe(true);
  });
  it("docks Layers left and Properties right by default, with independent collapse and bottom tools", () => {
    mount();
    const layers = screen.getByRole("tree", { name: "Objects" });
    expect(
      screen.getByRole("complementary", { name: "Layers" }),
    ).toHaveAttribute("data-board-panel", "left");
    expect(
      screen.getByRole("complementary", { name: "Properties" }),
    ).toHaveAttribute("data-board-panel", "right");
    expect(
      screen.getByRole("toolbar", { name: "Board tools" }),
    ).toHaveAttribute("aria-orientation", "horizontal");
    fireEvent.click(screen.getByRole("button", { name: "Collapse layers" }));
    expect(
      screen.queryByRole("complementary", { name: "Layers" }),
    ).not.toBeInTheDocument();
    expect(layers).toBeInTheDocument();
    expect(layers).not.toBeVisible();
    expect(
      screen.getByRole("complementary", { name: "Properties" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Layers" }));
    expect(
      screen.getByRole("complementary", { name: "Layers" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tree", { name: "Objects" })).toBe(layers);
  });
  it("switches to one modal panel when the viewport becomes narrow", () => {
    let width = 1440;
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("1200")
        ? width >= 1200
        : query.includes("768")
          ? width >= 768
          : false,
    }));
    mount();
    expect(screen.getAllByRole("complementary")).toHaveLength(2);
    act(() => {
      width = 390;
      window.dispatchEvent(new Event("resize"));
    });
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Layers" }));
    expect(screen.getByRole("dialog", { name: "Layers" })).toHaveAttribute(
      "aria-modal",
      "true",
    );
  });
  it("maps loaded active comments to their canonical element", () => {
    mount([sticky], true, [comment]);
    expect(screen.getByTestId("first-node-comment-count")).toHaveTextContent(
      "1",
    );
  });
  it("creates once at canvas coordinates and returns to Select", async () => {
    mount([]);
    fireEvent.click(screen.getByRole("button", { name: "Sticky" }));
    fireEvent.click(screen.getByRole("button", { name: "Canvas pane" }));
    await waitFor(() => expect(mocks.operation).toHaveBeenCalledOnce());
    expect(mocks.operation.mock.calls[0]![0]).toMatchObject({
      boardId: board.id,
      upserts: [{ element_type: "STICKY", x: 40, y: 60 }],
    });
    expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
  it("persists only the final drag position in one transaction", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Preview drag" }));
    expect(mocks.operation).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Drag first" }));
    await waitFor(() => expect(mocks.operation).toHaveBeenCalledOnce());
    expect(mocks.operation.mock.calls[0]![0].upserts).toEqual([
      expect.objectContaining({ id: sticky.id, x: 250, y: 310 }),
    ]);
  });
  it("saves contextual formatting and makes it undoable", async () => {
    mount();
    inspect();
    fireEvent.click(screen.getByRole("button", { name: "Blue sticky" }));
    expect(
      screen.queryByRole("button", { name: "Save object" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.operation).toHaveBeenCalledOnce());
    expect(mocks.operation.mock.calls[0]![0].upserts[0].style).toMatchObject({
      background: "#dbeafe",
      color: "#1e3a8a",
    });
    await waitFor(() => expect(historyButton("Undo")).toBeEnabled());
    fireEvent.click(historyButton("Undo"));
    await waitFor(() => expect(mocks.operation).toHaveBeenCalledTimes(2));
    expect(mocks.operation.mock.calls[1]![0].upserts[0].style).toEqual(
      sticky.style,
    );
  });
  it("persists undo and redo for reload consistency", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Drag first" }));
    await waitFor(() => expect(historyButton("Undo")).toBeEnabled());
    fireEvent.click(historyButton("Undo"));
    await waitFor(() => expect(historyButton("Redo")).toBeEnabled());
    expect(mocks.operation.mock.calls[1]![0].upserts[0]).toMatchObject({
      x: 10,
      y: 20,
    });
    fireEvent.click(historyButton("Redo"));
    await waitFor(() => expect(mocks.operation).toHaveBeenCalledTimes(3));
    expect(mocks.operation.mock.calls[2]![0].upserts[0]).toMatchObject({
      x: 250,
      y: 310,
    });
  });
  it("scopes keyboard history to the canvas and suppresses inputs", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Drag first" }));
    await waitFor(() => expect(historyButton("Undo")).toBeEnabled());
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(mocks.operation).toHaveBeenCalledOnce();
    fireEvent.keyDown(screen.getByRole("region", { name: "Board canvas" }), {
      key: "z",
      ctrlKey: true,
    });
    await waitFor(() => expect(historyButton("Redo")).toBeEnabled());
    fireEvent.keyDown(screen.getByRole("region", { name: "Board canvas" }), {
      key: "y",
      ctrlKey: true,
    });
    await waitFor(() => expect(mocks.operation).toHaveBeenCalledTimes(3));
    fireEvent.click(screen.getByRole("button", { name: "Ideas" }));
    fireEvent.keyDown(screen.getByLabelText("Board name"), {
      key: "z",
      ctrlKey: true,
    });
    expect(mocks.operation).toHaveBeenCalledTimes(3);
  });
  it("archives and restores a created identity through history", async () => {
    mount([]);
    fireEvent.click(screen.getByRole("button", { name: "Sticky" }));
    fireEvent.click(screen.getByRole("button", { name: "Canvas pane" }));
    await waitFor(() => expect(historyButton("Undo")).toBeEnabled());
    const id = mocks.operation.mock.calls[0]![0].upserts[0].id;
    fireEvent.click(historyButton("Undo"));
    await waitFor(() => expect(historyButton("Redo")).toBeEnabled());
    expect(mocks.operation.mock.calls[1]![0].archiveIds).toEqual([id]);
    fireEvent.click(historyButton("Redo"));
    await waitFor(() => expect(mocks.operation).toHaveBeenCalledTimes(3));
    expect(mocks.operation.mock.calls[2]![0].upserts[0].id).toBe(id);
  });
  it("opens the native image picker synchronously before upload", () => {
    mount([]);
    const click = vi.spyOn(
      screen.getByLabelText("Upload board images"),
      "click",
    );
    fireEvent.click(screen.getByRole("button", { name: "Image" }));
    expect(click).toHaveBeenCalledOnce();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("blocks duplicate creation during a pending request", async () => {
    let resolve!: (value: unknown) => void;
    mocks.operation.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    mount([]);
    fireEvent.click(screen.getByRole("button", { name: "Sticky" }));
    fireEvent.click(screen.getByRole("button", { name: "Canvas pane" }));
    fireEvent.click(screen.getByRole("button", { name: "Canvas pane" }));
    expect(mocks.operation).toHaveBeenCalledOnce();
    await act(async () => resolve({ status: "success", data: [] }));
    expect(screen.getByTestId("node-count")).toHaveTextContent("1");
  });
  it("keeps viewers read-only while allowing outline inspection", () => {
    mount([sticky], false);
    expect(screen.getByRole("button", { name: "Sticky" })).toBeDisabled();
    inspect();
    expect(screen.getByText(/Read only/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save object" }),
    ).not.toBeInTheDocument();
  });
  it("offers per-file upload recovery without destroying the canvas", async () => {
    mocks.upload.mockResolvedValue({
      status: "error",
      message: "Image upload failed. Retry.",
    });
    mount();
    fireEvent.change(screen.getByLabelText("Upload board images"), {
      target: {
        files: [new File(["image"], "reference.png", { type: "image/png" })],
      },
    });
    await waitFor(() =>
      expect(
        screen.getByText("Image upload failed. Retry."),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Retry file" })).toBeEnabled();
    expect(screen.getByTestId("node-count")).toHaveTextContent("1");
  });
  it("defers comments until opened and shares a single right panel slot", async () => {
    mount();
    expect(mocks.comments).not.toHaveBeenCalled();
    inspect();
    expect(
      screen.getByRole("complementary", { name: "Properties" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Open board comments" }),
    );
    await waitFor(() => expect(mocks.comments).toHaveBeenCalledOnce());
    expect(
      screen.queryByRole("complementary", { name: "Properties" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Comments" }),
    ).toBeInTheDocument();
  });
  it("moves a Section and its children in one undoable operation", async () => {
    const section = object({
        element_type: "SECTION",
        content: { title: "Frame" },
      }),
      child = object({ parent_id: section.id, x: 80, y: 100 });
    mount([section, child]);
    fireEvent.click(screen.getByRole("button", { name: "Drag first" }));
    await waitFor(() => expect(mocks.operation).toHaveBeenCalledOnce());
    expect(mocks.operation.mock.calls[0]![0].upserts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: section.id, x: 250, y: 310 }),
        expect.objectContaining({ id: child.id, x: 320, y: 390 }),
      ]),
    );
  });
  it("retains failed atomic intent and retries the same IDs", async () => {
    mocks.operation.mockResolvedValueOnce({
      status: "error",
      message: "Save failed.",
    });
    mount([]);
    fireEvent.click(screen.getByRole("button", { name: "Sticky" }));
    fireEvent.click(screen.getByRole("button", { name: "Canvas pane" }));
    await waitFor(() =>
      expect(screen.getByText("Couldn’t save")).toBeInTheDocument(),
    );
    const payload = mocks.operation.mock.calls[0]![0];
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
    expect(mocks.operation.mock.calls[1]![0]).toEqual(payload);
  });
  it("persists a device viewport under the exact account/organization/board scope without changing objects", () => {
    const key = `stylus-board-viewport::${board.organization_id}:${board.id}`;
    localStorage.setItem(key, JSON.stringify({ x: 30, y: 40, zoom: 0.5 }));
    mount();
    expect(mocks.setViewport).toHaveBeenCalledWith({ x: 30, y: 40, zoom: 0.5 });
    fireEvent.click(screen.getByRole("button", { name: "Pan viewport" }));
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({
      x: 100,
      y: 150,
      zoom: 0.75,
    });
    expect(screen.getByLabelText("Zoom level")).toHaveTextContent("75%");
    expect(mocks.operation).not.toHaveBeenCalled();
  });
  it("fits an explicit selection, exposes optional minimap, and keeps zoom read-only-safe", () => {
    mount([sticky], false);
    fireEvent.click(screen.getByRole("button", { name: "Select first" }));
    mocks.fit.mockClear();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Fit selection" })[0]!,
    );
    expect(mocks.fit).toHaveBeenCalledWith(
      expect.objectContaining({
        nodes: [expect.objectContaining({ id: sticky.id })],
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(mocks.zoom).toHaveBeenCalled();
    screen
      .getByLabelText("View menu")
      .closest("details")
      ?.setAttribute("open", "");
    fireEvent.click(screen.getByRole("button", { name: "Show minimap" }));
    expect(screen.getByLabelText("Board minimap")).toBeInTheDocument();
    expect(mocks.operation).not.toHaveBeenCalled();
  });
});
