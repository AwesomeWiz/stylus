import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BoardPresentation } from "./board-presentation";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Section presentation controls", () => {
  it("announces the exact Section and bounds previous/next without editing", () => {
    const move = vi.fn(),
      exit = vi.fn();
    const { rerender } = render(
      <BoardPresentation
        title="Evidence"
        index={0}
        count={2}
        notice={null}
        onMove={move}
        onExit={exit}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Previous Section" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next Section" }));
    expect(move).toHaveBeenCalledWith(1);
    rerender(
      <BoardPresentation
        title="Decision"
        index={1}
        count={2}
        notice="Section removed"
        onMove={move}
        onExit={exit}
      />,
    );
    expect(screen.getByLabelText("Presentation progress")).toHaveTextContent(
      "2 / 2",
    );
    expect(screen.getByRole("button", { name: "Next Section" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous Section" }));
    expect(move).toHaveBeenLastCalledWith(-1);
    fireEvent.click(screen.getByRole("button", { name: "Exit presentation" }));
    expect(exit).toHaveBeenCalledOnce();
  });

  it("keeps presentation usable if fullscreen is unavailable", async () => {
    const exit = vi.fn();
    render(
      <BoardPresentation
        title="Evidence"
        index={0}
        count={1}
        notice={null}
        onMove={vi.fn()}
        onExit={exit}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Fullscreen presentation" }),
    );
    expect(await screen.findByText(/Fullscreen is unavailable/)).toBeVisible();
    expect(exit).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Evidence" })).toBeVisible();
  });

  it("exits when browser fullscreen ends, including after a control rerender", async () => {
    const exit = vi.fn(),
      root = document.createElement("div");
    root.dataset.boardShell = "";
    document.body.append(root);
    const request = vi.fn(async () => {});
    root.requestFullscreen = request;
    const { rerender } = render(
      <BoardPresentation
        title="Evidence"
        index={0}
        count={2}
        notice={null}
        onMove={vi.fn()}
        onExit={exit}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Fullscreen presentation" }),
    );
    await waitFor(() => expect(request).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Fullscreen presentation" }),
      ).not.toBeInTheDocument(),
    );
    rerender(
      <BoardPresentation
        title="Decision"
        index={1}
        count={2}
        notice={null}
        onMove={vi.fn()}
        onExit={exit}
      />,
    );
    fireEvent(document, new Event("fullscreenchange"));
    expect(exit).toHaveBeenCalledOnce();
    root.remove();
  });
});
