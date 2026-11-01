import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { OrganizationContext } from "@/modules/organizations/server/context";
import { SettingsNavigation } from "./settings-navigation";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { AppsManagement } from "@/components/plugins/apps-management";
import { builtInPluginRegistry } from "@/plugins";
vi.mock("@/modules/plugins/actions", () => ({
  setPluginEnabledAction: vi.fn(),
}));

describe("relocated route discoverability", () => {
  it("keeps every relocated platform destination available from Settings", () => {
    render(<SettingsNavigation />);
    const nav = screen.getByRole("navigation", {
      name: "Settings destinations",
    });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual([
      "/company/profile",
      "/team",
      "/memory",
      "/ai",
      "/apps",
      "/workers",
      "/jobs",
    ]);
  });
  it("keeps five Marketing sections plus four explicit secondary paths", () => {
    render(
      <MarketingPage
        activePath="/apps/marketing/council"
        context={{} as OrganizationContext}
        description="Marketing"
        title="Ask Council"
      >
        <p>Existing workflow</p>
      </MarketingPage>,
    );
    const nav = screen.getByRole("navigation", { name: "Marketing sections" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Overview", "Ideas", "Studio", "Research", "Campaigns"]);
    expect(within(nav).getByRole("link", { name: "Studio" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const secondary = screen.getByRole("navigation", {
      name: "More Marketing destinations",
    });
    expect(within(secondary).getAllByRole("link")).toHaveLength(4);
    expect(
      within(secondary).getByRole("link", { name: "Ask Council" }),
    ).toHaveAttribute("aria-current", "page");
  });
  it("keeps enabled development routes reachable through Apps for read-only members", () => {
    const manifest = builtInPluginRegistry.get("example")!.manifest;
    const view = render(
      <AppsManagement
        currentRole="VIEWER"
        plugins={[{ manifest, enabled: true }]}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Open Example Plugin" }),
    ).toHaveAttribute("href", "/apps/example");
    expect(
      screen.queryByRole("button", { name: "Disable" }),
    ).not.toBeInTheDocument();
    view.rerender(
      <AppsManagement
        currentRole="VIEWER"
        plugins={[{ manifest, enabled: false }]}
      />,
    );
    expect(
      screen.queryByRole("link", { name: "Open Example Plugin" }),
    ).not.toBeInTheDocument();
  });
});

afterEach(cleanup);
