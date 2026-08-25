import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  BoardElementRow,
  BoardElementType,
} from "@/lib/supabase/database.types";

import { WhiteboardInspector } from "./whiteboard-inspector";

function element(type: BoardElementType): BoardElementRow {
  return {
    archived_at: null,
    board_id: "b",
    content: type === "SHAPE" ? { shape: "rectangle" } : { text: "Idea" },
    created_at: "2026-08-25T00:00:00Z",
    created_by: "u",
    element_type: type,
    height: 80,
    id: "e",
    metadata: {},
    organization_id: "o",
    rotation: 0,
    style:
      type === "TEXT" ? { align: "left", color: "#18181b", fontSize: 24 } : {},
    updated_at: "2026-08-25T00:00:00Z",
    updated_by: "u",
    width: 200,
    x: 0,
    y: 0,
    z_index: 1,
  };
}

describe("WhiteboardInspector", () => {
  afterEach(cleanup);

  it("edits bounded text size, color and alignment", () => {
    const change = vi.fn();
    render(
      <WhiteboardInspector
        element={element("TEXT")}
        onStyleChange={change}
        pending={false}
      />,
    );
    fireEvent.change(screen.getByLabelText("Font size"), {
      target: { value: "72" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Text color: #1d4ed8" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Align center" }));
    expect(change).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ fontSize: 72 }),
    );
    expect(change).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ color: "#1d4ed8" }),
    );
    expect(change).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ align: "center" }),
    );
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).not.toContain("80");
  });

  it("offers curated sticky, shape and arrow palettes", () => {
    const change = vi.fn();
    const { rerender } = render(
      <WhiteboardInspector
        element={element("STICKY")}
        onStyleChange={change}
        pending={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Blue sticky" }));
    expect(change).toHaveBeenCalledWith(
      expect.objectContaining({ background: "#dbeafe", color: "#1e3a8a" }),
    );
    rerender(
      <WhiteboardInspector
        element={element("SHAPE")}
        onStyleChange={change}
        pending={false}
      />,
    );
    expect(
      screen.getByRole("group", { name: "Shape fill" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Shape stroke" }),
    ).toBeInTheDocument();
    rerender(
      <WhiteboardInspector
        element={element("ARROW")}
        onStyleChange={change}
        pending={false}
      />,
    );
    expect(
      screen.getByRole("group", { name: "Arrow color" }),
    ).toBeInTheDocument();
  });

  it("hides irrelevant formatting for images", () => {
    const { container } = render(
      <WhiteboardInspector
        element={element("IMAGE")}
        onStyleChange={vi.fn()}
        pending={false}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
