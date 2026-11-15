import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  user: vi.fn(),
  context: vi.fn(),
  detail: vi.fn(),
  comments: vi.fn(),
  execution: vi.fn(),
  provenance: vi.fn(),
}));
vi.mock("@/modules/auth/server/session", () => ({
  getAuthenticatedUser: m.user,
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: m.context,
}));
vi.mock("@/modules/tasks/read-actions", () => ({
  loadTaskDetail: m.detail,
  loadTaskComments: m.comments,
}));
vi.mock("@/modules/execution/actions", () => ({
  readTaskExecutionAction: m.execution,
}));
vi.mock("@/core/entities/actions", () => ({
  loadEntityProvenance: m.provenance,
}));
import { GET } from "./route";
const taskId = "10000000-0000-4000-8000-000000000001",
  org = "20000000-0000-4000-8000-000000000001";
function request(query = `kind=detail&organizationId=${org}`) {
  return GET(
    new Request(`http://localhost/api/tasks/${taskId}/read?${query}`),
    { params: Promise.resolve({ taskId }) },
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  m.user.mockResolvedValue({ id: "actor" });
  m.context.mockResolvedValue({
    organization: { id: org },
    membership: { role: "VIEWER" },
  });
  m.detail.mockResolvedValue({
    status: "success",
    task: { id: taskId, title: "Fictional work" },
    canMutate: false,
  });
});
describe("independent task reads", () => {
  it("reauthorizes a VIEWER read and forbids shared caching", async () => {
    const result = await request();
    expect(result.headers.get("Cache-Control")).toBe("private, no-store");
    expect(result.headers.get("Vary")).toBe("Cookie");
    expect((await result.json()).canMutate).toBe(false);
    expect(m.detail).toHaveBeenCalledWith({ taskId, organizationId: org });
    expect(m.context).toHaveBeenCalledOnce();
  });
  it("denies unauthenticated and switched/revoked organization requests before reads", async () => {
    m.user.mockResolvedValue(null);
    expect((await request()).status).toBe(401);
    m.user.mockResolvedValue({ id: "actor" });
    m.context.mockResolvedValue({ organization: { id: "foreign" } });
    expect((await request()).status).toBe(403);
    m.context.mockResolvedValue(null);
    expect((await request()).status).toBe(403);
    expect(m.detail).not.toHaveBeenCalled();
  });
  it("rejects duplicate, malformed, extra and incomplete cursor parameters", async () => {
    for (const query of [
      `kind=detail&kind=comments&organizationId=${org}`,
      `kind=unknown&organizationId=${org}`,
      `kind=detail&organizationId=${org}&extra=true`,
      `kind=comments&organizationId=${org}&beforeId=${taskId}`,
    ])
      expect((await request(query)).status).toBe(400);
    expect(m.user).not.toHaveBeenCalled();
  });
  it("retains bounded comment cursor validation and existing entity authorization", async () => {
    m.comments.mockResolvedValue({ status: "unavailable" });
    const createdAt = "2026-11-01T00:00:00.000Z";
    const response = await request(
      `kind=comments&organizationId=${org}&beforeId=${taskId}&beforeCreatedAt=${createdAt}`,
    );
    expect(await response.json()).toEqual({ status: "unavailable" });
    expect(m.comments).toHaveBeenCalledWith({
      taskId,
      organizationId: org,
      before: { id: taskId, createdAt },
    });
  });
  it("uses the public provenance host and Core execution helper without a plugin import", async () => {
    m.provenance.mockResolvedValue({ status: "success", links: [] });
    m.execution.mockResolvedValue({ status: "success", data: {} });
    await request(`kind=execution&organizationId=${org}`);
    await request(`kind=provenance&organizationId=${org}`);
    expect(m.execution).toHaveBeenCalledWith({ taskId });
    expect(m.provenance).toHaveBeenCalledWith({
      entityType: "core.task",
      entityId: taskId,
    });
  });
  it("preserves a PostgreSQL offset timestamp and microseconds in comment pagination", async () => {
    const createdAt = "2026-11-01T12:00:00.123456+00:00";
    m.comments.mockResolvedValue({
      status: "success",
      comments: [],
      before: null,
    });
    const query = new URLSearchParams({
      kind: "comments",
      organizationId: org,
      beforeId: taskId,
      beforeCreatedAt: createdAt,
    });
    const response = await request(query.toString());
    expect(response.status).toBe(200);
    expect(m.comments).toHaveBeenCalledWith({
      taskId,
      organizationId: org,
      before: { id: taskId, createdAt },
    });
  });
  it("sanitizes infrastructure errors without logging or returning their body", async () => {
    m.context.mockRejectedValue(new Error("private-token-and-storage-path"));
    const response = await request();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "error" });
  });
});
