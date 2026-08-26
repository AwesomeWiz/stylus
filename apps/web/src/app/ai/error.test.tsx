import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AIErrorPage from "./error";

describe("AI error page", () => {
  it("shows safe generic recovery guidance", () => {
    const reset = vi.fn();
    render(<AIErrorPage reset={reset} />);

    expect(
      screen.getByText("AI settings could not be loaded"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/database connection/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Supabase/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
