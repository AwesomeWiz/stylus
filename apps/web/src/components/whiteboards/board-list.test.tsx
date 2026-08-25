import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  archive: vi.fn(),
  create: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  rename: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("@/modules/whiteboards/actions", () => ({
  archiveBoardAction: mocks.archive,
  createBoardAction: mocks.create,
  renameBoardAction: mocks.rename,
}));

import type { BoardRow } from "@/lib/supabase/database.types";
import { BoardList } from "./board-list";

const board: BoardRow = {
  archived_at: null,
  created_at: "2026-08-25T00:00:00Z",
  created_by: "user-1",
  id: "20000000-0000-4000-8000-000000000001",
  organization_id: "org-1",
  title: "Brand direction",
  updated_at: "2026-08-25T01:00:00Z",
  updated_by: "user-1",
};

describe("BoardList", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.create.mockResolvedValue({ data: board, status: "success" });
    mocks.rename.mockResolvedValue({
      data: { ...board, title: "Launch ideas" },
      status: "success",
    });
    mocks.archive.mockResolvedValue({ data: undefined, status: "success" });
  });

  it("shows a useful empty state and creates a board", async () => {
    render(<BoardList boards={[]} canMutate currentUserId="user-1" />);
    expect(screen.getByText("Start a visual workspace")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Create your first board" }),
    );
    fireEvent.change(screen.getByLabelText("Board name"), {
      target: { value: "Brand direction" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create board" }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith("Brand direction"),
    );
    expect(mocks.push).toHaveBeenCalledWith(`/whiteboards/${board.id}`);
  });

  it("renames an existing board inline with the list action", async () => {
    render(<BoardList boards={[board]} canMutate currentUserId="user-1" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Rename Brand direction" }),
    );
    fireEvent.change(screen.getByLabelText("Board name"), {
      target: { value: "Launch ideas" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));
    await waitFor(() =>
      expect(mocks.rename).toHaveBeenCalledWith(board.id, "Launch ideas"),
    );
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("keeps viewer controls read-only while allowing the board to be opened", () => {
    render(
      <BoardList boards={[board]} canMutate={false} currentUserId="viewer" />,
    );
    expect(
      screen.getByRole("link", { name: "Open Brand direction" }),
    ).toHaveAttribute("href", `/whiteboards/${board.id}`);
    expect(
      screen.queryByRole("button", { name: /Rename/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Archive/ }),
    ).not.toBeInTheDocument();
  });
});
