// @vitest-environment node
import { generateKeyPairSync } from "node:crypto";
import {
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
const mocks = vi.hoisted(() => ({ key: "", request: vi.fn() }));
vi.mock("./config", () => ({
  requireConfigured: () => ({
    STYLUS_GITHUB_APP_ID: "11",
    STYLUS_GITHUB_PRIVATE_KEY: mocks.key,
  }),
}));
vi.mock("./http", () => ({
  providerRequest: mocks.request,
  bearer: (t: string) => ({ Authorization: `Bearer ${t}` }),
}));
import { githubInstallations, verifyGithubSelection } from "./github";
import { IntegrationError } from "./errors";
beforeAll(() => {
  mocks.key = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  }).privateKey;
});
beforeEach(() => mocks.request.mockReset());
afterEach(() => vi.restoreAllMocks());
describe("GitHub App installation selection", () => {
  it("shows only the configured App's active user-accessible installations", async () => {
    mocks.request.mockResolvedValue({
      installations: [
        {
          id: 1,
          app_id: 11,
          account: { login: "Fictional startup" },
          suspended_at: null,
        },
        { id: 2, app_id: 99, account: { login: "Other App" } },
        {
          id: 3,
          app_id: 11,
          account: { login: "Suspended" },
          suspended_at: "2026-11-11",
        },
      ],
      total_count: 50,
    });
    const r = await githubInstallations("fictional-user-token", 1);
    expect(r).toEqual({
      items: [{ id: "1", title: "Fictional startup" }],
      hasMore: true,
    });
    expect(mocks.request.mock.calls[0]![0]).toContain(
      "/user/installations?per_page=25&page=1",
    );
  });
  it("verifies the App, user's exact repository, and restricted installation token", async () => {
    mocks.request
      .mockResolvedValueOnce({
        id: 1,
        app_id: 11,
        account: { login: "Fictional startup" },
      })
      .mockResolvedValueOnce({ id: 12, full_name: "fictional/startup" })
      .mockResolvedValueOnce({ token: "fictional-installation-token" });
    expect(
      await verifyGithubSelection("fictional-user-token", "1", [
        { id: "12", fullName: "fictional/startup" },
      ]),
    ).toEqual({
      name: "Fictional startup",
      repositories: [{ id: "12", fullName: "fictional/startup" }],
    });
    expect(mocks.request.mock.calls[1]![1].headers.Authorization).toBe(
      "Bearer fictional-user-token",
    );
    const final = mocks.request.mock.calls[2]!;
    expect(final[0]).toBe(
      "https://api.github.com/app/installations/1/access_tokens",
    );
    expect(JSON.parse(final[1].body)).toEqual({
      repository_ids: [12],
      permissions: {
        metadata: "read",
        issues: "read",
        pull_requests: "read",
        contents: "read",
      },
    });
  });
  it("rejects another App or a suspended installation before repository reads", async () => {
    for (const value of [
      { id: 1, app_id: 99, account: { login: "Other" } },
      {
        id: 1,
        app_id: 11,
        account: { login: "Suspended" },
        suspended_at: "2026-11-11",
      },
    ]) {
      mocks.request.mockReset().mockResolvedValueOnce(value);
      await expect(
        verifyGithubSelection("user", "1", [
          { id: "12", fullName: "fictional/startup" },
        ]),
      ).rejects.toMatchObject({ category: "denied" });
      expect(mocks.request).toHaveBeenCalledTimes(1);
    }
  });
  it("does not issue privileged tokens when the connecting user cannot read a repository", async () => {
    mocks.request
      .mockResolvedValueOnce({
        id: 1,
        app_id: 11,
        account: { login: "Fictional startup" },
      })
      .mockRejectedValueOnce(new IntegrationError("denied"));
    await expect(
      verifyGithubSelection("user", "1", [
        { id: "12", fullName: "fictional/startup" },
      ]),
    ).rejects.toMatchObject({ category: "denied" });
    expect(
      mocks.request.mock.calls.every(
        (c) => !String(c[0]).includes("access_tokens"),
      ),
    ).toBe(true);
  });
  it("rejects a forged repository name and removed installation repositories", async () => {
    mocks.request
      .mockResolvedValueOnce({
        id: 1,
        app_id: 11,
        account: { login: "Fictional startup" },
      })
      .mockResolvedValueOnce({ id: 12, full_name: "different/repository" });
    await expect(
      verifyGithubSelection("user", "1", [
        { id: "12", fullName: "fictional/startup" },
      ]),
    ).rejects.toMatchObject({ category: "denied" });
    mocks.request
      .mockReset()
      .mockResolvedValueOnce({
        id: 1,
        app_id: 11,
        account: { login: "Fictional startup" },
      })
      .mockResolvedValueOnce({ id: 12, full_name: "fictional/startup" })
      .mockRejectedValueOnce(new IntegrationError("denied"));
    await expect(
      verifyGithubSelection("user", "1", [
        { id: "12", fullName: "fictional/startup" },
      ]),
    ).rejects.toMatchObject({ category: "denied" });
  });
});
