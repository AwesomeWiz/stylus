import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { BoardPropertyField } from "./board-property-field";
import { BoardColorPicker } from "./board-color-picker";
import { BoardSelect } from "./board-select";
import { BoardMenu } from "./board-controls";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("Board numeric combobox", () => {
  it("commits a preset once, supports custom Enter/blur and restores Escape", async () => {
    const commit = vi.fn().mockResolvedValue(true);
    render(
      <BoardPropertyField
        label="Font size"
        value={18}
        numeric
        min={8}
        max={256}
        presets={[12, 18, 24]}
        onCommit={commit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Font size presets" }));
    fireEvent.click(await screen.findByRole("option", { name: "24" }));
    await waitFor(() => expect(commit).toHaveBeenCalledExactlyOnceWith(24));
    const field = screen.getByRole("combobox", { name: "Font size" });
    act(() => field.focus());
    fireEvent.change(field, { target: { value: "53" } });
    fireEvent.keyDown(field, { key: "Enter" });
    await waitFor(() => expect(commit).toHaveBeenLastCalledWith(53));
    act(() => field.focus());
    fireEvent.change(field, { target: { value: "bad" } });
    fireEvent.keyDown(field, { key: "Escape" });
    expect(field).toHaveValue("18");
    expect(commit).toHaveBeenCalledTimes(2);
    fireEvent.change(field, { target: { value: "9999" } });
    fireEvent.blur(field);
    expect(screen.getByRole("alert")).toHaveTextContent("8 to 256");
    expect(field).toHaveAttribute("type", "text");
  });
});
describe("Board color picker", () => {
  it("exposes a single swatch and persists exact HEX, with inline validation", async () => {
    const change = vi.fn().mockResolvedValue(true);
    render(
      <BoardColorPicker label="Text color" value="#18181b" onChange={change} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Text color: #18181b" }),
    );
    expect(
      await screen.findByRole("dialog", { name: "Text color picker" }),
    ).toBeInTheDocument();
    const hex = screen.getByLabelText("Text color HEX");
    fireEvent.change(hex, { target: { value: "url(https://bad.test)" } });
    fireEvent.blur(hex);
    expect(screen.getByRole("alert")).toHaveTextContent("HEX");
    expect(change).not.toHaveBeenCalled();
    fireEvent.change(hex, { target: { value: "#4F5BD5" } });
    fireEvent.blur(hex);
    await waitFor(() =>
      expect(change).toHaveBeenCalledExactlyOnceWith("#4F5BD5"),
    );
    expect(document.querySelector('input[type="color"]')).toBeNull();
  });
});
describe("Board select overlays", () => {
  it("Tab exits a font picker to the next local control instead of the portal's document end", async () => {
    render(
      <div data-board-panel="right">
        <BoardSelect
          label="Font family"
          value="a"
          searchable
          options={[{ value: "a", label: "Alpha" }]}
          onChange={vi.fn()}
        />
        <button>Next property</button>
      </div>,
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Font family" }));
    const search = await screen.findByRole("textbox", { name: "Search fonts" });
    fireEvent.keyDown(search, { key: "Tab" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next property" })).toHaveFocus();
  });
  it("shares keyboard options and remains inside a modal focus boundary", async () => {
    const select = vi.fn();
    render(
      <div role="dialog" aria-label="Properties">
        <BoardSelect
          label="Shape"
          value="circle"
          options={[
            { value: "circle", label: "Circle" },
            { value: "diamond", label: "Diamond" },
          ]}
          onChange={select}
        />
      </div>,
    );
    const trigger = screen.getByRole("combobox", { name: "Shape" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const circle = await screen.findByRole("option", { name: "Circle" });
    expect(circle).toHaveFocus();
    expect(screen.getByRole("dialog")).toContainElement(circle);
    fireEvent.keyDown(circle, { key: "End" });
    expect(screen.getByRole("option", { name: "Diamond" })).toHaveFocus();
    fireEvent.click(screen.getByRole("option", { name: "Diamond" }));
    expect(select).toHaveBeenCalledExactlyOnceWith("diamond");
    expect(trigger).toHaveFocus();
  });
});
describe("View menu dismissal and focus", () => {
  function mount() {
    const grid = vi.fn();
    render(
      <>
        <button>Outside</button>
        <div data-testid="canvas" tabIndex={0} />
        <BoardMenu
          onOutline={vi.fn()}
          onHelp={vi.fn()}
          shortcuts
          onShortcuts={vi.fn()}
          minimap={false}
          onMinimap={vi.fn()}
          connection="CONNECTED"
          onGrid={grid}
        />
      </>,
    );
    return grid;
  }
  it("dismisses outside/on canvas without swallowing the next interaction", async () => {
    mount();
    const trigger = screen.getByRole("button", { name: "View menu" });
    fireEvent.click(trigger);
    await screen.findByRole("menu");
    fireEvent.pointerDown(screen.getByTestId("canvas"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    await screen.findByRole("menu");
    act(() => screen.getByRole("button", { name: "Outside" }).focus());
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
  it("offers stable checkable labels, keyboard navigation, Escape and another-menu dismissal", async () => {
    const grid = mount(),
      trigger = screen.getByRole("button", { name: "View menu" });
    fireEvent.click(trigger);
    const item = await screen.findByRole("menuitemcheckbox", {
      name: "Dot grid",
    });
    expect(item).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(item, { key: "End" });
    expect(
      screen.getByRole("menuitem", { name: "Keyboard shortcuts" }),
    ).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.click(
      await screen.findByRole("menuitemcheckbox", { name: "Dot grid" }),
    );
    expect(grid).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    await screen.findByRole("menu");
    act(() =>
      document.dispatchEvent(
        new CustomEvent("stylus-board-popup", { detail: "another-menu" }),
      ),
    );
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByText(/offline work/)).not.toBeInTheDocument();
  });
});
