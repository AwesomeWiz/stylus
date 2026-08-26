import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@xyflow/react", () => ({
  NodeResizer: ({
    onResizeEnd,
  }: {
    onResizeEnd: (
      event: unknown,
      value: { height: number; width: number; x: number; y: number },
    ) => void;
  }) => (
    <button
      aria-label="Resize element"
      onClick={() => onResizeEnd({}, { height: 220, width: 260, x: 30, y: 40 })}
    />
  ),
}));

import type { BoardElementRow } from "@/lib/supabase/database.types";
import { WhiteboardNode, type WhiteboardNodeData } from "./whiteboard-node";

const sticky: BoardElementRow = {
  archived_at: null,
  board_id: "b",
  content: { text: "Original" },
  created_at: "2026-08-25T00:00:00Z",
  created_by: "u",
  element_type: "STICKY",
  height: 180,
  id: "e",
  metadata: {},
  organization_id: "o",
  rotation: 0,
  style: { color: "#fef3c7", fontSize: 18 },
  updated_at: "2026-08-25T00:00:00Z",
  updated_by: "u",
  width: 200,
  x: 10,
  y: 20,
  z_index: 1,
};

function props(data: WhiteboardNodeData) {
  return {
    data,
    id: "e",
    selected: true,
    type: "whiteboard",
    dragging: false,
    draggable: true,
    selectable: true,
    deletable: true,
    isConnectable: false,
    positionAbsoluteX: 10,
    positionAbsoluteY: 20,
    zIndex: 1,
  } as unknown as React.ComponentProps<typeof WhiteboardNode>;
}

function nodeData(overrides: Partial<WhiteboardNodeData> = {}) {
  return {
    canMutate: true,
    commentCount: 0,
    element: sticky,
    onContentCommit: vi.fn(),
    onResizeCommit: vi.fn(),
    ...overrides,
  } satisfies WhiteboardNodeData;
}

describe("WhiteboardNode", () => {
  afterEach(cleanup);

  it("commits text on blur without rendering unsafe HTML", () => {
    const commit = vi.fn();
    render(
      <WhiteboardNode {...props(nodeData({ onContentCommit: commit }))} />,
    );
    fireEvent.doubleClick(
      screen.getByRole("button", { name: /Sticky note: Original/ }),
    );
    const editor = screen.getByRole("textbox", { name: "Edit sticky note" });
    fireEvent.change(editor, {
      target: { value: "<img src=x onerror=alert(1)>" },
    });
    fireEvent.blur(editor);
    expect(commit).toHaveBeenCalledWith(sticky.id, {
      text: "<img src=x onerror=alert(1)>",
    });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("commits valid final resize geometry", () => {
    const resize = vi.fn();
    render(<WhiteboardNode {...props(nodeData({ onResizeCommit: resize }))} />);
    fireEvent.click(screen.getByRole("button", { name: "Resize element" }));
    expect(resize).toHaveBeenCalledWith(sticky.id, {
      height: 220,
      width: 260,
      x: 30,
      y: 40,
    });
  });

  it("renders a new arrow horizontally", () => {
    const arrow = {
      ...sticky,
      element_type: "ARROW" as const,
      height: 24,
      style: { color: "#52525b", strokeWidth: 2 },
      width: 220,
    };
    const { container } = render(
      <WhiteboardNode {...props(nodeData({ element: arrow }))} />,
    );
    const line = container.querySelector("line");
    expect(line).toHaveAttribute("y1", "12");
    expect(line).toHaveAttribute("y2", "12");
  });

  it("applies sticky background and readable foreground colors", () => {
    render(
      <WhiteboardNode
        {...props(
          nodeData({
            element: {
              ...sticky,
              style: { background: "#dbeafe", color: "#1e3a8a", fontSize: 20 },
            },
          }),
        )}
      />,
    );
    expect(screen.getByRole("button", { name: /Sticky note/ })).toHaveStyle({
      color: "rgb(30, 58, 138)",
      fontSize: "20px",
    });
  });

  it("shows the active comment count on a commented element", () => {
    render(<WhiteboardNode {...props(nodeData({ commentCount: 2 }))} />);
    expect(
      screen.getByRole("status", { name: "2 comments on this element" }),
    ).toBeInTheDocument();
  });

  it("does not show a comment badge when the element has no active comments", () => {
    render(<WhiteboardNode {...props(nodeData())} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
