import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WhiteboardToolbar } from "./whiteboard-toolbar";

describe("WhiteboardToolbar", () => {
  afterEach(cleanup);
  it("switches tools and disables mutation tools for viewers", () => {
    const change = vi.fn();
    const { rerender } = render(
      <WhiteboardToolbar activeTool="SELECT" canMutate onToolChange={change} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sticky" }));
    expect(change).toHaveBeenCalledWith("STICKY");
    rerender(
      <WhiteboardToolbar
        activeTool="SELECT"
        canMutate={false}
        onToolChange={change}
      />,
    );
    expect(screen.getByRole("button", { name: "Sticky" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pan" })).toBeEnabled();
  });
});
