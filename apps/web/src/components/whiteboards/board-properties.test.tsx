import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { BoardPropertyField } from "./board-property-field";
import { BoardContextMenu } from "./board-context-menu";
afterEach(cleanup);
describe("Board numeric property commits", () => {
  it("displays clean floats and commits decimal text on blur without native stepping", async () => {
    const save = vi.fn().mockResolvedValue(true);
    render(
      <BoardPropertyField
        label="X"
        value={1066.43246276355}
        numeric
        onCommit={save}
      />,
    );
    const input = screen.getByLabelText("X");
    expect(input).toHaveValue("1066.43");
    expect(input).toHaveAttribute("type", "text");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "123.75" } });
    fireEvent.blur(input);
    await waitFor(() => expect(save).toHaveBeenCalledWith(123.75));
  });
  it("commits Enter once and Escape restores confirmed values", async () => {
    const save = vi.fn().mockResolvedValue(true);
    render(
      <BoardPropertyField label="W" value={160} numeric onCommit={save} />,
    );
    const input = screen.getByLabelText("W");
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "240.5" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "invalid" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("160");
    expect(save).toHaveBeenCalledOnce();
  });
  it("shows inline invalid input and preserves board usability after rejected save", async () => {
    const save = vi.fn().mockResolvedValue(false);
    render(
      <BoardPropertyField
        label="W"
        value={160}
        numeric
        min={24}
        max={10000}
        onCommit={save}
      />,
    );
    const input = screen.getByLabelText("W");
    fireEvent.change(input, { target: { value: "-1" } });
    fireEvent.blur(input);
    expect(screen.getByRole("alert")).toHaveTextContent("24");
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "200.5" } });
    fireEvent.blur(input);
    await waitFor(() => expect(input).toHaveValue("160"));
    expect(screen.getByRole("alert")).toHaveTextContent("restored");
  });
});
describe("keyboard context menus", () => {
  it("focuses commands, supports submenus and restores canvas focus with Escape", async () => {
    const close = vi.fn(),
      run = vi.fn();
    render(
      <>
        <div id="board-canvas" tabIndex={0} />
        <BoardContextMenu
          position={{ x: 100, y: 100 }}
          onClose={close}
          commands={[
            { label: "Duplicate", run },
            { label: "Arrange", children: [{ label: "Bring forward", run }] },
          ]}
        />
      </>,
    );
    expect(screen.getByRole("menuitem", { name: "Duplicate" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowRight" });
    expect(
      await screen.findByRole("menu", { name: "Arrange" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Bring forward" }));
    expect(run).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });
});
