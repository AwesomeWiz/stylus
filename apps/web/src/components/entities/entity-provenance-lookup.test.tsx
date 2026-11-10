import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor, act } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/core/entities/actions", () => ({
  loadEntityProvenance: mocks.load,
}));
import { EntityProvenanceLookup } from "./entity-provenance-lookup";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
});
describe("ephemeral decision provenance", () => {
  it("discards an older target response after selection changes", async () => {
    let first: (value: unknown) => void = () => {},
      second: (value: unknown) => void = () => {};
    mocks.load
      .mockReturnValueOnce(
        new Promise((resolve) => {
          first = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          second = resolve;
        }),
      );
    const view = render(
      <EntityProvenanceLookup entityType="core.task" entityId="first" />,
    );
    await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(1));
    view.rerender(
      <EntityProvenanceLookup entityType="core.task" entityId="second" />,
    );
    await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2));
    await act(async () =>
      first({
        status: "success",
        links: [
          {
            title: "Old private title",
            label: "Experiment",
            href: "/apps/marketing/experiments",
          },
        ],
      }),
    );
    expect(screen.queryByText("Old private title")).not.toBeInTheDocument();
    await act(async () =>
      second({
        status: "success",
        links: [
          {
            title: "Current experiment",
            label: "Experiment",
            href: "/apps/marketing/experiments",
          },
        ],
      }),
    );
    expect(
      await screen.findByRole("link", { name: "Current experiment" }),
    ).toBeInTheDocument();
  });
  it("purges titles before a focus refresh and after access loss", async () => {
    mocks.load
      .mockResolvedValueOnce({
        status: "success",
        links: [
          {
            title: "Before revoke",
            label: "Experiment",
            href: "/apps/marketing/experiments",
          },
        ],
      })
      .mockResolvedValue({ status: "success", links: [] });
    render(<EntityProvenanceLookup entityType="core.task" entityId="one" />);
    await screen.findByText("Before revoke");
    await act(async () => window.dispatchEvent(new Event("focus")));
    await waitFor(() =>
      expect(screen.queryByText("Before revoke")).not.toBeInTheDocument(),
    );
  });
});
