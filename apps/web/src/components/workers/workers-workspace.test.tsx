import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/workers/actions", () => ({
  createWorkerPairingAction: vi.fn(),
  revokeWorkerAction: vi.fn(),
}));

import { initialWorkerActionState } from "@/modules/workers/schemas";

import { PairingCodePanel, WorkersWorkspace } from "./workers-workspace";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
  it("uses the shared idle action state", () => {
    expect(initialWorkerActionState).toEqual({ status: "idle" });
  });
  it("does not show a copy control without a newly created code", () => {
    render(<WorkersWorkspace role="OWNER" workers={[]} />);
    expect(
      screen.queryByRole("button", { name: /copy pairing code/i }),
    ).not.toBeInTheDocument();
  });
  it("copies the complete one-time code and shows bounded feedback", async () => {
    vi.useFakeTimers();
    const token = "a".repeat(64);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<PairingCodePanel token={token} />);

    try {
      fireEvent.click(
        screen.getByRole("button", { name: "Copy pairing code" }),
      );
      await act(async () => Promise.resolve());

      expect(writeText).toHaveBeenCalledWith(token);
      expect(
        screen.getByRole("button", { name: "Copied pairing code" }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("pairing-token")).toHaveTextContent(token);

      act(() => vi.advanceTimersByTime(1500));
      expect(
        screen.getByRole("button", { name: "Copy pairing code" }),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
  it("handles clipboard failure without exposing internal details", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("secret")) },
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    render(<PairingCodePanel token={"b".repeat(64)} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy pairing code" }));

    expect(
      await screen.findByRole("button", { name: "Copy failed pairing code" }),
    ).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });
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
