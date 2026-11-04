import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onNavigate,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    onNavigate?: () => void;
  }) => (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) onNavigate?.();
      }}
    >
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));
import { coreNavigationGroups } from "@/components/layout/navigation";
import { board, object } from "@/test/board-fixtures";
import { BoardNavigation } from "./board-navigation";
import { BoardOutline } from "./board-outline";
import { BoardCanvasNavigation, BoardLinkDialog } from "./board-controls";
describe("Board accessible surfaces", () => {
  afterEach(cleanup);
  it("opens main navigation without consuming canvas space and restores focus on close", async () => {
    render(
      <>
        <div id="board-canvas" tabIndex={0} />
        <BoardNavigation
          beforeLeave={() => true}
          state={{
            identity: { displayName: "Member", email: "member@example.test" },
            organization: {
              id: board.organization_id,
              name: "Organization",
              role: "MEMBER",
            },
            navigationGroups: coreNavigationGroups,
            logoutAction: async () => {},
          }}
        />
      </>,
    );
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Open main navigation" }),
    );
    expect(
      screen.getByRole("navigation", { name: "Primary navigation" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Boards" })).toHaveAttribute(
      "href",
      "/whiteboards",
    );
    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    await waitFor(() =>
      expect(document.activeElement?.id).toBe("board-canvas"),
    );
  });
  it("honors unsaved-work cancellation before a normal navigation click", () => {
    const before = vi.fn(() => false);
    render(
      <BoardNavigation
        beforeLeave={before}
        state={{
          identity: { displayName: "Member", email: "member@example.test" },
          organization: {
            id: board.organization_id,
            name: "Organization",
            role: "MEMBER",
          },
          navigationGroups: coreNavigationGroups,
          logoutAction: async () => {},
        }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Open main navigation" }),
    );
    expect(fireEvent.click(screen.getByRole("link", { name: "Tasks" }))).toBe(
      false,
    );
    expect(before).toHaveBeenCalledOnce();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
  it("keeps collapsed children reachable, named and selectable in logical ownership order", () => {
    const section = object({
        element_type: "SECTION",
        content: { title: "References", collapsed: true },
      }),
      image = object({
        element_type: "IMAGE",
        content: { alt: "Warm palette" },
        parent_id: section.id,
        locked: true,
      }),
      select = vi.fn(),
      locate = vi.fn();
    render(
      <BoardOutline
        rows={[section, image]}
        selected={[]}
        onSelect={select}
        onLocate={locate}
      />,
    );
    const child = screen.getByRole("treeitem", {
      name: /image.*Warm palette.*locked/i,
    });
    fireEvent.click(child, { shiftKey: true });
    expect(select).toHaveBeenCalledWith(image.id, true);
    fireEvent.click(
      screen.getByRole("button", { name: "Locate Warm palette" }),
    );
    expect(locate).toHaveBeenCalledWith(image.id);
    expect(child.closest("ul")?.parentElement?.textContent).toContain(
      "References",
    );
  });
  it("exposes named zoom/fit controls with a numeric level and read-only-safe navigation", () => {
    const fit = vi.fn(),
      zoom = vi.fn();
    render(
      <BoardCanvasNavigation
        zoom={0.75}
        hasSelection={false}
        onZoomOut={zoom}
        onZoomIn={zoom}
        onFit={fit}
        onFitSelection={fit}
      />,
    );
    expect(screen.getByLabelText("Zoom level")).toHaveTextContent("75%");
    expect(
      screen.getByRole("button", { name: "Fit selection" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.click(screen.getByRole("button", { name: "Fit board" }));
    expect(zoom).toHaveBeenCalledOnce();
    expect(fit).toHaveBeenCalledOnce();
  });
  it("rejects unsafe manual link URLs inside the modal without sending or fetching", async () => {
    const create = vi.fn();
    render(
      <BoardLinkDialog open onClose={vi.fn()} busy={false} onCreate={create} />,
    );
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Source" },
    });
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "javascript:alert(1)" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Add link" }).closest("form")!,
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/http or https/),
    );
    expect(create).not.toHaveBeenCalled();
  });
});
