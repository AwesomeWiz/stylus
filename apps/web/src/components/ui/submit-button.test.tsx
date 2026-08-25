import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useFormStatus: vi.fn() }));

vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormStatus: mocks.useFormStatus,
}));

import { SubmitButton } from "./submit-button";

describe("submit button", () => {
  beforeEach(() => {
    mocks.useFormStatus.mockReturnValue({
      action: null,
      data: null,
      method: null,
      pending: false,
    });
  });

  it("disables repeat submission while a form action is pending", () => {
    mocks.useFormStatus.mockReturnValue({
      action: null,
      data: new FormData(),
      method: "post",
      pending: true,
    });

    render(
      <SubmitButton pendingLabel="Saving…">Save and continue</SubmitButton>,
    );

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
