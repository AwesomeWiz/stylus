import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ pending: false }));
vi.mock("next/link", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/link")>()),
  useLinkStatus: () => state,
}));
import { NavigationLink } from "./navigation-link";

describe("navigation feedback", () => {
  it("retains a real URL and announces the framework's pending state", () => {
    const view = render(
      <NavigationLink href="/tasks?view=my">Tasks</NavigationLink>,
    );
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute(
      "href",
      "/tasks?view=my",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    state.pending = true;
    view.rerender(<NavigationLink href="/tasks?view=my">Tasks</NavigationLink>);
    expect(screen.getByRole("status")).toHaveTextContent("Loading destination");
    state.pending = false;
    view.rerender(<NavigationLink href="/tasks?view=my">Tasks</NavigationLink>);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

afterEach(cleanup);
