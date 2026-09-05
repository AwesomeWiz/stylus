import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/organizations/settings-actions", () => ({
  deleteOrganizationAction: vi.fn(),
}));

import { DeleteOrganizationPanel } from "./delete-organization-panel";

afterEach(cleanup);

describe("DeleteOrganizationPanel", () => {
  it("requires a second deliberate dialog step with exact-name input", () => {
    render(<DeleteOrganizationPanel organizationName="Disposable Alpha" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Delete organization" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Delete Disposable Alpha?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Type Disposable Alpha to confirm/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete permanently" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });
});
