import { act, waitFor, render, screen, cleanup } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import type { FormHTMLAttributes } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("next/form", () => ({
  default: (props: FormHTMLAttributes<HTMLFormElement>) => <form {...props} />,
}));
vi.mock("@/components/integrations/connected-resources", () => ({
  ConnectedResources: () => null,
}));
import { NotesWorkspace } from "./notes-workspace";
const stamp = "2026-11-10T23:45:00Z",
  note = {
    id: crypto.randomUUID(),
    organization_id: crypto.randomUUID(),
    title: "Timezone-safe working Note",
    content: "Human working material.",
    created_by: crypto.randomUUID(),
    updated_by: crypto.randomUUID(),
    created_at: stamp,
    updated_at: stamp,
    archived_at: null,
  };
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("Note dates across server/browser locales", () => {
  it("keeps search and cursor state in Note open and Back links", () => {
    const before = JSON.stringify({ updatedAt: stamp, id: note.id }),
      page = {
        rows: [note],
        query: "pilot",
        archived: false,
        more: false,
        cursor: undefined,
        before,
      };
    const view = render(
      <NotesWorkspace page={page} selected={null} canEdit={false} />,
    );
    const link = screen.getByRole("link", {
        name: /Timezone-safe working Note/,
      }),
      url = new URL(link.getAttribute("href")!, "https://example.test");
    expect(url.searchParams.get("before")).toBe(before);
    expect(url.searchParams.get("query")).toBe("pilot");
    expect(url.searchParams.get("note")).toBe(note.id);
    view.rerender(
      <NotesWorkspace
        page={page}
        selected={{ note, tasks: [], milestones: [], memory: null }}
        selectedId={note.id}
        canEdit={false}
      />,
    );
    const back = new URL(
      screen.getByRole("link", { name: "Back to Notes" }).getAttribute("href")!,
      "https://example.test",
    );
    expect(back.searchParams.get("before")).toBe(before);
    expect(back.searchParams.get("note")).toBeNull();
  });
  it("hydrates without text replacement when local date/time formatting differs", async () => {
    const locale = vi
        .spyOn(Date.prototype, "toLocaleString")
        .mockReturnValue("Server timezone"),
      date = vi
        .spyOn(Date.prototype, "toLocaleDateString")
        .mockReturnValue("Server day");
    const ui = (
      <NotesWorkspace
        page={{
          rows: [note],
          query: "",
          archived: false,
          more: false,
          cursor: undefined,
        }}
        selected={{ note, tasks: [], milestones: [], memory: null }}
        selectedId={note.id}
        canEdit={false}
      />
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(ui);
    document.body.append(container);
    locale.mockReturnValue("Browser timezone");
    date.mockReturnValue("Browser day");
    const error = vi.fn();
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, ui, { onRecoverableError: error });
    });
    await waitFor(() =>
      expect(container.querySelectorAll("time")).toHaveLength(2),
    );
    expect(error).not.toHaveBeenCalled();
    expect(container.querySelector("time")).toHaveAttribute("datetime", stamp);
    await act(async () => root!.unmount());
    container.remove();
  });
});
