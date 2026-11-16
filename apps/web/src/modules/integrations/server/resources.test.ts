import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  target: vi.fn(),
  live: vi.fn(),
  connection: vi.fn(),
  calendars: vi.fn(),
  create: vi.fn(),
  link: vi.fn(),
  attention: vi.fn(),
  intents: new Map<string, Record<string, unknown>>(),
}));
vi.mock("./context", () => ({
  integrationContext: mocks.context,
  authorizeTarget: mocks.target,
  readConnection: mocks.connection,
  readConnections: vi.fn(),
  requireEditor: vi.fn(),
}));
vi.mock("./connections", () => ({
  liveToken: mocks.live,
  markConnectionAttention: mocks.attention,
  connectionToken: vi.fn(),
}));
vi.mock("./google", () => ({
  googleCalendars: mocks.calendars,
  createGoogleEvent: mocks.create,
}));
vi.mock("./providers", () => ({ resourceAdapters: {} }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceSupabaseClient: () => ({ from: () => intentQuery() }),
}));
import { addCalendarEvent, calendarRecovery } from "./resources";
import { IntegrationError } from "./errors";
let account: string;
function intentQuery() {
  const filters: [string, unknown][] = [];
  let operation = "read",
    patch: Record<string, unknown> = {};
  const matches = (row: Record<string, unknown>) =>
    filters.every(([k, v]) => row[k] === v);
  const run = () => {
    const row = [...mocks.intents.values()].find(matches);
    if (operation === "delete" && row) mocks.intents.delete(row.id as string);
    if (operation === "update" && row) Object.assign(row, patch);
    return { data: row ?? null, error: null };
  };
  const chain = {
    select: () => chain,
    eq: (k: string, v: unknown) => {
      filters.push([k, v]);
      return chain;
    },
    maybeSingle: async () => run(),
    delete: () => {
      operation = "delete";
      return chain;
    },
    update: (p: Record<string, unknown>) => {
      operation = "update";
      patch = p;
      return chain;
    },
    upsert: async (p: Record<string, unknown>) => {
      if (!mocks.intents.has(p.id as string)) {
        if (
          [...mocks.intents.values()].some(
            (r) =>
              r.state === "pending" &&
              r.entity_id === p.entity_id &&
              r.actor_id === p.actor_id &&
              r.connection_id === p.connection_id,
          )
        )
          return { error: { code: "23505" } };
        mocks.intents.set(p.id as string, { ...p });
      }
      return { error: null };
    },
    then: (resolve: (r: unknown) => void) =>
      Promise.resolve(run()).then(resolve),
  };
  return chain;
}
const target = { entityType: "core.task" as const, entityId: "task-a" },
  input = {
    title: "Fictional checkpoint",
    date: "2026-11-30",
    time: "",
    timeZone: "UTC",
    calendarId: "owner@example.test",
  };
const resource = {
  locator: {
    provider: "google-calendar",
    kind: "event",
    id: "s0001",
    calendarId: input.calendarId,
  },
  title: input.title,
  url: "https://calendar.google.com/event?eid=fictional",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.intents.clear();
  account = "google-a";
  mocks.context.mockResolvedValue({
    org: "org-a",
    actor: "actor-a",
    db: { rpc: mocks.link },
  });
  mocks.target.mockResolvedValue({
    title: input.title,
    date: input.date,
    href: "/tasks?task=fictional",
  });
  mocks.connection.mockImplementation(async () => ({
    id: "connection-a",
    provider: "google-calendar",
    account_id: account,
  }));
  mocks.live.mockImplementation(async () => ({
    connection: await mocks.connection(),
    token: "fictional-access",
  }));
  mocks.calendars.mockResolvedValue([{ id: input.calendarId, writable: true }]);
  mocks.create.mockResolvedValue(resource);
  mocks.link.mockResolvedValue({ data: "link", error: null });
});
describe("explicit Calendar write receipts", () => {
  it("keeps a receipt after linking fails and recovers that exact event after reopening", async () => {
    mocks.link.mockResolvedValueOnce({ error: { code: "network" } });
    await expect(
      addCalendarEvent(target, "connection-a", "intent-a", input),
    ).rejects.toMatchObject({ category: "unavailable" });
    expect(await calendarRecovery(target, "connection-a")).toMatchObject({
      id: "intent-a",
      input,
    });
    await addCalendarEvent(target, "connection-a", "intent-a", input);
    expect(mocks.create.mock.calls[0]![2]).toBe("intent-a");
    expect(mocks.create.mock.calls[1]![2]).toBe("intent-a");
    expect(mocks.intents.get("intent-a")?.state).toBe("linked");
  });
  it("rejects a changed retry payload before any additional provider write", async () => {
    mocks.link.mockResolvedValue({ error: { code: "network" } });
    await expect(
      addCalendarEvent(target, "connection-a", "intent-a", input),
    ).rejects.toThrow();
    mocks.create.mockClear();
    await expect(
      addCalendarEvent(target, "connection-a", "intent-a", {
        ...input,
        date: "2026-12-30",
      }),
    ).rejects.toMatchObject({ category: "conflict" });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("prevents a second pending identity for the same work", async () => {
    mocks.create.mockRejectedValueOnce(new IntegrationError("unavailable"));
    await expect(
      addCalendarEvent(target, "connection-a", "intent-a", input),
    ).rejects.toThrow();
    await expect(
      addCalendarEvent(target, "connection-a", "intent-b", input),
    ).rejects.toMatchObject({ category: "conflict" });
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
  it("cannot recover an event into a different Google identity", async () => {
    mocks.link.mockResolvedValueOnce({ error: { code: "network" } });
    await expect(
      addCalendarEvent(target, "connection-a", "intent-a", input),
    ).rejects.toThrow();
    account = "google-b";
    mocks.create.mockClear();
    await expect(
      calendarRecovery(target, "connection-a"),
    ).rejects.toMatchObject({ category: "conflict" });
    await expect(
      addCalendarEvent(target, "connection-a", "intent-a", input),
    ).rejects.toMatchObject({ category: "conflict" });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("requires dated eligible work and an owned calendar", async () => {
    mocks.target.mockResolvedValue({
      title: "No due date",
      date: null,
      href: "/tasks",
    });
    await expect(
      addCalendarEvent(target, "connection-a", "intent-a", input),
    ).rejects.toMatchObject({ category: "denied" });
    expect(mocks.live).not.toHaveBeenCalled();
    mocks.target.mockResolvedValue({
      title: input.title,
      date: input.date,
      href: "/tasks",
    });
    mocks.calendars.mockResolvedValue([
      { id: input.calendarId, writable: false },
    ]);
    await expect(
      addCalendarEvent(target, "connection-a", "intent-a", input),
    ).rejects.toMatchObject({ category: "denied" });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("clears only a definitively rejected creation so input can be corrected", async () => {
    mocks.create.mockRejectedValue(new IntegrationError("invalid"));
    await expect(
      addCalendarEvent(target, "connection-a", "intent-a", input),
    ).rejects.toMatchObject({ category: "invalid" });
    expect(mocks.intents.size).toBe(0);
  });
  it("reading recovery after a Stylus date change does not synchronize the provider", async () => {
    await calendarRecovery(target, "connection-a");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.link).not.toHaveBeenCalled();
  });
});
