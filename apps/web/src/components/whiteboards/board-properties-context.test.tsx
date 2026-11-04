import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { object } from "@/test/board-fixtures";
import type { BoardElementType } from "@/lib/supabase/database.types";
import { BoardInspector } from "./board-inspector";

afterEach(cleanup);
describe("contextual Board properties", () => {
  it.each(["TEXT", "IMAGE", "LINK", "GROUP", "SECTION"] as BoardElementType[])(
    "omits an empty Appearance section for %s",
    (element_type) => {
      const row = object({ element_type });
      render(
        <BoardInspector
          rows={[row]}
          selection={[row]}
          canMutate
          busy={false}
          onUpdate={vi.fn()}
          onAction={vi.fn()}
          onAlign={vi.fn()}
          onMembership={vi.fn()}
          onReplace={vi.fn()}
          onSelect={vi.fn()}
        />,
      );
      expect(
        screen.queryByText("Appearance", { selector: "legend" }),
      ).not.toBeInTheDocument();
      if (element_type === "TEXT")
        expect(
          screen.getByRole("group", { name: "Typography" }),
        ).toBeInTheDocument();
      if (element_type === "IMAGE")
        expect(
          screen.getByRole("combobox", { name: "Image fit" }),
        ).toBeInTheDocument();
    },
  );
  it.each(["STICKY", "SHAPE", "ARROW"] as BoardElementType[])(
    "retains meaningful Appearance controls for %s",
    (element_type) => {
      const row = object({ element_type });
      render(
        <BoardInspector
          rows={[row]}
          selection={[row]}
          canMutate
          busy={false}
          onUpdate={vi.fn()}
          onAction={vi.fn()}
          onAlign={vi.fn()}
          onMembership={vi.fn()}
          onReplace={vi.fn()}
          onSelect={vi.fn()}
        />,
      );
      expect(
        screen.getByText("Appearance", { selector: "legend" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name:
            element_type === "STICKY"
              ? /^Sticky fill:/
              : element_type === "SHAPE"
                ? /^Shape fill:/
                : /^Arrow color:/,
        }),
      ).toBeInTheDocument();
      expect(document.querySelector('input[type="color"],select')).toBeNull();
    },
  );
});
