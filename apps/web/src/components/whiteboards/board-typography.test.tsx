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

const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");
afterEach(() => {
  cleanup();
  if (originalFonts) Object.defineProperty(document, "fonts", originalFonts);
  else Reflect.deleteProperty(document, "fonts");
});
describe("Board typography controls", () => {
  it.each([
    ["Font size", "fontSize", 48, 53],
    ["Line height", "lineHeight", 1.75, 1.63],
    ["Letter spacing", "letterSpacing", 0.5, 0.75],
  ] as const)(
    "offers %s presets plus custom values and confirmed Escape restore",
    async (label, key, preset, custom) => {
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
      fireEvent.click(screen.getByRole("button", { name: label + " presets" }));
      fireEvent.click(
        await screen.findByRole("option", { name: String(preset) }),
      );
      await waitFor(() =>
        expect(changed).toHaveBeenLastCalledWith(
          expect.objectContaining({ [key]: preset }),
        ),
      );
      const field = screen.getByRole("combobox", { name: label });
      field.focus();
      fireEvent.change(field, { target: { value: String(custom) } });
      fireEvent.blur(field);
      await waitFor(() =>
        expect(changed).toHaveBeenLastCalledWith(
          expect.objectContaining({ [key]: custom }),
        ),
      );
      field.focus();
      fireEvent.change(field, { target: { value: "123" } });
      fireEvent.keyDown(field, { key: "Escape" });
      expect(field).toHaveValue(String(custom));
      expect(changed).toHaveBeenCalledTimes(2);
    },
  );
  it("searches categorized families without loading previews and constrains weights on family changes", async () => {
    const load = vi.fn();
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: {
        check: vi.fn(() => false),
        load,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
    const changed = vi.fn();
    render(
      <BoardTypography
        row={object({ element_type: "TEXT", style: { weight: 600 } })}
        onChange={changed}
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Font family" }));
    expect(await screen.findAllByRole("option")).toHaveLength(15);
    expect(screen.getByRole("group", { name: "Serif" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Search fonts" }), {
      target: { value: "bebas" },
    });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    fireEvent.click(screen.getByRole("option", { name: "Bebas Neue" }));
    expect(changed).toHaveBeenCalledWith(
      expect.objectContaining({
        family: "bebas-neue",
        weight: 400,
        italic: false,
      }),
    );
    expect(load).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
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
    fireEvent.click(screen.getByRole("combobox", { name: "Font family" }));
    fireEvent.click(await screen.findByRole("option", { name: "Lora" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Font weight" }));
    fireEvent.click(await screen.findByRole("option", { name: "Semibold" }));
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
    fireEvent.click(
      screen.getByRole("combobox", { name: "Vertical alignment" }),
    );
    fireEvent.click(await screen.findByRole("option", { name: "Bottom" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Text sizing" }));
    fireEvent.click(await screen.findByRole("option", { name: "Auto height" }));
    fireEvent.click(screen.getByRole("button", { name: /^Text color: #/ }));
    const color = await screen.findByLabelText("Text color HEX");
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
    fireEvent.click(screen.getByRole("combobox", { name: "Font family" }));
    fireEvent.click(await screen.findByRole("option", { name: "Geist Mono" }));
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
