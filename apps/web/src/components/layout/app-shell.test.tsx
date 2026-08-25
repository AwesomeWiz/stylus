import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("exposes global controls and opens accessible mobile navigation", () => {
    render(
      <AppShell
        identity={{ displayName: "Alex Morgan", email: "alex@example.test" }}
        logoutAction={async () => undefined}
        organization={{ name: "Acme", role: "OWNER" }}
      >
        <p>Page content</p>
      </AppShell>,
    );

    expect(
      screen.getByRole("searchbox", { name: "Search" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "View notifications" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    const navigationDialog = screen.getByRole("dialog", {
      name: "Main navigation",
    });
    expect(navigationDialog).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("button", { name: "Close navigation" }),
    ).toBeInTheDocument();
    expect(within(navigationDialog).getByText("Acme")).toBeInTheDocument();
  });
});
