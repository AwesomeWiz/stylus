import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { object } from "@/test/board-fixtures";
import { BoardTypography } from "./board-typography";

afterEach(cleanup);
describe("Board typography controls", () => {
  it("edits supported families, weights and text layout without synthetic italic", async () => {
    const changed = vi.fn();
    function Editor() {
      const [row, setRow] = useState(() => object({ element_type: "TEXT" }));
      return (
        <BoardTypography
          row={row}
          onChange={async (style) => {
            changed(style);
            setRow({ ...row, style });
            return true;
          }}
        />
      );
    }
    render(<Editor />);
    expect(
      screen.queryByRole("button", { name: "Italic" }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Font family"), {
      target: { value: "lora" },
    });
    fireEvent.change(screen.getByLabelText("Font weight"), {
      target: { value: "600" },
    });
    for (const [name, value] of [
      ["Font size", "31.5"],
      ["Line height", "1.8"],
      ["Letter spacing", "1.25"],
    ]) {
      const field = screen.getByLabelText(name!);
      fireEvent.change(field, { target: { value } });
      fireEvent.blur(field);
      await waitFor(() => expect(field).toHaveValue(value));
    }
    for (const name of ["Align center", "Italic", "Underline", "Strikethrough"])
      fireEvent.click(screen.getByRole("button", { name }));
    fireEvent.change(screen.getByLabelText("Vertical alignment"), {
      target: { value: "bottom" },
    });
    fireEvent.change(screen.getByLabelText("Text sizing"), {
      target: { value: "auto" },
    });
    const color = screen.getByLabelText("Text color picker");
    fireEvent.change(color, { target: { value: "#123456" } });
    fireEvent.blur(color);
    expect(changed).toHaveBeenLastCalledWith(
      expect.objectContaining({
        family: "lora",
        weight: 600,
        fontSize: 31.5,
        lineHeight: 1.8,
        letterSpacing: 1.25,
        align: "center",
        italic: true,
        underline: true,
        strikethrough: true,
        verticalAlign: "bottom",
        sizing: "auto",
        color: "#123456",
      }),
    );
    fireEvent.change(screen.getByLabelText("Font family"), {
      target: { value: "geist-mono" },
    });
    expect(changed).toHaveBeenLastCalledWith(
      expect.objectContaining({ family: "geist-mono", italic: false }),
    );
    expect(
      screen.queryByRole("button", { name: "Italic" }),
    ).not.toBeInTheDocument();
  });
  it("rejects out-of-range sizes and preserves accessible labels in compact mode", () => {
    const changed = vi.fn();
    render(
      <BoardTypography
        compact
        row={object({ element_type: "TEXT" })}
        onChange={changed}
      />,
    );
    expect(screen.getByLabelText("Font family")).toBeInTheDocument();
    const size = screen.getByLabelText("Font size");
    fireEvent.change(size, { target: { value: "9999" } });
    fireEvent.blur(size);
    expect(screen.getByRole("alert")).toHaveTextContent("8 to 256");
    expect(changed).not.toHaveBeenCalled();
  });
});
