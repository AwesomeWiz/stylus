import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { object } from "@/test/board-fixtures";
import { BoardSearch } from "./board-search";
afterEach(cleanup);
describe("Board-local text search", () => {
  it.each(["TEXT", "STICKY", "SECTION", "GROUP", "LINK"] as const)(
    "finds %s content/name and locates its exact identity",
    async (kind) => {
      const row = object({
          element_type: kind,
          content: ["SECTION", "GROUP", "LINK"].includes(kind)
            ? { title: "Launch review" }
            : { text: "Launch review" },
        }),
        locate = vi.fn();
      render(
        <BoardSearch rows={[row]} onLocate={locate}>
          <p>Full Layers</p>
        </BoardSearch>,
      );
      fireEvent.change(
        screen.getByRole("textbox", { name: "Search this board" }),
        { target: { value: "launch" } },
      );
      const result = await screen.findByRole("button", {
        name: "Launch review",
      });
      fireEvent.click(result);
      expect(locate).toHaveBeenCalledWith(row.id);
      fireEvent.click(
        screen.getByRole("button", { name: "Clear Board search" }),
      );
      await waitFor(() =>
        expect(screen.getByText("Full Layers")).toBeInTheDocument(),
      );
    },
  );
});
