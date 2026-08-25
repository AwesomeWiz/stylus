import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WhiteboardToolbar } from "./whiteboard-toolbar";

describe("WhiteboardToolbar", () => {
  afterEach(cleanup);
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
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(image).toHaveBeenCalledOnce();
    expect(undo).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
  });
});
