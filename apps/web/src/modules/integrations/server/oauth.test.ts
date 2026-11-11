// @vitest-environment node
import { randomBytes } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  provider: vi.fn(),
  rpc: vi.fn(),
  cookie: new Map<string, string>(),
  states: [] as Record<string, unknown>[],
  role: "OWNER",
}));
vi.mock("./config", () => ({
  requireConfigured: () => ({
    STYLUS_GITHUB_CLIENT_ID: "fictional-app",
    STYLUS_GITHUB_CLIENT_SECRET: "fictional-secret",
    STYLUS_GOOGLE_CLIENT_ID: "fictional-google",
    STYLUS_GOOGLE_CLIENT_SECRET: "fictional-secret",
  }),
  callbackUrl: (p: string) =>
    `https://stylus.example/integrations/${p}/callback`,
  integrationEnvironment: () => ({
    STYLUS_INTEGRATION_KEY_ID: process.env.STYLUS_INTEGRATION_KEY_ID,
    STYLUS_INTEGRATION_KEYS: process.env.STYLUS_INTEGRATION_KEYS,
  }),
}));
vi.mock("./context", () => ({
  integrationContext: mocks.context,
  requireManager: (c: { role: string }) => {
    if (c.role !== "OWNER" && c.role !== "ADMIN") throw Error("denied");
  },
}));
vi.mock("./http", () => ({
  providerRequest: mocks.provider,
  bearer: (t: string) => ({ Authorization: `Bearer ${t}` }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      mocks.cookie.has(name) ? { value: mocks.cookie.get(name) } : undefined,
    set: (name: string, value: string) => mocks.cookie.set(name, value),
    delete: ({ name }: { name: string }) => mocks.cookie.delete(name),
  }),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceSupabaseClient: () => ({
    rpc: mocks.rpc,
    from: () => stateQuery(),
  }),
}));
import { beginOAuth, completeOAuth, equalState, hashState } from "./oauth";
import { googleScopes } from "./google";
let current: { org: string; actor: string; role: string; db: unknown };
function stateQuery() {
  const filters: [string, unknown][] = [];
  let operation = "read",
    data: Record<string, unknown> | undefined,
    select = false;
  const run = () => {
    if (operation === "insert") {
      mocks.states.push(data!);
      return { data: null, error: null };
    }
    const found = mocks.states.find((r) =>
      filters.every(([k, v]) =>
        k === "expires_at" ? String(r[k]) > String(v) : r[k] === v,
      ),
    );
    if (operation === "delete" && found)
      mocks.states.splice(mocks.states.indexOf(found), 1);
    return { data: select ? (found ?? null) : null, error: null };
  };
  const chain = {
    delete: () => {
      operation = "delete";
      return chain;
    },
    insert: (v: Record<string, unknown>) => {
      operation = "insert";
      data = v;
      return Promise.resolve(run());
    },
    eq: (k: string, v: unknown) => {
      filters.push([k, v]);
      return chain;
    },
    gt: (k: string, v: unknown) => {
      filters.push([k, v]);
      return chain;
    },
    select: () => {
      select = true;
      return chain;
    },
    maybeSingle: async () => run(),
    then: (resolve: (v: unknown) => void) =>
      Promise.resolve(run()).then(resolve),
  };
  return chain;
}
beforeEach(() => {
  mocks.states.length = 0;
  mocks.cookie.clear();
  mocks.provider.mockReset();
  mocks.rpc.mockReset().mockResolvedValue({ error: null, data: "id" });
  current = {
    org: "org-a",
    actor: "user-a",
    role: "OWNER",
    db: {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    },
  };
  mocks.context.mockImplementation(async () => current);
  vi.stubEnv("STYLUS_INTEGRATION_KEY_ID", "k1");
  vi.stubEnv(
    "STYLUS_INTEGRATION_KEYS",
    JSON.stringify({ k1: randomBytes(32).toString("base64") }),
  );
});
afterEach(() => vi.unstubAllEnvs());
async function flow(provider: "github" | "google-drive" = "github") {
  const url = new URL(await beginOAuth(provider));
  return {
    url,
    params: new URLSearchParams({
      state: url.searchParams.get("state")!,
      code: "fictional-code",
    }),
  };
}
describe("one-time actor/org/browser-bound OAuth", () => {
  it("builds exact callbacks with random state and S256 PKCE, keeping verifier private", async () => {
    const { url } = await flow();
    expect(url.origin).toBe("https://github.com");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://stylus.example/integrations/github/callback",
    );
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toHaveLength(43);
    expect(url.searchParams.has("code_verifier")).toBe(false);
    expect(mocks.states[0]!.sealed).not.toContain("verifier");
    expect(String(mocks.states[0]!.id)).toBe(
      hashState(url.searchParams.get("state")!),
    );
  });
  it("requires GitHub management authority before starting", async () => {
    current.role = "MEMBER";
    await expect(flow()).rejects.toThrow();
    expect(mocks.states).toHaveLength(0);
  });
  it("rejects tampered state without calling providers", async () => {
    const { params } = await flow();
    params.set("state", "x".repeat(43));
    await expect(completeOAuth("github", params)).rejects.toThrow();
    expect(mocks.provider).not.toHaveBeenCalled();
  });
  it.each(["actor", "org"] as const)(
    "rejects a different %s without consuming the legitimate state",
    async (field) => {
      const { params } = await flow();
      current[field] = "different";
      await expect(completeOAuth("github", params)).rejects.toThrow();
      expect(mocks.provider).not.toHaveBeenCalled();
      expect(mocks.states).toHaveLength(1);
    },
  );
  it("rejects a missing browser cookie and an expired state", async () => {
    const { params } = await flow();
    const cookie = mocks.cookie.get("stylus-oauth-github")!;
    mocks.cookie.clear();
    await expect(completeOAuth("github", params)).rejects.toThrow();
    mocks.cookie.set("stylus-oauth-github", cookie);
    mocks.states[0]!.expires_at = "2000-01-01T00:00:00Z";
    await expect(completeOAuth("github", params)).rejects.toThrow();
    expect(mocks.provider).not.toHaveBeenCalled();
  });
  it("consumes once, exchanges server-side and returns only an opaque GitHub selection receipt", async () => {
    const { params } = await flow();
    mocks.provider.mockResolvedValue({ access_token: "fictional-user-token" });
    const destination = await completeOAuth("github", params);
    expect(destination).toMatch(/^\/settings\/integrations\?grant=[\w-]+$/);
    expect(destination).not.toContain("token");
    expect(mocks.provider).toHaveBeenCalledTimes(1);
    expect(mocks.states).toHaveLength(1);
    expect(mocks.states[0]!.purpose).toBe("github-selection");
    expect(String(mocks.states[0]!.sealed)).not.toContain(
      "fictional-user-token",
    );
    await expect(completeOAuth("github", params)).rejects.toThrow();
    expect(mocks.provider).toHaveBeenCalledTimes(1);
  });
  it("treats denied consent as a consumed failure", async () => {
    const { params } = await flow();
    params.set("error", "access_denied");
    await expect(completeOAuth("github", params)).rejects.toThrow();
    expect(mocks.states).toHaveLength(0);
    expect(mocks.provider).not.toHaveBeenCalled();
  });
  it("requests only explicit Google scopes with offline consent and activates encrypted credentials", async () => {
    const { url, params } = await flow("google-drive");
    expect(url.searchParams.get("scope")).toBe(
      googleScopes["google-drive"].join(" "),
    );
    expect(url.searchParams.get("access_type")).toBe("offline");
    mocks.provider
      .mockResolvedValueOnce({
        access_token: "fictional-access",
        refresh_token: "fictional-refresh",
        expires_in: 3600,
        scope: googleScopes["google-drive"].join(" "),
      })
      .mockResolvedValueOnce({
        sub: "isolated-google-user",
        email: "isolated@example.test",
        email_verified: true,
      });
    expect(await completeOAuth("google-drive", params)).toBe(
      "/settings/integrations?connected=1",
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      "activate_integration",
      expect.objectContaining({
        p_actor: "user-a",
        p_org: "org-a",
        p_provider: "google-drive",
      }),
    );
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toMatch(
      /fictional-access|fictional-refresh/,
    );
  });
  it("does not connect Google after incomplete grants or missing refresh credentials", async () => {
    const { params } = await flow("google-drive");
    mocks.provider.mockResolvedValueOnce({
      access_token: "fictional",
      expires_in: 3600,
      scope: "openid email",
    });
    await expect(completeOAuth("google-drive", params)).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects repeated callback parameters and does not accept a caller return URL", async () => {
    const { params } = await flow();
    params.append("state", params.get("state")!);
    await expect(completeOAuth("github", params)).rejects.toThrow();
    expect(mocks.provider).not.toHaveBeenCalled();
    expect(equalState("x", "xx")).toBe(false);
  });
});
