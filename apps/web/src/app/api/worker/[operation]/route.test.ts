import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceSupabaseClient: mocks.createServiceClient,
}));

import { POST } from "./route";

function brokerRequest(operation: string, body: unknown, credential?: string) {
  return POST(
    new Request(`http://localhost:3000/api/worker/${operation}`, {
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        ...(credential ? { authorization: `Bearer ${credential}` } : {}),
      },
      method: "POST",
    }),
    { params: Promise.resolve({ operation }) },
  );
}

async function expectJson(response: Response, status: number, value: unknown) {
  expect(response.status).toBe(status);
  expect(response.headers.get("content-type")).toContain("application/json");
  await expect(response.json()).resolves.toEqual(value);
}

describe("worker broker route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createServiceClient.mockReturnValue({ rpc: mocks.rpc });
  });

  it("reaches the broker and returns JSON for empty and malformed pairing input", async () => {
    await expectJson(await brokerRequest("pair", {}), 400, {
      error: "pairing_failed",
    });
    await expectJson(await brokerRequest("pair", "{"), 400, {
      error: "invalid_request",
    });
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it("normalizes invalid pairing tokens and returns successful pairing as JSON", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "42501" } });
    await expectJson(
      await brokerRequest("pair", {
        capabilities: ["core.worker.echo"],
        token: "a".repeat(64),
        version: "0.1.0",
      }),
      401,
      { error: "pairing_failed" },
    );

    const paired = {
      authorizedCapabilities: ["core.worker.echo"],
      credential: "c".repeat(64),
      name: "Studio workstation",
      organizationId: "10000000-0000-4000-8000-000000000001",
      workerId: "20000000-0000-4000-8000-000000000001",
    };
    mocks.rpc.mockResolvedValueOnce({ data: paired, error: null });
    await expectJson(
      await brokerRequest("pair", {
        capabilities: ["core.worker.echo"],
        token: "b".repeat(64),
        version: "0.1.0",
      }),
      200,
      paired,
    );
  });

  it("returns JSON for unknown operations and invalid or revoked credentials", async () => {
    await expectJson(await brokerRequest("unknown", {}), 404, {
      error: "not_found",
    });
    await expectJson(
      await brokerRequest("heartbeat", {
        capabilities: ["core.worker.echo"],
        version: "0.1.0",
      }),
      401,
      { error: "unauthorized" },
    );
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "42501" } });
    await expectJson(
      await brokerRequest(
        "heartbeat",
        { capabilities: ["core.worker.echo"], version: "0.1.0" },
        "d".repeat(64),
      ),
      401,
      { error: "unauthorized" },
    );
  });

  it("normalizes thrown broker failures without returning internals", async () => {
    mocks.createServiceClient.mockImplementation(() => {
      throw new Error("secret service configuration");
    });
    await expectJson(
      await brokerRequest("pair", {
        capabilities: ["core.worker.echo"],
        token: "e".repeat(64),
        version: "0.1.0",
      }),
      500,
      { error: "broker_failure" },
    );
  });
});
