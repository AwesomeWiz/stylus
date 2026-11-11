import "server-only";
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { serverEnv } from "@/lib/env/server";
import type { IntegrationProvider } from "@/core/integrations/public";
import { callbackUrl, requireConfigured } from "./config";
import {
  integrationContext,
  requireManager,
  type IntegrationContext,
} from "./context";
import { sealCredential, openCredential } from "./credentials";
import { IntegrationError } from "./errors";
import { bearer, providerRequest } from "./http";
import { googleScopes } from "./google";

export const tokenSchema = z.object({
  access_token: z.string().min(1).max(4000),
  refresh_token: z.string().min(1).max(4000).optional(),
  expires_at: z.number(),
  scope: z.string().max(2000),
});
export type OAuthToken = z.infer<typeof tokenSchema>;
const flowSchema = z.object({
  verifier: z.string(),
  browserHash: z.string(),
  connectionId: z.uuid(),
  expected: z.number().int().nonnegative(),
});
export const githubGrantSchema = z.object({
  token: z.string().min(1).max(4000),
  connectionId: z.uuid(),
  expected: z.number().int().nonnegative(),
});
export const hashState = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const credentialIdentity = (
  org: string,
  id: string,
  provider: IntegrationProvider,
) => `integration:1:${org}:${id}:${provider}`;
export function equalState(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export async function beginOAuth(provider: IntegrationProvider) {
  const context = await integrationContext(),
    config = requireConfigured(provider);
  if (provider === "github") requireManager(context);
  const service = createServiceSupabaseClient();
  const previous = await context.db
    .from("integration_connections")
    .select("id,generation")
    .eq("organization_id", context.org)
    .eq("provider", provider)
    .maybeSingle();
  if (previous.error) throw new IntegrationError("unavailable");
  // Bound pending grants per user and provider; a new attempt supersedes the old one.
  const clear = await service
    .from("integration_oauth_states")
    .delete()
    .eq("actor_id", context.actor)
    .eq("organization_id", context.org)
    .eq("provider", provider);
  if (clear.error) throw new IntegrationError("unavailable");
  const state = randomBytes(32).toString("base64url"),
    verifier = randomBytes(32).toString("base64url"),
    browser = randomBytes(32).toString("base64url"),
    id = hashState(state);
  const record = {
    verifier,
    browserHash: hashState(browser),
    connectionId: previous.data?.id ?? randomUUID(),
    expected: previous.data?.generation ?? 0,
  };
  const saved = await service.from("integration_oauth_states").insert({
    id,
    actor_id: context.actor,
    organization_id: context.org,
    provider,
    purpose: "oauth",
    sealed: sealCredential(
      record,
      `oauth:${context.org}:${context.actor}:${id}`,
    ),
    expires_at: new Date(Date.now() + 600_000).toISOString(),
    created_at: new Date().toISOString(),
  });
  if (saved.error) throw new IntegrationError("unavailable");
  (await cookies()).set(`stylus-oauth-${provider}`, `${id}.${browser}`, {
    httpOnly: true,
    secure: new URL(serverEnv.NEXT_PUBLIC_SITE_URL).protocol === "https:",
    sameSite: "lax",
    path: `/integrations/${provider}/callback`,
    maxAge: 600,
  });
  const params = new URLSearchParams({
    client_id:
      provider === "github"
        ? config.STYLUS_GITHUB_CLIENT_ID!
        : config.STYLUS_GOOGLE_CLIENT_ID!,
    redirect_uri: callbackUrl(provider),
    state,
    response_type: "code",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  });
  if (provider !== "github") {
    params.set("scope", googleScopes[provider].join(" "));
    params.set("access_type", "offline");
    params.set("prompt", "consent select_account");
  } else params.set("allow_signup", "false");
  return `${provider === "github" ? "https://github.com/login/oauth/authorize" : "https://accounts.google.com/o/oauth2/v2/auth"}?${params}`;
}
export async function activateConnection(
  context: IntegrationContext,
  provider: IntegrationProvider,
  id: string,
  expected: number,
  account: string,
  name: string,
  config: {
    installationId?: string;
    repositories?: { id: string; fullName: string }[];
  },
  credential: unknown,
) {
  const sealed = sealCredential(
    credential,
    credentialIdentity(context.org, id, provider),
  );
  const result = await createServiceSupabaseClient().rpc(
    "activate_integration",
    {
      p_actor: context.actor,
      p_org: context.org,
      p_id: id,
      p_provider: provider,
      p_account: account.slice(0, 256),
      p_name: name.slice(0, 160),
      p_config: config,
      p_sealed: sealed,
      p_expected: expected,
    },
  );
  if (result.error)
    throw new IntegrationError(
      result.error.code === "PT409" ? "conflict" : "denied",
    );
}
export async function completeOAuth(
  provider: IntegrationProvider,
  params: URLSearchParams,
) {
  const context = await integrationContext(),
    config = requireConfigured(provider);
  if (provider === "github") requireManager(context);
  const state = params.get("state");
  if (
    !state ||
    !/^[\w-]{43}$/.test(state) ||
    params.getAll("state").length !== 1 ||
    params.getAll("code").length > 1
  )
    throw new IntegrationError("denied");
  const id = hashState(state),
    cookie = (await cookies()).get(`stylus-oauth-${provider}`)?.value;
  if (!cookie || !equalState(cookie.split(".")[0] ?? "", id))
    throw new IntegrationError("denied");
  const service = createServiceSupabaseClient();
  // Atomic consume scoped to current authenticated actor AND current organization.
  const result = await service
    .from("integration_oauth_states")
    .delete()
    .eq("id", id)
    .eq("actor_id", context.actor)
    .eq("organization_id", context.org)
    .eq("provider", provider)
    .eq("purpose", "oauth")
    .gt("expires_at", new Date().toISOString())
    .select("sealed")
    .maybeSingle();
  if (result.error || !result.data) throw new IntegrationError("denied");
  const flow = flowSchema.parse(
    openCredential(
      result.data.sealed,
      `oauth:${context.org}:${context.actor}:${id}`,
    ),
  );
  if (!equalState(flow.browserHash, hashState(cookie.split(".")[1] ?? "")))
    throw new IntegrationError("denied");
  (await cookies()).delete({
    name: `stylus-oauth-${provider}`,
    path: `/integrations/${provider}/callback`,
  });
  if (params.has("error")) throw new IntegrationError("authorization");
  const code = params.get("code");
  if (!code || code.length > 2048) throw new IntegrationError("invalid");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    code_verifier: flow.verifier,
    redirect_uri: callbackUrl(provider),
    client_id:
      provider === "github"
        ? config.STYLUS_GITHUB_CLIENT_ID!
        : config.STYLUS_GOOGLE_CLIENT_ID!,
    client_secret:
      provider === "github"
        ? config.STYLUS_GITHUB_CLIENT_SECRET!
        : config.STYLUS_GOOGLE_CLIENT_SECRET!,
  });
  const tokens = z
    .object({
      access_token: z.string().min(1).max(4000),
      refresh_token: z.string().max(4000).optional(),
      expires_in: z.number().positive().optional(),
      scope: z.string().optional(),
      error: z.string().optional(),
    })
    .parse(
      await providerRequest(
        provider === "github"
          ? "https://github.com/login/oauth/access_token"
          : "https://oauth2.googleapis.com/token",
        {
          method: "POST",
          body,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      ),
    );
  if (tokens.error) throw new IntegrationError("authorization");
  if (provider === "github") {
    const grantId = randomUUID();
    const saved = await service.from("integration_oauth_states").insert({
      id: grantId,
      organization_id: context.org,
      actor_id: context.actor,
      provider,
      purpose: "github-selection",
      sealed: sealCredential(
        {
          token: tokens.access_token,
          connectionId: flow.connectionId,
          expected: flow.expected,
        },
        `github-grant:${context.org}:${context.actor}:${grantId}`,
      ),
      expires_at: new Date(Date.now() + 600_000).toISOString(),
      created_at: new Date().toISOString(),
    });
    if (saved.error) throw new IntegrationError("unavailable");
    return `/settings/integrations?grant=${grantId}`;
  }
  if (
    !tokens.refresh_token ||
    !tokens.expires_in ||
    googleScopes[provider]
      .filter((s) => s.startsWith("https:"))
      .some((s) => !tokens.scope?.split(" ").includes(s))
  )
    throw new IntegrationError("authorization");
  const identity = z
    .object({
      sub: z.string().max(256),
      email: z.string().email().max(160),
      email_verified: z.boolean(),
    })
    .parse(
      await providerRequest("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: bearer(tokens.access_token),
      }),
    );
  if (!identity.email_verified) throw new IntegrationError("authorization");
  await activateConnection(
    context,
    provider,
    flow.connectionId,
    flow.expected,
    identity.sub,
    identity.email,
    {},
    {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      scope: tokens.scope ?? "",
    },
  );
  return "/settings/integrations?connected=1";
}
