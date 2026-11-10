import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { BoardContextMenu } from "./board-context-menu";
import { Dialog } from "@/components/ui/dialog";
import { useState } from "react";
beforeEach(() =>
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  ),
);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const commands = [
  { label: "Copy", run: vi.fn() },
  {
    label: "Arrange",
    children: [
      { label: "Bring to front", run: vi.fn() },
      { label: "Send to back", run: vi.fn() },
    ],
  },
  { label: "Delete", run: vi.fn() },
  { label: "Properties", run: vi.fn() },
];
describe("Board context menu input modes", () => {
  it("keeps a sheet's menu inside its focus scope and closes it before the sheet on Escape", () => {
    const closeSheet = vi.fn();
    function Sheet() {
      const [open, setOpen] = useState(false);
      return (
        <Dialog
          open
          onOpenChange={closeSheet}
          title="Layers"
          description="Board layers"
        >
          <button onClick={() => setOpen(true)}>Layer actions</button>
          {open ? (
            <BoardContextMenu
              keyboard
              position={{ x: 100, y: 100 }}
              commands={commands}
              onClose={() => setOpen(false)}
            />
          ) : null}
        </Dialog>
      );
    }
    render(<Sheet />);
    const opener = screen.getByRole("button", { name: "Layer actions" });
    opener.focus();
    fireEvent.click(opener);
    const menu = screen.getByRole("menu", { name: "Board actions" });
    expect(screen.getByRole("dialog")).toContainElement(menu);
    const first = screen.getByRole("menuitem", { name: "Copy" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(opener).toHaveFocus();
    expect(closeSheet).not.toHaveBeenCalled();
  });
  it("pointer opening has no active item and hover opens a stable adjacent submenu", () => {
    render(
      <BoardContextMenu
        position={{ x: 100, y: 100 }}
        commands={commands}
        onClose={vi.fn()}
      />,
    );
    const menu = screen.getByRole("menu", { name: "Board actions" });
    expect(menu).toHaveFocus();
    expect(menu.querySelector("[data-active=true]")).toBeNull();
    const parent = screen.getByRole("menuitem", { name: "Arrange" });
    fireEvent.pointerMove(parent, { pointerType: "mouse" });
    const submenu = screen.getByRole("menu", { name: "Arrange" });
    expect(submenu.parentElement).toBe(document.body);
    fireEvent.pointerLeave(parent);
    fireEvent.pointerEnter(within(submenu).getByText("Bring to front"), {
      pointerType: "mouse",
    });
    expect(submenu).toBeInTheDocument();
  });
  it("keyboard opening focuses first, arrows enter/return and Escape closes/restores", () => {
    const close = vi.fn();
    render(
      <BoardContextMenu
        keyboard
        position={{ x: 100, y: 100 }}
        commands={commands}
        onClose={close}
      />,
    );
    const copy = screen.getByRole("menuitem", { name: "Copy" });
    expect(copy).toHaveFocus();
    fireEvent.keyDown(copy, { key: "ArrowDown" });
    const arrange = screen.getByRole("menuitem", { name: "Arrange" });
    expect(arrange).toHaveFocus();
    fireEvent.keyDown(arrange, { key: "ArrowRight" });
    const first = screen.getByRole("menuitem", { name: "Bring to front" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(arrange).toHaveFocus();
    expect(screen.queryByRole("menu", { name: "Arrange" })).toBeNull();
    fireEvent.keyDown(arrange, { key: "Escape" });
    expect(close).toHaveBeenCalledOnce();
  });
  it("touch uses a tap without requiring hover", () => {
    render(
      <BoardContextMenu
        position={{ x: 10, y: 10 }}
        commands={commands}
        onClose={vi.fn()}
      />,
    );
    const parent = screen.getByRole("menuitem", { name: "Arrange" });
    fireEvent.pointerMove(parent, { pointerType: "touch" });
    expect(screen.queryByRole("menu", { name: "Arrange" })).toBeNull();
    fireEvent.click(parent);
    expect(screen.getByRole("menu", { name: "Arrange" })).toBeInTheDocument();
  });
});
