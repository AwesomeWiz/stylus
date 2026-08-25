import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  archive: vi.fn(),
  create: vi.fn(),
  rename: vi.fn(),
  restore: vi.fn(),
  update: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("@xyflow/react", () => ({
  applyNodeChanges: (_changes: unknown, nodes: unknown) => nodes,
  Background: () => null,
  BackgroundVariant: { Dots: "dots" },
  Controls: () => null,
  ReactFlow: ({
    children,
    nodes,
    onInit,
    onNodeDragStop,
    onNodesChange,
    onPaneClick,
    onSelectionChange,
  }: {
    children: React.ReactNode;
    nodes: { id: string; position: { x: number; y: number } }[];
    onInit: (value: unknown) => void;
    onNodeDragStop: (event: unknown, node: unknown) => void;
    onNodesChange: (changes: unknown[]) => void;
    onPaneClick: (event: unknown) => void;
    onSelectionChange: (value: unknown) => void;
  }) => {
    onInit({
      screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
    });
    return (
      <div>
        <span data-testid="node-count">{nodes.length}</span>
        <button onClick={() => onPaneClick({ clientX: 40, clientY: 60 })}>
          Canvas pane
        </button>
        <button
          disabled={!nodes[0]}
          onClick={() =>
            onNodeDragStop({}, { ...nodes[0], position: { x: 250, y: 310 } })
          }
        >
          Drag first
        </button>
        <button
          disabled={!nodes[0]}
          onClick={() => {
            onNodesChange([
              {
                id: nodes[0]?.id,
                position: { x: 50, y: 60 },
                type: "position",
              },
            ]);
            onNodesChange([
              {
                id: nodes[0]?.id,
                position: { x: 100, y: 120 },
                type: "position",
              },
            ]);
            onNodesChange([
              {
                id: nodes[0]?.id,
                position: { x: 200, y: 240 },
                type: "position",
              },
            ]);
          }}
        >
          Preview drag
        </button>
        <button
          disabled={!nodes[0]}
          onClick={() => onSelectionChange({ nodes: [nodes[0]] })}
        >
          Select first
        </button>
        {children}
      </div>
    );
  },
}));
vi.mock("@/modules/whiteboards/actions", () => ({
  archiveBoardElementAction: mocks.archive,
  createBoardElementAction: mocks.create,
  renameBoardAction: mocks.rename,
  restoreBoardElementAction: mocks.restore,
  updateBoardElementAction: mocks.update,
  uploadBoardImageAction: mocks.upload,
}));

import type { BoardElementRow, BoardRow } from "@/lib/supabase/database.types";
import { WhiteboardWorkspace } from "./whiteboard-workspace";

const board: BoardRow = {
  archived_at: null,
  created_at: "2026-08-25T00:00:00Z",
  created_by: "u",
  id: "20000000-0000-4000-8000-000000000001",
  organization_id: "o",
  title: "Ideas",
  updated_at: "2026-08-25T00:00:00Z",
  updated_by: "u",
};
const sticky: BoardElementRow = {
  archived_at: null,
  board_id: board.id,
  content: { text: "Persisted idea" },
  created_at: "2026-08-25T00:00:00Z",
  created_by: "u",
  element_type: "STICKY",
  height: 180,
  id: "30000000-0000-4000-8000-000000000001",
  metadata: {},
  organization_id: "o",
  rotation: 0,
  style: { color: "#fef3c7" },
  updated_at: "2026-08-25T00:00:00Z",
  updated_by: "u",
  width: 200,
  x: 10,
  y: 20,
  z_index: 1,
};

describe("WhiteboardWorkspace", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockImplementation(async (input) => ({
      data: {
        ...sticky,
        ...input,
        id: sticky.id,
        z_index: input.zIndex ?? sticky.z_index,
      },
      status: "success",
    }));
    mocks.create.mockResolvedValue({
      data: { ...sticky, id: "30000000-0000-4000-8000-000000000002" },
      status: "success",
    });
    mocks.archive.mockResolvedValue({ data: undefined, status: "success" });
    mocks.restore.mockResolvedValue({ data: sticky, status: "success" });
  });

  it("reconstructs persisted elements when a board is reopened", () => {
    render(
      <WhiteboardWorkspace
        board={board}
        canMutate
        elements={[sticky]}
        imageUrls={{}}
      />,
    );
    expect(screen.getByTestId("node-count")).toHaveTextContent("1");
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("creates the selected tool at canvas coordinates", async () => {
    render(
      <WhiteboardWorkspace
        board={board}
        canMutate
        elements={[]}
        imageUrls={{}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sticky" }));
    fireEvent.click(screen.getByRole("button", { name: "Canvas pane" }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          boardId: board.id,
          elementType: "STICKY",
          x: 40,
          y: 60,
        }),
      ),
    );
    expect(screen.getByTestId("node-count")).toHaveTextContent("1");
  });

  it("persists only the final drag position", async () => {
    render(
      <WhiteboardWorkspace
        board={board}
        canMutate
        elements={[sticky]}
        imageUrls={{}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Preview drag" }));
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Drag first" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update).toHaveBeenCalledWith({
      elementId: sticky.id,
      x: 250,
      y: 310,
    });
  });

  it("persists contextual formatting and makes it undoable", async () => {
    render(
      <WhiteboardWorkspace
        board={board}
        canMutate
        elements={[sticky]}
        imageUrls={{}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Select first" }));
    fireEvent.click(screen.getByRole("button", { name: "Blue sticky" }));
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith({
        elementId: sticky.id,
        style: expect.objectContaining({
          background: "#dbeafe",
          color: "#1e3a8a",
        }),
      }),
    );
    await waitFor(
      () => expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled(),
      { timeout: 5000 },
    );
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2));
    expect(mocks.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ style: sticky.style }),
    );
  });

  it("persists undo and redo so the reloaded board matches history", async () => {
    render(
      <WhiteboardWorkspace
        board={board}
        canMutate
        elements={[sticky]}
        imageUrls={{}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Drag first" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    await waitFor(
      () => expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled(),
      { timeout: 5000 },
    );
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2));
    expect(mocks.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        elementId: sticky.id,
        x: 10,
        y: 20,
      }),
    );
    await waitFor(
      () => expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled(),
      { timeout: 5000 },
    );
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(3));
    expect(mocks.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ x: 250, y: 310 }),
    );
  });

  it("supports keyboard history shortcuts without hijacking inputs", async () => {
    render(
      <WhiteboardWorkspace
        board={board}
        canMutate
        elements={[sticky]}
        imageUrls={{}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Drag first" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled(),
    );
    fireEvent.keyDown(window, { ctrlKey: true, key: "z" });
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled(),
    );
    fireEvent.keyDown(window, { ctrlKey: true, key: "y" });
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(3));
    fireEvent.click(screen.getByRole("button", { name: "Ideas" }));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Board name" }), {
      ctrlKey: true,
      key: "z",
    });
    expect(mocks.update).toHaveBeenCalledTimes(3);
  });

  it("archives and restores a created element through history", async () => {
    render(
      <WhiteboardWorkspace
        board={board}
        canMutate
        elements={[]}
        imageUrls={{}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sticky" }));
    fireEvent.click(screen.getByRole("button", { name: "Canvas pane" }));
    await waitFor(
      () => expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled(),
      { timeout: 5000 },
    );
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(mocks.archive).toHaveBeenCalledOnce());
    await waitFor(
      () => expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled(),
      { timeout: 5000 },
    );
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    await waitFor(() => expect(mocks.restore).toHaveBeenCalledOnce());
  });

  it("opens the native image picker on the toolbar click before upload", () => {
    render(
      <WhiteboardWorkspace
        board={board}
        canMutate
        elements={[]}
        imageUrls={{}}
      />,
    );
    const input = screen.getByLabelText(
      "Upload board image",
    ) as HTMLInputElement;
    const click = vi.spyOn(input, "click");
    fireEvent.click(screen.getByRole("button", { name: "Image" }));
    expect(click).toHaveBeenCalledOnce();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("blocks duplicate creation while the first request is pending", async () => {
    let resolveCreate: ((value: unknown) => void) | undefined;
    mocks.create.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    render(
      <WhiteboardWorkspace
        board={board}
        canMutate
        elements={[]}
        imageUrls={{}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sticky" }));
    fireEvent.click(screen.getByRole("button", { name: "Canvas pane" }));
    fireEvent.click(screen.getByRole("button", { name: "Canvas pane" }));
    expect(mocks.create).toHaveBeenCalledOnce();
    resolveCreate?.({ data: { ...sticky, id: "new" }, status: "success" });
    await waitFor(() =>
      expect(screen.getByTestId("node-count")).toHaveTextContent("1"),
    );
  });

  it("does not expose editing controls to viewers", () => {
    render(
      <WhiteboardWorkspace
        board={board}
        canMutate={false}
        elements={[sticky]}
        imageUrls={{}}
      />,
    );
    expect(screen.getByText("View only")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sticky" })).toBeDisabled();
  });

  it("shows a recoverable error when image upload persistence fails", async () => {
    mocks.upload.mockResolvedValue({
      message: "The image could not be uploaded. Please try again.",
      status: "error",
    });
    render(
      <WhiteboardWorkspace
        board={board}
        canMutate
        elements={[]}
        imageUrls={{}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Image" }));
    fireEvent.change(screen.getByLabelText("Upload board image"), {
      target: {
        files: [new File(["image"], "reference.png", { type: "image/png" })],
      },
    });
    await waitFor(() =>
      expect(
        screen.getByText("The image could not be uploaded. Please try again."),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Not saved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
