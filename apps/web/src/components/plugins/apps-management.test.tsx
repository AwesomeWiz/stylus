import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/plugins/actions", () => ({
  initialPluginActionState: { status: "idle" },
  setPluginEnabledAction: vi.fn(),
}));

import type { PluginManifest } from "@/core/plugins/public";

import { AppsManagement } from "./apps-management";

afterEach(cleanup);

const manifest: PluginManifest = {
  capabilities: ["example.hello"],
  category: "development",
  description: "A minimal built-in module used to verify plugin architecture.",
  eventSubscriptions: [],
  icon: "blocks",
  id: "example",
  memoryDomains: [],
  name: "Example Plugin",
  navigation: [],
  permissions: ["example.read"],
  tools: [],
  version: "0.1.0",
};

describe("AppsManagement", () => {
  it("shows compact metadata and management controls to owners", () => {
    render(
      <AppsManagement
        currentRole="OWNER"
        plugins={[{ enabled: false, manifest }]}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Example Plugin" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("example.hello", { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enable" })).toBeInTheDocument();
  });

  it.each(["MEMBER", "VIEWER"] as const)(
    "keeps %s access read-only",
    (role) => {
      render(
        <AppsManagement
          currentRole={role}
          plugins={[{ enabled: true, manifest }]}
        />,
      );
      expect(screen.getByText("Enabled")).toBeInTheDocument();
      expect(screen.getByText("Read only")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Disable" }),
      ).not.toBeInTheDocument();
    },
  );
});
