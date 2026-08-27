import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/workers/actions", () => ({
  createWorkerPairingAction: vi.fn(),
  initialWorkerActionState: { status: "idle" },
  revokeWorkerAction: vi.fn(),
}));

import { WorkersWorkspace } from "./workers-workspace";

afterEach(cleanup);

const worker = {
  advertised_capabilities: ["core.worker.echo"],
  authorized_capabilities: ["core.worker.echo"],
  created_at: "2026-08-27T10:00:00Z",
  id: "20000000-0000-4000-8000-000000000001",
  last_seen_at: null,
  name: "Studio workstation",
  platform: "windows",
  revoked_at: null,
  version: "0.1.0",
};

describe("WorkersWorkspace", () => {
  it("allows managers to pair and revoke without rendering credentials", () => {
    render(<WorkersWorkspace role="OWNER" workers={[worker]} />);
    expect(
      screen.getByRole("button", { name: "Create pairing code" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoke" })).toBeInTheDocument();
    expect(
      screen.queryByText(/credential_hash|credential/i),
    ).not.toBeInTheDocument();
  });
  it("keeps MEMBER and VIEWER read-only", () => {
    const { rerender } = render(
      <WorkersWorkspace role="MEMBER" workers={[worker]} />,
    );
    expect(
      screen.queryByRole("button", { name: "Create pairing code" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Revoke" }),
    ).not.toBeInTheDocument();
    rerender(<WorkersWorkspace role="VIEWER" workers={[worker]} />);
    expect(screen.getByText("Studio workstation")).toBeInTheDocument();
  });
  it("derives offline state from a stale heartbeat", () => {
    render(<WorkersWorkspace role="ADMIN" workers={[worker]} />);
    expect(screen.getByText(/OFFLINE/)).toBeInTheDocument();
  });
});
