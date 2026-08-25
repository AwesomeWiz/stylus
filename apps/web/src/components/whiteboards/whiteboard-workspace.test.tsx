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
    onPaneClick,
    onSelectionChange,
  }: {
    children: React.ReactNode;
    nodes: { id: string; position: { x: number; y: number } }[];
    onInit: (value: unknown) => void;
    onNodeDragStop: (event: unknown, node: unknown) => void;
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
    fireEvent.click(screen.getByRole("button", { name: "Drag first" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update).toHaveBeenCalledWith({
      elementId: sticky.id,
      x: 250,
      y: 310,
    });
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
    fireEvent.click(screen.getByRole("button", { name: "Canvas pane" }));
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
