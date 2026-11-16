import { afterEach, describe, it, expect, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: navigation.replace,
  }),
}));
vi.mock("@/modules/marketing/growth-actions", () => ({
  mutateGrowthAction: vi.fn(),
  findGrowthChoicesAction: vi.fn(),
}));
import { GrowthWorkspace } from "./growth-workspace";
import type { GrowthList } from "@/modules/marketing/server/growth-data";
afterEach(cleanup);
const list: GrowthList = {
  rows: [],
  counts: [],
  query: "setup",
  status: "RUNNING",
  archived: true,
  hasMore: false,
  after: crypto.randomUUID(),
};
describe("growth workspace navigation and read-only behavior", () => {
  it("closes direct creation, clears its query and restores a usable opener", async () => {
    render(
      <GrowthWorkspace
        kind="hypothesis"
        list={{
          ...list,
          query: "",
          status: "",
          archived: false,
          after: undefined,
        }}
        detail={null}
        role="MEMBER"
        members={[]}
        initialCreate
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(navigation.replace).toHaveBeenCalledWith(
      "/apps/marketing/hypotheses",
      { scroll: false },
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "New hypothesis" }),
      ).toHaveFocus(),
    );
  });
  it("clears status/archive and stale cursors while preserving search", () => {
    render(
      <GrowthWorkspace
        kind="experiment"
        list={list}
        detail={null}
        role="VIEWER"
        members={[]}
      />,
    );
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute(
      "href",
      "/apps/marketing/experiments?query=setup&archived=true",
    );
    expect(
      screen.getByRole("link", { name: "Active records" }),
    ).toHaveAttribute(
      "href",
      "/apps/marketing/experiments?query=setup&status=RUNNING",
    );
    expect(
      screen.queryByRole("button", { name: /New experiment/ }),
    ).not.toBeInTheDocument();
  });
  it("keeps a VIEWER-safe empty state and no mutation affordance", () => {
    render(
      <GrowthWorkspace
        kind="hypothesis"
        list={{ ...list, archived: false, status: "", query: "" }}
        detail={null}
        role="VIEWER"
        members={[]}
      />,
    );
    expect(screen.getByText(/Your role is read-only/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /New hypothesis/ }),
    ).not.toBeInTheDocument();
  });
});
