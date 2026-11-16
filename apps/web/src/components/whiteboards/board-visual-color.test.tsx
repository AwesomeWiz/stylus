import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { object } from "@/test/board-fixtures";
import { BoardColorPicker } from "./board-color-picker";
import { BoardPanel } from "./board-panel";
import {
  BoardColorPreviewContext,
  createBoardColorPreview,
  useBoardColorRow,
} from "./board-color-preview";
import type { BoardElementRow } from "@/lib/supabase/database.types";
const change = vi.fn();
function Painted({ row }: { row: BoardElementRow }) {
  return (
    <output data-testid="preview">
      {String(useBoardColorRow(row).style.color)}
    </output>
  );
}
function Editor() {
  const [row, setRow] = useState(() =>
      object({ element_type: "TEXT", style: { color: "#ff0000" } }),
    ),
    [store] = useState(createBoardColorPreview);
  return (
    <BoardColorPreviewContext.Provider value={store}>
      <div data-board-panel="right">
        <BoardColorPicker
          label="Text color"
          value={String(row.style.color)}
          elementId={row.id}
          styleKey="color"
          onChange={async (color) => {
            change(color);
            setRow((current) => ({
              ...current,
              style: { ...current.style, color },
            }));
            return true;
          }}
        />
        <Painted row={row} />
      </div>
      <button>Outside</button>
    </BoardColorPreviewContext.Provider>
  );
}
const rect = (x: number, y: number, width: number, height: number) => ({
  x,
  y,
  left: x,
  top: y,
  right: x + width,
  bottom: y + height,
  width,
  height,
  toJSON: () => ({}),
});
beforeEach(() => {
  change.mockReset();
  vi.stubGlobal(
    "PointerEvent",
    class extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
      }
    },
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function open() {
  fireEvent.click(screen.getByRole("button", { name: /^Text color: #/ }));
  return screen.findByRole("group", { name: /^Saturation and brightness/ });
}
describe("visual Board colors", () => {
  it("closes only the color popup on Escape inside a narrow Properties sheet", async () => {
    const close = vi.fn();
    render(
      <BoardPanel title="Properties" onClose={close} docked>
        <BoardColorPicker
          label="Text color"
          value="#ff0000"
          onChange={change}
        />
      </BoardPanel>,
    );
    await open();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "Text color picker" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Properties" }),
    ).toBeInTheDocument();
    expect(close).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Text color: #ff0000" }),
    ).toHaveFocus();
  });
  it.each([
    "Text color",
    "Sticky fill",
    "Sticky text",
    "Shape fill",
    "Shape stroke",
  ])("opens the reusable visual controls for %s", async (label) => {
    render(
      <BoardColorPicker label={label} value="#123456" onChange={change} />,
    );
    fireEvent.click(screen.getByRole("button", { name: `${label}: #123456` }));
    expect(
      await screen.findByRole("group", { name: /Saturation and brightness/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Hue" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Opacity" })).toBeInTheDocument();
    expect(screen.getByLabelText(`${label} HEX`)).toHaveValue("#123456");
  });
  it("previews only the affected object throughout a gesture and saves once on release", async () => {
    render(<Editor />);
    const square = await open();
    vi.spyOn(square, "getBoundingClientRect").mockReturnValue(
      rect(0, 0, 200, 100),
    );
    fireEvent.pointerDown(square, { pointerId: 1, clientX: 0, clientY: 0 });
    expect(screen.getByTestId("preview")).toHaveTextContent("#ffffff");
    fireEvent.pointerMove(square, { pointerId: 1, clientX: 200, clientY: 100 });
    expect(screen.getByTestId("preview")).toHaveTextContent("#000000");
    expect(change).not.toHaveBeenCalled();
    fireEvent.pointerUp(square, { pointerId: 1 });
    await waitFor(() =>
      expect(change).toHaveBeenCalledExactlyOnceWith("#000000"),
    );
    expect(screen.getByTestId("preview")).toHaveTextContent("#000000");
  });
  it("Escape cancels an uncommitted gesture, restores confirmed color and opener focus", async () => {
    render(<Editor />);
    const trigger = screen.getByRole("button", { name: "Text color: #ff0000" }),
      square = await open();
    vi.spyOn(square, "getBoundingClientRect").mockReturnValue(
      rect(0, 0, 100, 100),
    );
    fireEvent.pointerDown(square, { pointerId: 1, clientX: 0, clientY: 0 });
    expect(screen.getByTestId("preview")).toHaveTextContent("#ffffff");
    fireEvent.keyDown(square, { key: "Escape" });
    expect(screen.getByTestId("preview")).toHaveTextContent("#ff0000");
    expect(change).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("synchronizes HEX, hue, alpha and the visual handle in both directions", async () => {
    render(<Editor />);
    await open();
    const input = screen.getByLabelText("Text color HEX");
    fireEvent.change(input, { target: { value: "#00ff0080" } });
    expect(screen.getByRole("slider", { name: "Hue" })).toHaveValue("120");
    expect(screen.getByRole("slider", { name: "Opacity" })).toHaveValue("50");
    fireEvent.change(screen.getByRole("slider", { name: "Hue" }), {
      target: { value: "240" },
    });
    expect(input).toHaveValue("#0000ff80");
    fireEvent.change(screen.getByRole("slider", { name: "Opacity" }), {
      target: { value: "25" },
    });
    expect(input).toHaveValue("#0000ff40");
    expect(change).not.toHaveBeenCalled();
    fireEvent.pointerUp(screen.getByRole("slider", { name: "Opacity" }));
    await waitFor(() =>
      expect(change).toHaveBeenCalledExactlyOnceWith("#0000ff40"),
    );
  });
  it("supports keyboard square selection, exact HEX and outside normal commit", async () => {
    render(<Editor />);
    const square = await open();
    fireEvent.keyDown(square, { key: "ArrowLeft", shiftKey: true });
    expect(change).not.toHaveBeenCalled();
    fireEvent.keyUp(square, { key: "ArrowLeft" });
    await waitFor(() => expect(change).toHaveBeenCalledOnce());
    const hex = screen.getByLabelText("Text color HEX");
    fireEvent.change(hex, { target: { value: "#4F5BD580" } });
    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));
    await waitFor(() => expect(change).toHaveBeenLastCalledWith("#4F5BD580"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("positions left of Properties without changing it and falls back inside a narrow viewport", async () => {
    vi.stubGlobal("innerWidth", 1440);
    vi.stubGlobal("innerHeight", 900);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        return this.hasAttribute("data-board-panel")
          ? rect(1120, 48, 320, 852)
          : this.hasAttribute("data-board-popup")
            ? rect(0, 0, 288, 500)
            : rect(1360, 300, 40, 40);
      },
    );
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.hasAttribute("data-board-popup") ? 288 : 40;
      },
    );
    render(<Editor />);
    await open();
    const popup = screen.getByRole("dialog", { name: "Text color picker" });
    expect(popup).toHaveStyle({ left: "824px" });
    expect(popup.style.position).not.toBe("relative");
    vi.stubGlobal("innerWidth", 390);
    act(() => window.dispatchEvent(new Event("resize")));
    expect(parseFloat(popup.style.left)).toBeGreaterThanOrEqual(8);
    expect(parseFloat(popup.style.left) + 288).toBeLessThanOrEqual(390);
  });
  it("feature detects the system Eyedropper and commits only an explicitly sampled color", async () => {
    const sample = vi.fn().mockResolvedValue({ sRGBHex: "#123456" });
    vi.stubGlobal(
      "EyeDropper",
      class {
        open = sample;
      },
    );
    render(<Editor />);
    await open();
    expect(sample).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Eyedropper" }));
    await waitFor(() =>
      expect(change).toHaveBeenCalledExactlyOnceWith("#123456"),
    );
  });
  it("works without Eyedropper and offers an explicit transparent Shape state", async () => {
    vi.stubGlobal("EyeDropper", undefined);
    render(
      <BoardColorPicker
        label="Shape fill"
        value="#abcdef"
        allowNone
        onChange={change}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Shape fill: #abcdef" }),
    );
    expect(
      screen.queryByRole("button", { name: "Eyedropper" }),
    ).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "None" }));
    await waitFor(() =>
      expect(change).toHaveBeenCalledExactlyOnceWith("#00000000"),
    );
  });
  it("does not let an older picker clear a newer owner's preview", () => {
    const store = createBoardColorPreview();
    store.set("a", "old", { color: "#111111" });
    store.set("a", "new", { color: "#222222" });
    store.clear("a", "old");
    expect(store.get("a")).toEqual({ color: "#222222" });
    store.clear("a", "new");
    expect(store.get("a")).toBeNull();
  });
});
