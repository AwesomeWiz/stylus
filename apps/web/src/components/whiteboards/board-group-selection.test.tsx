import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
vi.mock("@/modules/whiteboards/voting-client", () => ({
  readBoardVoting: async () => ({
    status: "success",
    data: {
      session: null,
      own_votes: [],
      summaries: [],
      results: [],
      has_more: false,
    },
  }),
}));
vi.mock("@/modules/whiteboards/voting-actions", () => ({
  startBoardVotingAction: vi.fn(),
  setBoardVoteAction: vi.fn(),
  endBoardVotingAction: vi.fn(),
}));
const api = vi.hoisted(() => ({
  operation: vi.fn(),
  images: vi.fn(),
  comments: vi.fn(),
  snapshot: vi.fn(),
  feedback: vi.fn(),
  nodes: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/modules/whiteboards/actions", () => ({
  applyBoardOperationAction: api.operation,
  renameBoardAction: vi.fn(),
  uploadBoardImageAction: vi.fn(),
  setBoardReactionAction: vi.fn(),
}));
vi.mock("@/modules/whiteboards/read-actions", () => ({
  readBoardImagesAction: api.images,
  readBoardCommentsAction: api.comments,
  readBoardSnapshotAction: api.snapshot,
  readBoardReactionsAction: api.feedback,
}));
vi.mock("@/modules/whiteboards/realtime", () => ({
  subscribeToBoardCollaboration: vi.fn(),
}));
vi.mock("@xyflow/react", () => ({
  Background: () => null,
  BackgroundVariant: { Dots: "dots" },
  MiniMap: () => null,
  NodeResizer: ({
    isVisible,
    onResizeEnd,
  }: {
    isVisible: boolean;
    onResizeEnd: (event: unknown, value: unknown) => void;
  }) =>
    isVisible ? (
      <button
        aria-label="Resize child"
        onClick={() =>
          onResizeEnd({}, { x: 10, y: 20, width: 260, height: 220 })
        }
      />
    ) : null,
  ReactFlow: ({
    nodes,
    onInit,
    onNodeClick,
    onNodeDragStart,
    onNodeDragStop,
    children,
  }: {
    nodes: import("./whiteboard-node").WhiteboardFlowNode[];
    onInit: (value: unknown) => void;
    onNodeClick: (event: unknown, node: unknown) => void;
    onNodeDragStart: (event: unknown, node: unknown) => void;
    onNodeDragStop: (event: unknown, node: unknown) => void;
    children: React.ReactNode;
  }) => {
    api.nodes(nodes);
    onInit({
      getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
      screenToFlowPosition: (p: unknown) => p,
      fitView: vi.fn(),
      setViewport: vi.fn(),
      getNode: (id: string) => nodes.find((n) => n.id === id),
      setCenter: vi.fn(),
    });
    return (
      <div>
        <button
          onClick={() => {
            const node = nodes.find((n) => n.data.selectionRoot);
            if (node) {
              onNodeDragStart({}, node);
              onNodeDragStop(
                {},
                {
                  ...node,
                  position: {
                    x: node.position.x + 15,
                    y: node.position.y + 10,
                  },
                },
              );
            }
          }}
        >
          Drag selection
        </button>
        {nodes.map((node) => (
          <div
            key={node.id}
            className="react-flow__node"
            data-id={node.id}
            data-testid={`flow-${node.id}`}
            onClick={(event) => onNodeClick(event, node)}
          >
            <WhiteboardNode
              {...({
                id: node.id,
                data: node.data,
                selected: node.selected,
                type: "whiteboard",
                dragging: false,
                draggable: node.draggable,
                selectable: true,
                deletable: true,
                isConnectable: false,
                positionAbsoluteX: node.position.x,
                positionAbsoluteY: node.position.y,
                zIndex: node.zIndex,
              } as React.ComponentProps<typeof WhiteboardNode>)}
            />
          </div>
        ))}
        {children}
      </div>
    );
  },
}));
import { WhiteboardNode } from "./whiteboard-node";
import { WhiteboardWorkspace } from "./whiteboard-workspace";
import { board, object } from "@/test/board-fixtures";
import type {
  BoardElementRow,
  BoardElementType,
} from "@/lib/supabase/database.types";
const group = object({
  element_type: "GROUP",
  content: { title: "Header Group" },
});
const kinds: BoardElementType[] = ["TEXT", "STICKY", "SHAPE", "IMAGE", "LINK"];
const children = kinds.map((element_type, i) =>
  object({
    element_type,
    parent_id: group.id,
    z_index: i + 2,
    content:
      element_type === "SHAPE"
        ? { shape: "rectangle" }
        : element_type === "LINK"
          ? { title: "Reference", url: "https://example.test", note: "Note" }
          : element_type === "IMAGE"
            ? { alt: "Photo" }
            : { text: element_type === "TEXT" ? "Heading" : "Idea" },
  }),
);
const outside = object({
  element_type: "SHAPE",
  content: { shape: "diamond" },
});
let saved: Map<string, BoardElementRow>;
function mount(rows = [group, ...children, outside]) {
  saved = new Map(rows.map((r) => [r.id, r]));
  return render(
    <WhiteboardWorkspace
      board={board}
      canMutate
      elements={rows}
      imageUrls={{}}
    />,
  );
}
const node = (id: string) => screen.getByTestId("flow-" + id);
function doubleClick(id: string) {
  fireEvent.click(node(id), { detail: 1 });
  fireEvent.click(node(id), { detail: 2 });
  fireEvent.doubleClick(node(id));
}
function roots() {
  return api.nodes.mock
    .lastCall![0].filter(
      (n: import("./whiteboard-node").WhiteboardFlowNode) =>
        n.data.selectionRoot,
    )
    .map((n: import("./whiteboard-node").WhiteboardFlowNode) => n.id);
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  api.images.mockResolvedValue({ status: "success", images: [] });
  api.feedback.mockResolvedValue({ status: "success", rows: [], counts: [] });
  api.comments.mockResolvedValue({
    status: "success",
    comments: [],
    before: null,
  });
  api.operation.mockImplementation(async (input) => ({
    status: "success",
    data: input.upserts.map(
      (value: Partial<BoardElementRow> & { id: string }) => {
        const row = {
          ...saved.get(value.id)!,
          ...value,
          updated_at: new Date().toISOString(),
        };
        saved.set(row.id, row);
        return row;
      },
    ),
  }));
});
describe("canvas Group drill-in", () => {
  it("Escape cancels a text child draft and returns directly to the parent without persistence", () => {
    mount();
    const target = screen.getByRole("button", { name: "Text: Heading" });
    for (let i = 0; i < 2; i++) {
      fireEvent.click(target, { detail: 1 });
      fireEvent.click(target, { detail: 2 });
      fireEvent.doubleClick(target);
    }
    const input = screen.getByRole("textbox", { name: "Edit text" });
    fireEvent.change(input, { target: { value: "Discarded" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(roots()).toEqual([group.id]);
    expect(api.operation).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Ungroup" })).toBeInTheDocument();
  });
  it.each(kinds)(
    "single click selects Group; double-click selects the actual %s child without saving",
    async (kind) => {
      mount();
      const child = children.find((r) => r.element_type === kind)!;
      fireEvent.click(node(child.id), { detail: 1 });
      expect(roots()).toEqual([group.id]);
      expect(
        screen.getByRole("button", { name: "Ungroup" }),
      ).toBeInTheDocument();
      doubleClick(child.id);
      expect(roots()).toEqual([child.id]);
      await waitFor(() =>
        expect(
          screen.getByRole("treeitem", {
            name: new RegExp(
              kind === "IMAGE"
                ? "image Photo"
                : kind === "LINK"
                  ? "link Reference"
                  : kind === "SHAPE"
                    ? "shape rectangle"
                    : kind === "TEXT"
                      ? "text Heading"
                      : "sticky Idea",
            ),
          }),
        ).toHaveAttribute("aria-selected", "true"),
      );
      if (kind === "TEXT" || kind === "STICKY")
        expect(
          screen.getAllByRole("combobox", { name: "Font family" }).length,
        ).toBeGreaterThan(0);
      if (kind === "IMAGE")
        expect(
          screen.getByRole("combobox", { name: "Image fit" }),
        ).toBeInTheDocument();
      if (kind === "SHAPE")
        expect(
          screen.getByRole("button", { name: /^Shape fill:/ }),
        ).toBeInTheDocument();
      if (kind === "LINK")
        expect(screen.getByLabelText("URL")).toHaveValue(
          "https://example.test",
        );
      expect(
        screen.queryByRole("textbox", { name: /Edit text|Edit sticky/ }),
      ).not.toBeInTheDocument();
      expect(api.operation).not.toHaveBeenCalled();
    },
  );
  it("returns to Group then clears with Escape, and exits to an outside root even with Shift", () => {
    mount();
    doubleClick(children[2]!.id);
    fireEvent.keyDown(document.getElementById("board-canvas")!, {
      key: "Escape",
    });
    expect(roots()).toEqual([group.id]);
    fireEvent.keyDown(document.getElementById("board-canvas")!, {
      key: "Escape",
    });
    expect(roots()).toEqual([]);
    doubleClick(children[2]!.id);
    fireEvent.click(node(outside.id), { shiftKey: true, detail: 1 });
    expect(roots()).toEqual([outside.id]);
    expect(api.operation).not.toHaveBeenCalled();
  });
  it("Shift toggles sibling children without changing ownership", () => {
    mount();
    doubleClick(children[2]!.id);
    fireEvent.click(node(children[3]!.id), { detail: 1, shiftKey: true });
    expect(new Set(roots())).toEqual(
      new Set([children[2]!.id, children[3]!.id]),
    );
    fireEvent.click(node(children[3]!.id), { detail: 1, shiftKey: true });
    expect(roots()).toEqual([children[2]!.id]);
    expect(api.operation).not.toHaveBeenCalled();
  });
  it("expands Layers when drilling into a child and preserves keyboard access", async () => {
    mount();
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse Header Group layers" }),
    );
    expect(
      screen.queryByRole("treeitem", { name: /text Heading/ }),
    ).not.toBeInTheDocument();
    doubleClick(children[0]!.id);
    expect(
      await screen.findByRole("treeitem", { name: /text Heading/ }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("treeitem", { name: /group Header Group/ }),
    ).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(document.getElementById("board-canvas")!, {
      key: "Escape",
    });
    fireEvent.keyDown(document.getElementById("board-canvas")!, {
      key: "Enter",
    });
    expect(roots()).toEqual([children[4]!.id]);
    expect(api.operation).not.toHaveBeenCalled();
  });
  it("first text double-click only drills in, subsequent double-click edits and persists membership", async () => {
    mount();
    const id = children[0]!.id,
      target = screen.getByRole("button", { name: "Text: Heading" });
    fireEvent.click(target, { detail: 1 });
    fireEvent.click(target, { detail: 2 });
    fireEvent.doubleClick(target);
    expect(
      screen.queryByRole("textbox", { name: "Edit text" }),
    ).not.toBeInTheDocument();
    expect(roots()).toEqual([id]);
    fireEvent.click(target, { detail: 1 });
    fireEvent.click(target, { detail: 2 });
    fireEvent.doubleClick(target);
    const input = screen.getByRole("textbox", { name: "Edit text" });
    fireEvent.change(input, { target: { value: "Edited heading" } });
    fireEvent.blur(input);
    await waitFor(() => expect(api.operation).toHaveBeenCalledOnce());
    expect(saved.get(id)).toMatchObject({
      parent_id: group.id,
      content: { text: "Edited heading" },
    });
  });
  it("persists child movement and resizing as child operations, with no ungroup", async () => {
    mount();
    const child = children[2]!;
    doubleClick(child.id);
    fireEvent.click(screen.getByRole("button", { name: "Drag selection" }));
    await waitFor(() => expect(api.operation).toHaveBeenCalledOnce());
    expect(saved.get(child.id)).toMatchObject({
      parent_id: group.id,
      x: child.x + 15,
      y: child.y + 10,
    });
    await waitFor(() => expect(screen.getByLabelText("W")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("W"), { target: { value: "275" } });
    fireEvent.blur(screen.getByLabelText("W"));
    await waitFor(() => expect(api.operation).toHaveBeenCalledTimes(2));
    expect(saved.get(child.id)).toMatchObject({
      width: 275,
      parent_id: group.id,
    });
    expect(saved.get(group.id)).toEqual(group);
  });
  it("Space pans over selected children without allowing a stale node drag to save", () => {
    mount();
    doubleClick(children[2]!.id);
    const canvas = document.getElementById("board-canvas")!;
    fireEvent.keyDown(canvas, { key: " ", code: "Space" });
    expect(
      api.nodes.mock.lastCall?.[0].find(
        (node: { id: string }) => node.id === children[2]!.id,
      ).draggable,
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Drag selection" }));
    expect(api.operation).not.toHaveBeenCalled();
    fireEvent.keyUp(canvas, { key: " ", code: "Space" });
    expect(
      api.nodes.mock.lastCall?.[0].find(
        (node: { id: string }) => node.id === children[2]!.id,
      ).draggable,
    ).toBe(true);
  });
  it.each(["group", "child"])(
    "does not bypass a locked %s while allowing inspection",
    async (mode) => {
      const lockedGroup = mode === "group" ? { ...group, locked: true } : group,
        child =
          mode === "child" ? { ...children[0]!, locked: true } : children[0]!;
      mount([lockedGroup, child]);
      doubleClick(child.id);
      expect(roots()).toEqual([child.id]);
      expect(screen.getByLabelText("X")).toBeDisabled();
      expect(
        screen.queryByRole("button", { name: "Resize child" }),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Drag selection" }));
      expect(api.operation).not.toHaveBeenCalled();
    },
  );
});
