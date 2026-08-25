import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomePlaceholder } from "./home-placeholder";

describe("HomePlaceholder", () => {
  it("renders a clear foundation-only home view", () => {
    render(<HomePlaceholder />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Home" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Welcome to Stylus" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Customize home" }),
    ).toBeDisabled();
  });
});
