import "server-only";
import { z } from "zod";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type {
  ConnectionRow,
  IntegrationProvider,
} from "@/core/integrations/public";
import { integrationProviders } from "@/core/integrations/public";
import { configured, requireConfigured } from "./config";
import { integrationContext, readConnection, requireManager } from "./context";
import { openCredential, sealCredential } from "./credentials";
import { IntegrationError } from "./errors";
import {
  githubInstallationToken,
  githubInstallations,
  githubRepositories,
  verifyGithubSelection,
} from "./github";
import { providerRequest } from "./http";
import {
  activateConnection,
  credentialIdentity,
  githubGrantSchema,
  tokenSchema,
} from "./oauth";

export async function settingsConnections() {
  const context = await integrationContext();
  const setup = Object.fromEntries(
    integrationProviders.map((p) => [p, configured(p)]),
  ) as Record<IntegrationProvider, boolean>;
  const rows = Object.values(setup).some(Boolean)
    ? await context.db
        .from("integration_connections")
        .select("id,provider,status,display_name,config")
        .eq("organization_id", context.org)
        .order("provider")
    : { data: [], error: null };
  if (rows.error) throw new IntegrationError("setup");
  return {
    connections: rows.data ?? [],
    setup,
    canManage: context.role === "OWNER" || context.role === "ADMIN",
  };
}
export async function connectionToken(connection: ConnectionRow) {
  requireConfigured(connection.provider);
  if (connection.provider === "github")
    return githubInstallationToken(connection);
  const service = createServiceSupabaseClient(),
    identity = credentialIdentity(
      connection.organization_id,
      connection.id,
      connection.provider,
    );
  const result = await service
    .from("integration_secrets")
    .select("sealed")
    .eq("connection_id", connection.id)
    .maybeSingle();
  if (result.error || !result.data) throw new IntegrationError("authorization");
  const old = tokenSchema.parse(openCredential(result.data.sealed, identity));
  if (old.expires_at > Date.now() + 60_000) return old.access_token;
  if (!old.refresh_token) throw new IntegrationError("authorization");
  const env = requireConfigured(connection.provider);
  const value = z
    .object({
      access_token: z.string().min(1).max(4000),
      expires_in: z.number().positive(),
      refresh_token: z.string().max(4000).optional(),
      scope: z.string().optional(),
    })
    .parse(
      await providerRequest("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: old.refresh_token,
          client_id: env.STYLUS_GOOGLE_CLIENT_ID!,
          client_secret: env.STYLUS_GOOGLE_CLIENT_SECRET!,
        }),
      }),
    );
  const next = {
    access_token: value.access_token,
    refresh_token: value.refresh_token ?? old.refresh_token,
    expires_at: Date.now() + value.expires_in * 1000,
    scope: value.scope ?? old.scope,
  };
  const saved = await service.rpc("store_integration_secret", {
    p_id: connection.id,
    p_generation: connection.generation,
    p_sealed: sealCredential(next, identity),
  });
  if (saved.error || !saved.data) throw new IntegrationError("conflict");
  return next.access_token;
}
export async function markConnectionAttention(
  connection: ConnectionRow,
  error: unknown,
) {
  if (
    !(error instanceof IntegrationError) ||
    error.category !== "authorization"
  )
    return;
  const service = createServiceSupabaseClient();
  await service
    .from("integration_connections")
    .update({ status: "attention", updated_at: new Date().toISOString() })
    .eq("id", connection.id)
    .eq("generation", connection.generation)
    .eq("status", "connected");
  await service
    .from("integration_resource_cache")
    .delete()
    .eq("connection_id", connection.id);
}
export async function disconnectConnection(id: string) {
  const context = await integrationContext();
  const row = await context.db
    .from("integration_connections")
    .select("*")
    .eq("id", id)
    .eq("organization_id", context.org)
    .maybeSingle();
  if (
    row.error ||
    !row.data ||
    (row.data.provider !== "github" && row.data.owner_id !== context.actor)
  )
    throw new IntegrationError("denied");
  if (row.data.provider === "github") requireManager(context);
  // Disconnect is local and reliable even if the provider is offline. No provider
  // records/installations/events are deleted. Users may revoke app grants remotely.
  const result = await context.db.rpc("disconnect_integration", {
    p_organization_id: context.org,
    p_id: id,
  });
  if (result.error) throw new IntegrationError("denied");
}
async function githubGrant(grantId: string) {
  const context = await integrationContext();
  requireManager(context);
  const service = createServiceSupabaseClient();
  const result = await service
    .from("integration_oauth_states")
    .select("sealed")
    .eq("id", grantId)
    .eq("organization_id", context.org)
    .eq("actor_id", context.actor)
    .eq("provider", "github")
    .eq("purpose", "github-selection")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (result.error || !result.data) throw new IntegrationError("authorization");
  return {
    context,
    service,
    grant: githubGrantSchema.parse(
      openCredential(
        result.data.sealed,
        `github-grant:${context.org}:${context.actor}:${grantId}`,
      ),
    ),
  };
}
export async function githubChoices(
  grantId: string,
  installationId?: string,
  page = 1,
) {
  const { grant } = await githubGrant(grantId);
  return installationId
    ? githubRepositories(grant.token, installationId, page)
    : githubInstallations(grant.token, page);
}
export async function saveGithubSelection(
  grantId: string,
  installationId: string,
  selected: { id: string; fullName: string }[],
) {
  const { context, service, grant } = await githubGrant(grantId);
  const verified = await verifyGithubSelection(
    grant.token,
    installationId,
    selected,
  );
  await activateConnection(
    context,
    "github",
    grant.connectionId,
    grant.expected,
    installationId,
    verified.name,
    { installationId, repositories: verified.repositories },
    { installation: true },
  );
  await service
    .from("integration_oauth_states")
    .delete()
    .eq("id", grantId)
    .eq("actor_id", context.actor)
    .eq("organization_id", context.org);
}
export async function liveToken(
  context: Awaited<ReturnType<typeof integrationContext>>,
  connectionId: string,
  browse = true,
) {
  const connection = await readConnection(context, connectionId, browse);
  try {
    return { connection, token: await connectionToken(connection) };
  } catch (error) {
    await markConnectionAttention(connection, error);
    throw error;
  }
}
