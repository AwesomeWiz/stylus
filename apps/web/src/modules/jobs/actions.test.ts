import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enqueue: vi.fn(),
  getContext: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("./server/enqueue", () => ({ enqueueRegisteredJob: mocks.enqueue }));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.getContext,
}));

import { enqueueExampleJobAction } from "./actions";

describe("job actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enqueue.mockResolvedValue({
      id: "20000000-0000-4000-8000-000000000001",
    });
  });

  it("queues only the fixed harmless Core diagnostic", async () => {
    const form = new FormData();
    form.set("jobType", "example.forged.job");
    const result = await enqueueExampleJobAction({ status: "idle" }, form);
    expect(result.status).toBe("success");
    expect(mocks.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { message: "Stylus job infrastructure check" },
        jobType: "core.test.echo",
      }),
    );
  });

  it("uses a server-derived schedule instead of a browser timestamp", async () => {
    const form = new FormData();
    form.set("schedule", "later");
    form.set("scheduledAt", "2099-01-01T00:00:00Z");
    await enqueueExampleJobAction({ status: "idle" }, form);
    const request = mocks.enqueue.mock.calls[0]?.[0];
    expect(request.scheduledAt).toBeInstanceOf(Date);
    expect(request.scheduledAt.toISOString()).not.toBe(
      "2099-01-01T00:00:00.000Z",
    );
  });

  it("returns a generic safe persistence failure", async () => {
    mocks.enqueue.mockRejectedValue(new Error("secret database detail"));
    await expect(
      enqueueExampleJobAction({ status: "idle" }, new FormData()),
    ).resolves.toEqual({
      message: "The example job could not be queued.",
      status: "error",
    });
  });
});
