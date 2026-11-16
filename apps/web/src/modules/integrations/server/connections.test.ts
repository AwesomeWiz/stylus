// @vitest-environment node
import { randomBytes } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { ConnectionRow } from "@/core/integrations/public";
const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  service: vi.fn(),
  provider: vi.fn(),
  configured: vi.fn(),
  installation: vi.fn(),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceSupabaseClient: mocks.service,
}));
vi.mock("./context", () => ({
  integrationContext: mocks.context,
  requireManager: vi.fn(),
  readConnection: vi.fn(),
}));
vi.mock("./http", () => ({ providerRequest: mocks.provider }));
vi.mock("./github", () => ({ githubInstallationToken: mocks.installation }));
vi.mock("./config", () => ({
  configured: mocks.configured,
  requireConfigured: () => ({
    STYLUS_GOOGLE_CLIENT_ID: "client",
    STYLUS_GOOGLE_CLIENT_SECRET: "private",
  }),
  integrationEnvironment: () => ({
    STYLUS_INTEGRATION_KEY_ID: process.env.STYLUS_INTEGRATION_KEY_ID,
    STYLUS_INTEGRATION_KEYS: process.env.STYLUS_INTEGRATION_KEYS,
  }),
}));
import {
  connectionToken,
  markConnectionAttention,
  settingsConnections,
} from "./connections";
import { credentialIdentity } from "./oauth";
import { sealCredential, openCredential } from "./credentials";
import { IntegrationError } from "./errors";
const connection = {
  id: "connection-a",
  organization_id: "org-a",
  provider: "google-drive",
  generation: 4,
} as ConnectionRow;
let sealed: string,
  rpc: ReturnType<typeof vi.fn>,
  updates: ReturnType<typeof vi.fn<(value: unknown) => void>>;
beforeEach(() => {
  vi.stubEnv("STYLUS_INTEGRATION_KEY_ID", "k1");
  vi.stubEnv(
    "STYLUS_INTEGRATION_KEYS",
    JSON.stringify({ k1: randomBytes(32).toString("base64") }),
  );
  mocks.configured.mockReturnValue(true);
  mocks.provider.mockReset();
  mocks.service.mockReset();
  updates = vi.fn();
  rpc = vi.fn().mockResolvedValue({ data: true, error: null });
  const chain = {
    select: () => chain,
    eq: () => chain,
    delete: () => chain,
    update: (v: unknown) => {
      updates(v);
      return chain;
    },
    maybeSingle: async () => ({ data: { sealed }, error: null }),
    then: (resolve: (r: unknown) => void) =>
      Promise.resolve({ error: null }).then(resolve),
  };
  mocks.service.mockReturnValue({ from: () => chain, rpc });
});
afterEach(() => vi.unstubAllEnvs());
function credential(expiry: number) {
  sealed = sealCredential(
    {
      access_token: "fictional-access",
      refresh_token: "fictional-refresh",
      expires_at: expiry,
      scope: "metadata",
    },
    credentialIdentity("org-a", "connection-a", "google-drive"),
  );
}
describe("credential lifetime and safe optional configuration", () => {
  it("uses valid tokens without refresh", async () => {
    credential(Date.now() + 300000);
    expect(await connectionToken(connection)).toBe("fictional-access");
    expect(mocks.provider).not.toHaveBeenCalled();
  });
  it("refreshes expired credentials, encrypts the result and checks connection generation", async () => {
    credential(1);
    mocks.provider.mockResolvedValue({
      access_token: "fictional-next",
      expires_in: 3600,
    });
    expect(await connectionToken(connection)).toBe("fictional-next");
    const call = rpc.mock.calls[0]!;
    expect(call[0]).toBe("store_integration_secret");
    expect(call[1].p_generation).toBe(4);
    expect(call[1].p_sealed).not.toContain("fictional");
    expect(
      openCredential(
        call[1].p_sealed,
        credentialIdentity("org-a", "connection-a", "google-drive"),
      ),
    ).toMatchObject({
      access_token: "fictional-next",
      refresh_token: "fictional-refresh",
    });
  });
  it("rejects a late refresh after disconnect rather than reactivating credentials", async () => {
    credential(1);
    mocks.provider.mockResolvedValue({
      access_token: "fictional-next",
      expires_in: 3600,
    });
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(connectionToken(connection)).rejects.toMatchObject({
      category: "conflict",
    });
  });
  it("marks revoked authorization, while provider outage leaves the connection intact", async () => {
    await markConnectionAttention(
      connection,
      new IntegrationError("unavailable"),
    );
    expect(updates).not.toHaveBeenCalled();
    await markConnectionAttention(
      connection,
      new IntegrationError("authorization"),
    );
    expect(updates).toHaveBeenCalledWith(
      expect.objectContaining({ status: "attention" }),
    );
  });
  it("starts without provider credentials and makes no provider or connection-table reads", async () => {
    const from = vi.fn();
    mocks.context.mockResolvedValue({
      org: "org-a",
      role: "MEMBER",
      db: { from },
    });
    mocks.configured.mockReturnValue(false);
    const result = await settingsConnections();
    expect(result.connections).toEqual([]);
    expect(Object.values(result.setup)).toEqual([false, false, false]);
    expect(from).not.toHaveBeenCalled();
    expect(mocks.service).not.toHaveBeenCalled();
    expect(mocks.provider).not.toHaveBeenCalled();
  });
});
