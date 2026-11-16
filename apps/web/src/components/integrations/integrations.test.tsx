import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  refresh: vi.fn(),
  search: vi.fn(),
  attach: vi.fn(),
  unlink: vi.fn(),
  calendars: vi.fn(),
  recovery: vi.fn(),
  create: vi.fn(),
  settings: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  choices: vi.fn(),
  select: vi.fn(),
}));
vi.mock("@/modules/integrations/actions", () => ({
  loadConnectedResources: mocks.load,
  refreshConnectedResources: mocks.refresh,
  searchConnectedResources: mocks.search,
  attachConnectedResource: mocks.attach,
  unlinkConnectedResource: mocks.unlink,
  loadCalendarChoices: mocks.calendars,
  loadCalendarRecovery: mocks.recovery,
  createConnectedCalendarEvent: mocks.create,
  loadIntegrationSettings: mocks.settings,
  connectIntegration: mocks.connect,
  disconnectIntegration: mocks.disconnect,
  loadGithubChoices: mocks.choices,
  selectGithubRepositories: mocks.select,
}));
import { ConnectedResources } from "./connected-resources";
import { ResourcePicker } from "./resource-picker";
import { CalendarEventForm } from "./calendar-event-form";
import { IntegrationsSettings } from "./integrations-settings";
const id = "10000000-0000-4000-8000-000000000001",
  target = { entityType: "core.task" as const, entityId: id };
const github = {
  id,
  provider: "github" as const,
  status: "connected" as const,
  display_name: "Fictional App",
  config: { repositories: [{ id: "12", fullName: "fictional/startup" }] },
};
const file = {
  locator: {
    provider: "google-drive" as const,
    kind: "file" as const,
    id: "file_a",
  },
  title: "Fictional launch plan",
  url: "https://docs.google.com/document/d/file_a/edit",
  detail: "Google Doc",
  checkedAt: new Date().toISOString(),
};
const panel = {
  connections: [github],
  canEdit: true,
  target: { title: "Fictional work", date: "2026-11-30", href: "/tasks" },
  items: [
    {
      id,
      provider: "google-drive" as const,
      status: "available" as const,
      resource: file,
    },
  ],
  cursor: undefined,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.load.mockResolvedValue({ ok: true, data: panel });
  mocks.refresh.mockResolvedValue({ ok: true, data: { items: panel.items } });
  mocks.search.mockResolvedValue({ ok: true, data: { items: [file] } });
  mocks.attach.mockResolvedValue({ ok: true, data: id });
  mocks.unlink.mockResolvedValue({ ok: true });
  mocks.calendars.mockResolvedValue({
    ok: true,
    data: [
      { id: "owned@example.test", title: "Fictional owned", writable: true },
    ],
  });
  mocks.recovery.mockResolvedValue({ ok: true, data: null });
  mocks.create.mockResolvedValue({ ok: true, data: {} });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe("integration context surfaces", () => {
  it("expires visible provider titles without polling, even with a skewed clock", async () => {
    vi.useFakeTimers();
    mocks.load.mockResolvedValue({
      ok: true,
      data: {
        ...panel,
        items: [
          {
            ...panel.items[0],
            resource: {
              ...file,
              checkedAt: new Date(Date.now() + 3600_000).toISOString(),
            },
          },
        ],
      },
    });
    render(<ConnectedResources target={target} />);
    await act(async () => {});
    expect(
      screen.getByRole("link", { name: /Fictional launch plan/ }),
    ).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(60_001));
    expect(
      screen.queryByRole("link", { name: /Fictional launch plan/ }),
    ).toBeNull();
    expect(
      screen.getByText("Refresh this resource to check access."),
    ).toBeInTheDocument();
    expect(mocks.load).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("turns a Server Action network rejection into a retryable local error", async () => {
    mocks.load.mockRejectedValueOnce(Error("internal transport secret"));
    render(<ConnectedResources target={target} />);
    await screen.findByRole("alert");
    expect(screen.queryByText(/internal transport secret/)).toBeNull();
    expect(
      screen.getByRole("button", { name: "Retry connected resources" }),
    ).toBeInTheDocument();
  });
  it("shows an honest empty Calendar state and retries failed calendar loading", async () => {
    mocks.calendars
      .mockResolvedValueOnce({ ok: false, message: "Calendar unavailable" })
      .mockResolvedValue({ ok: true, data: [] });
    render(
      <CalendarEventForm
        target={target}
        connectionId={id}
        title="Checkpoint"
        date="2026-11-30"
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Retry calendars" }));
    await screen.findByText(/No owned calendar is available/);
    expect(screen.queryByText("Loading owned calendars…")).toBeNull();
    expect(screen.getByRole("button", { name: "Create event" })).toBeDisabled();
  });
  it("loads supplemental context independently, with safe external openers", async () => {
    render(
      <>
        <h1>Core task remains usable</h1>
        <ConnectedResources target={target} />
      </>,
    );
    expect(screen.getByText("Core task remains usable")).toBeInTheDocument();
    const link = await screen.findByRole("link", {
      name: /Fictional launch plan/,
    });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText(/requires access in Google/)).toBeInTheDocument();
  });
  it("offers no reference mutations for VIEWER or archived detail", async () => {
    render(<ConnectedResources target={target} editable={false} />);
    await screen.findByText(file.title);
    expect(
      screen.queryByRole("button", {
        name: /Add resource|Unlink|Add to Google Calendar/,
      }),
    ).toBeNull();
  });
  it("renders revoked references generically, without the old title", async () => {
    mocks.load.mockResolvedValue({
      ok: true,
      data: {
        ...panel,
        items: [
          {
            id,
            provider: "google-drive",
            status: "unavailable",
            message: "Connection unavailable.",
          },
        ],
      },
    });
    render(<ConnectedResources target={target} />);
    await screen.findByText("Connection unavailable.");
    expect(screen.queryByText(file.title)).toBeNull();
  });
  it("isolates provider errors with a retry, without hiding Core work", async () => {
    mocks.load.mockResolvedValueOnce({
      ok: false,
      message: "Provider unavailable",
    });
    render(
      <>
        <h1>Task</h1>
        <ConnectedResources target={target} />
      </>,
    );
    await screen.findByRole("alert");
    fireEvent.click(
      screen.getByRole("button", { name: "Retry connected resources" }),
    );
    await screen.findByText(file.title);
    expect(screen.getByRole("heading", { name: "Task" })).toBeInTheDocument();
  });
  it("prevents a late result for A replacing B after detail navigation", async () => {
    let finish!: (v: unknown) => void;
    mocks.load.mockReturnValueOnce(
      new Promise((r) => {
        finish = r;
      }),
    );
    const view = render(<ConnectedResources target={target} />);
    view.rerender(
      <ConnectedResources
        target={{ ...target, entityId: "20000000-0000-4000-8000-000000000002" }}
      />,
    );
    await screen.findByText(file.title);
    await act(async () => finish({ ok: true, data: { ...panel, items: [] } }));
    expect(screen.getByText(file.title)).toBeInTheDocument();
  });
  it("unlinks the reference without invoking provider creation or deletion", async () => {
    render(<ConnectedResources target={target} />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: /Unlink Fictional launch plan/,
      }),
    );
    await waitFor(() =>
      expect(mocks.unlink).toHaveBeenCalledWith({ target, id }),
    );
    await waitFor(() => expect(screen.queryByText(file.title)).toBeNull());
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("debounces picker searches and attaches only on explicit activation", async () => {
    vi.useFakeTimers();
    const attached = vi.fn();
    render(
      <ResourcePicker
        target={target}
        connections={[github]}
        onClose={vi.fn()}
        onAttached={attached}
      />,
    );
    fireEvent.change(screen.getByLabelText("Search resources"), {
      target: { value: "launch" },
    });
    expect(mocks.search).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(400));
    expect(mocks.search).toHaveBeenCalledTimes(1);
    expect(mocks.attach).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: /Attach Fictional launch plan/ }),
    );
    await act(async () => {});
    expect(mocks.attach).toHaveBeenCalledWith({
      target,
      connectionId: id,
      locator: file.locator,
    });
    expect(attached).toHaveBeenCalledTimes(1);
  });
  it("uses shared selection popup and Escape restores the provider trigger", async () => {
    vi.useFakeTimers();
    render(
      <ResourcePicker
        target={target}
        connections={[github]}
        onClose={vi.fn()}
        onAttached={vi.fn()}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: /Resource type/ });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("option", { name: "Repositories" }), {
      key: "Escape",
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it("never creates an event on open and retries with the same persisted identity", async () => {
    mocks.create
      .mockResolvedValueOnce({ ok: false, message: "Link failed" })
      .mockResolvedValue({ ok: true, data: {} });
    const saved = vi.fn();
    render(
      <CalendarEventForm
        target={target}
        connectionId={id}
        title="Fictional checkpoint"
        date="2026-11-30"
        onClose={vi.fn()}
        onCreated={saved}
      />,
    );
    const create = await screen.findByRole("button", { name: "Create event" });
    await waitFor(() => expect(create).toBeEnabled());
    expect(mocks.create).not.toHaveBeenCalled();
    fireEvent.click(create);
    await screen.findByText(/Link failed/);
    fireEvent.click(screen.getByRole("button", { name: "Retry same event" }));
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    expect(mocks.create.mock.calls[0]![0]).toEqual(
      mocks.create.mock.calls[1]![0],
    );
  });
  it("restores unresolved creation after reopening instead of generating a new identity", async () => {
    const event = {
      title: "Earlier event",
      date: "2026-11-29",
      time: "",
      timeZone: "UTC",
      calendarId: "owned@example.test",
    };
    mocks.recovery.mockResolvedValue({ ok: true, data: { id, input: event } });
    render(
      <CalendarEventForm
        target={target}
        connectionId={id}
        title="Changed task date"
        date="2026-12-30"
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    await screen.findByText(/earlier creation is unresolved/);
    expect(screen.getByLabelText("Title")).toHaveValue("Earlier event");
    fireEvent.click(screen.getByRole("button", { name: "Retry same event" }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        target,
        connectionId: id,
        intentId: id,
        event,
      }),
    );
  });
  it("shows optional setup states and retains trusted Apps discoverability", () => {
    render(
      <IntegrationsSettings
        initial={{
          ok: true,
          data: {
            connections: [],
            setup: {
              github: false,
              "google-drive": false,
              "google-calendar": false,
            },
            canManage: true,
          },
        }}
        authorizationFailed={false}
      />,
    );
    expect(screen.getAllByText(/Server setup required/)).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Connect" })).toBeNull();
    expect(
      screen.getByRole("link", { name: /Manage trusted Stylus Apps/ }),
    ).toHaveAttribute("href", "/apps");
  });
  it("requires confirmation to disconnect and does not give members GitHub management", async () => {
    const state = {
      ok: true as const,
      data: {
        connections: [github],
        setup: {
          github: true,
          "google-drive": false,
          "google-calendar": false,
        },
        canManage: true,
      },
    };
    mocks.settings.mockResolvedValue(state);
    const view = render(
      <IntegrationsSettings initial={state} authorizationFailed={false} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Disconnect GitHub" }));
    expect(mocks.disconnect).not.toHaveBeenCalled();
    mocks.disconnect.mockResolvedValue({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: "Confirm disconnect" }));
    await waitFor(() => expect(mocks.disconnect).toHaveBeenCalledWith(id));
    view.unmount();
    render(
      <IntegrationsSettings
        initial={{ ...state, data: { ...state.data, canManage: false } }}
        authorizationFailed={false}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Disconnect GitHub" }),
    ).toBeNull();
    expect(screen.getByText(/owner or admin can manage/)).toBeInTheDocument();
  });
});
