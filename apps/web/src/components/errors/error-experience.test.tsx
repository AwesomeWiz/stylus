import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ErrorExperience } from "./error-experience";
import GlobalError from "@/app/global-error";
import RootError from "@/app/error";

afterEach(cleanup);

describe("public error recovery", () => {
  it("offers a named home link and semantic public 404 without an inert retry", () => {
    render(<ErrorExperience kind="missing" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "This page isn’t on the board.",
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "error-main");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
    expect(
      screen.getByRole("link", { name: "Skip to content" }),
    ).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();
  });

  it("calls the real boundary reset and never renders an exception body", () => {
    const reset = vi.fn();
    render(
      <RootError {...{ reset, error: new Error("private-provider-token") }} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
    expect(document.title).toBe("Unexpected error — Stylus");
    expect(screen.getByRole("heading")).toHaveTextContent(
      "Something slipped out of place.",
    );
    expect(
      screen.queryByText(/private-provider-token/),
    ).not.toBeInTheDocument();
  });

  it("keeps the global boundary independent of server environment and tenant code", () => {
    const html = renderToStaticMarkup(<GlobalError reset={vi.fn()} />);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("Something slipped out of place.");
  });
});
