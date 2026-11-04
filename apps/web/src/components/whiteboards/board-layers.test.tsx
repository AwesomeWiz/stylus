import {
  act,
  cleanup,
  fireEvent,
  createEvent,
  render,
  screen,
  waitFor,
  renderHook,
} from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { object } from "@/test/board-fixtures";
import { BoardOutline } from "./board-outline";
import { useBoardPanels } from "./use-board-view";
afterEach(() => {
  cleanup();
  localStorage.clear();
});
describe("Layers selection and inline rename", () => {
  it("has a keyboard tree, Shift selection, F2, trimmed blur save and Escape cancellation", async () => {
    const row = object({ content: { text: "Original text" } }),
      select = vi.fn(),
      update = vi.fn().mockResolvedValue(row);
    render(
      <BoardOutline
        rows={[row]}
        selected={[]}
        onSelect={select}
        onLocate={() => {}}
        onUpdate={update}
      />,
    );
    const item = screen.getByRole("treeitem");
    fireEvent.click(screen.getByRole("button", { name: "Original text" }), {
      shiftKey: true,
    });
    expect(select).toHaveBeenCalledWith(row.id, true);
    fireEvent.keyDown(item, { key: "F2" });
    const input = screen.getByRole("textbox", { name: "Layer name" });
    fireEvent.change(input, { target: { value: " Renamed " } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(row.id, {
        metadata: { label: "Renamed" },
      }),
    );
    fireEvent.keyDown(item, { key: "F2" });
    fireEvent.change(screen.getByRole("textbox", { name: "Layer name" }), {
      target: { value: "Discard" },
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Layer name" }), {
      key: "Escape",
    });
    expect(
      screen.queryByRole("textbox", { name: "Layer name" }),
    ).not.toBeInTheDocument();
    expect(update).toHaveBeenCalledOnce();
  });
  it("uses deliberate row drop targets and reports invalid drop without removing the layer", async () => {
    const a = object(),
      b = object({ element_type: "SECTION", content: { title: "Plan" } }),
      drop = vi.fn().mockRejectedValue(Error("Invalid drop"));
    render(
      <BoardOutline
        rows={[a, b]}
        selected={[]}
        onSelect={() => {}}
        onLocate={() => {}}
        onDrop={drop}
      />,
    );
    const items = screen.getAllByRole("treeitem"),
      dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
    fireEvent.dragStart(items[0]!, { dataTransfer });
    fireEvent.dragOver(items[1]!, { dataTransfer, clientY: 0 });
    fireEvent.drop(items[1]!, { dataTransfer });
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Invalid drop"),
    );
    expect(screen.getAllByRole("treeitem")).toHaveLength(2);
  });
  it("expands a collapsed drop container and scrolls gradually without changing child geometry", async () => {
    vi.useFakeTimers();
    try {
      const section = object({
          element_type: "SECTION",
          content: { title: "Plan" },
        }),
        child = object({ parent_id: section.id, content: { text: "Child" } }),
        source = object({ content: { text: "Source" } }),
        drop = vi.fn().mockResolvedValue(true);
      const { container } = render(
        <div data-board-scroll>
          <BoardOutline
            rows={[section, child, source]}
            selected={[child.id]}
            onSelect={() => {}}
            onLocate={() => {}}
            onDrop={drop}
          />
        </div>,
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Collapse Plan layers" }),
      );
      expect(screen.getByLabelText("Selected child")).toBeInTheDocument();
      const target = container.querySelector<HTMLElement>(
          `[data-layer-id="${section.id}"]`,
        )!,
        from = container.querySelector<HTMLElement>(
          `[data-layer-id="${source.id}"]`,
        )!,
        region = container.querySelector<HTMLElement>("[data-board-scroll]")!;
      vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
        top: 70,
        bottom: 110,
        height: 40,
      } as DOMRect);
      vi.spyOn(region, "getBoundingClientRect").mockReturnValue({
        top: 0,
        bottom: 100,
        height: 100,
      } as DOMRect);
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: "",
        dropEffect: "",
      };
      fireEvent.dragStart(from, { dataTransfer });
      const over = createEvent.dragOver(target, { dataTransfer });
      Object.defineProperty(over, "clientY", { value: 90 });
      fireEvent(target, over);
      act(() => vi.advanceTimersByTime(520));
      expect(screen.getByRole("button", { name: "Child" })).toBeInTheDocument();
      expect(region.scrollTop).toBeGreaterThan(0);
      fireEvent.drop(target, { dataTransfer });
      await act(async () => {});
      expect(drop).toHaveBeenCalledWith(source.id, section.id, "inside");
      const stopped = region.scrollTop;
      act(() => vi.advanceTimersByTime(80));
      expect(region.scrollTop).toBe(stopped);
    } finally {
      vi.useRealTimers();
    }
  });
});
describe("device/account panel preference", () => {
  it("defaults to both open, collapses independently, restores by account and toggles distraction-free", () => {
    const { result, unmount } = renderHook(() => useBoardPanels("a"));
    expect(result.current.layers).toBe(true);
    expect(result.current.properties).toBe(true);
    act(() => result.current.toggle("layers"));
    expect(result.current.layers).toBe(false);
    expect(result.current.properties).toBe(true);
    unmount();
    const restored = renderHook(() => useBoardPanels("a"));
    expect(restored.result.current.layers).toBe(false);
    act(() => restored.result.current.toggleBoth());
    expect(restored.result.current.properties).toBe(false);
    act(() => restored.result.current.toggleBoth());
    expect(restored.result.current.layers).toBe(true);
    const other = renderHook(() => useBoardPanels("b"));
    expect(other.result.current.layers).toBe(true);
  });
});
