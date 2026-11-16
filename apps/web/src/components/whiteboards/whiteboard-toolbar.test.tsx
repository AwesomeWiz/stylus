import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WhiteboardToolbar } from "./whiteboard-toolbar";

describe("WhiteboardToolbar", () => {
  it("offers six named shapes and supports toolbar arrow navigation", () => {
    const shape = vi.fn(),
      tool = vi.fn();
    render(
      <WhiteboardToolbar
        activeTool="SELECT"
        canMutate
        canUndo={false}
        canRedo={false}
        busy={false}
        onToolChange={tool}
        onImageRequest={vi.fn()}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onShapeChange={shape}
      />,
    );
    const select = screen.getByRole("button", { name: "Select" });
    select.focus();
    fireEvent.keyDown(select, { key: "ArrowDown" });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Pan" }),
    );
    screen
      .getByLabelText("Shapes", { selector: "summary" })
      .closest("details")
      ?.setAttribute("open", "");
    for (const name of [
      "Rectangle",
      "Rounded Rectangle",
      "Circle",
      "Diamond",
      "Line",
      "Arrow",
    ])
      expect(screen.getAllByRole("button", { name }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Circle" }));
    expect(shape).toHaveBeenCalledWith("circle");
    expect(tool).toHaveBeenCalledWith("SHAPE");
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  beforeEach(() => vi.stubGlobal("matchMedia", () => ({ matches: true })));
  it("switches tools and disables mutation tools for viewers", () => {
    const change = vi.fn();
    const { rerender } = render(
      <WhiteboardToolbar
        activeTool="SELECT"
        busy={false}
        canMutate
        canRedo={false}
        canUndo={false}
        onImageRequest={vi.fn()}
        onRedo={vi.fn()}
        onToolChange={change}
        onUndo={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sticky" }));
    expect(change).toHaveBeenCalledWith("STICKY");
    rerender(
      <WhiteboardToolbar
        activeTool="SELECT"
        busy={false}
        canMutate={false}
        canRedo={false}
        canUndo={false}
        onImageRequest={vi.fn()}
        onRedo={vi.fn()}
        onToolChange={change}
        onUndo={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Sticky" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pan" })).toBeEnabled();
  });

  it("opens the image picker directly and exposes history actions", () => {
    const image = vi.fn();
    const undo = vi.fn();
    render(
      <WhiteboardToolbar
        activeTool="SELECT"
        busy={false}
        canMutate
        canRedo={false}
        canUndo
        onImageRequest={image}
        onRedo={vi.fn()}
        onToolChange={vi.fn()}
        onUndo={undo}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Image" }));
    screen
      .getByLabelText("More tools")
      .closest("details")
      ?.setAttribute("open", "");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(image).toHaveBeenCalledOnce();
    expect(undo).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
  });
});
