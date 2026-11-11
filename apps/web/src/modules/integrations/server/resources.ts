import { resourceAdapters } from "./providers";
import "server-only";
import { createHash } from "node:crypto";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { serverEnv } from "@/lib/env/server";
import {
  locatorSchema,
  resourceProjectionSchema,
  validResourceUrl,
  type ConnectionRow,
  type IntegrationTarget,
  type LinkedResource,
  type ResourceLocator,
  type ResourceProjection,
  type SearchInput,
} from "@/core/integrations/public";
import {
  authorizeTarget,
  integrationContext,
  readConnection,
  readConnections,
  requireEditor,
} from "./context";
import {
  connectionToken,
  liveToken,
  markConnectionAttention,
} from "./connections";
import {
  googleCalendars,
  createGoogleEvent,
  type CalendarCreateInput,
} from "./google";
import { IntegrationError, safeIntegrationError } from "./errors";

export const resourceKey = (locator: ResourceLocator) =>
  createHash("sha256")
    .update(JSON.stringify(locatorSchema.parse(locator)))
    .digest("hex");
async function resolve(
  connection: ConnectionRow,
  token: string,
  locator: ResourceLocator,
) {
  if (connection.provider !== locator.provider)
    throw new IntegrationError("denied");
  const result = await resourceAdapters[connection.provider].resolve(
    connection,
    token,
    locator,
  );
  if (!validResourceUrl(locator.provider, result.url))
    throw new IntegrationError("unavailable");
  const parsed = resourceProjectionSchema.parse(result);
  if (resourceKey(parsed.locator) !== resourceKey(locator))
    throw new IntegrationError("denied");
  return parsed;
}
export async function searchResources(
  target: IntegrationTarget,
  input: SearchInput,
) {
  const context = await integrationContext();
  requireEditor(context);
  await authorizeTarget(context, target, true);
  const { connection, token } = await liveToken(context, input.connectionId);
  try {
    const result = await resourceAdapters[connection.provider].search(
      connection,
      token,
      input,
    );
    const current = await readConnection(context, connection.id);
    if (current.generation !== connection.generation)
      throw new IntegrationError("conflict");
    return {
      ...result,
      items: result.items.map((item) => resourceProjectionSchema.parse(item)),
    };
  } catch (error) {
    await markConnectionAttention(connection, error);
    throw error;
  }
}
export async function attachResource(
  target: IntegrationTarget,
  connectionId: string,
  locator: ResourceLocator,
) {
  const context = await integrationContext();
  await authorizeTarget(context, target, true);
  const { connection, token } = await liveToken(context, connectionId);
  try {
    await resolve(connection, token, locator); // Browser metadata/URLs are never trusted.
    const result = await context.db.rpc("set_external_resource_link", {
      p_organization_id: context.org,
      p_type: target.entityType,
      p_entity: target.entityId,
      p_connection: connection.id,
      p_locator: locator,
      p_remove: false,
    });
    if (result.error) throw new IntegrationError("denied");
    return result.data;
  } catch (error) {
    await markConnectionAttention(connection, error);
    throw error;
  }
}
export async function removeResource(target: IntegrationTarget, id: string) {
  const context = await integrationContext();
  await authorizeTarget(context, target, true);
  const result = await context.db
    .from("external_resource_links")
    .select("*")
    .eq("id", id)
    .eq("organization_id", context.org)
    .eq("entity_type", target.entityType)
    .eq("entity_id", target.entityId)
    .maybeSingle();
  if (result.error || !result.data) throw new IntegrationError("denied");
  const row = result.data;
  const removed = await context.db.rpc("set_external_resource_link", {
    p_organization_id: context.org,
    p_type: target.entityType,
    p_entity: target.entityId,
    p_connection: row.connection_id,
    p_locator: row.locator,
    p_remove: true,
  });
  if (removed.error) throw new IntegrationError("denied");
}
export async function linkedResources(
  target: IntegrationTarget,
  cursor?: string,
  refresh = false,
) {
  const context = await integrationContext();
  await authorizeTarget(context, target);
  let query = context.db
    .from("external_resource_links")
    .select("*")
    .eq("organization_id", context.org)
    .eq("entity_type", target.entityType)
    .eq("entity_id", target.entityId)
    .order("id")
    .limit(6);
  if (cursor) query = query.gt("id", cursor);
  const result = await query;
  if (result.error) throw new IntegrationError("unavailable");
  const rows = result.data?.slice(0, 5) ?? [];
  if (!rows.length) return { items: [] as LinkedResource[], cursor: undefined };
  const service = createServiceSupabaseClient();
  const cache =
    rows.length && !refresh
      ? await service
          .from("integration_resource_cache")
          .select("*")
          .in("connection_id", [...new Set(rows.map((r) => r.connection_id))])
          .in(
            "resource_key",
            rows.map((r) => resourceKey(r.locator)),
          )
          .gt("checked_at", new Date(Date.now() - 60_000).toISOString())
      : { data: [] };
  const ids = [...new Set(rows.map((r) => r.connection_id))],
    connections = await readConnections(context, ids);
  const resolved = new Map<string, ResourceProjection | IntegrationError>();
  // Canonical target authorization precedes shared resolution. Search never uses
  // this path. One token and one batch per connection, not one request per row.
  for (const [connectionId, connection] of connections) {
    const group = rows.filter((r) => r.connection_id === connectionId),
      missing = group.filter((row) => {
        const c = cache.data?.find(
          (c) =>
            c.connection_id === connectionId &&
            c.resource_key === resourceKey(row.locator) &&
            c.generation === connection.generation,
        );
        const valid = resourceProjectionSchema.safeParse(c?.projection);
        if (
          valid.success &&
          resourceKey(valid.data.locator) === resourceKey(row.locator)
        ) {
          resolved.set(row.id, valid.data);
          return false;
        }
        return true;
      });
    if (!missing.length) continue;
    try {
      const token = await connectionToken(connection);
      const locators = missing.map((r) => locatorSchema.parse(r.locator));
      if (locators.some((l) => l.provider !== connection.provider))
        throw new IntegrationError("denied");
      const values = await resourceAdapters[connection.provider].resolveMany(
        connection,
        token,
        locators,
      );
      const cacheRows: { key: string; projection: ResourceProjection }[] = [];
      const failedKeys: string[] = [];
      for (const [index, row] of missing.entries()) {
        let value = values[index] ?? new IntegrationError("unavailable");
        if (!(value instanceof IntegrationError)) {
          const parsed = resourceProjectionSchema.safeParse(value);
          value =
            parsed.success &&
            resourceKey(parsed.data.locator) === resourceKey(row.locator)
              ? parsed.data
              : new IntegrationError("unavailable");
        }
        resolved.set(row.id, value);
        if (value instanceof IntegrationError) {
          await markConnectionAttention(connection, value);
          failedKeys.push(resourceKey(row.locator));
        } else
          cacheRows.push({ key: resourceKey(row.locator), projection: value });
      }
      if (failedKeys.length)
        await service
          .from("integration_resource_cache")
          .delete()
          .eq("connection_id", connectionId)
          .in("resource_key", failedKeys);
      if (cacheRows.length)
        await service.rpc("store_integration_cache", {
          p_id: connectionId,
          p_generation: connection.generation,
          p_rows: cacheRows,
        });
    } catch (error) {
      await markConnectionAttention(connection, error);
      await service
        .from("integration_resource_cache")
        .delete()
        .eq("connection_id", connectionId)
        .in(
          "resource_key",
          missing.map((row) => resourceKey(row.locator)),
        );
      for (const row of missing)
        resolved.set(
          row.id,
          error instanceof IntegrationError
            ? error
            : new IntegrationError("unavailable"),
        );
    }
  }
  const current = await readConnections(context, ids);
  const items: LinkedResource[] = rows.map((row) => {
    const value = resolved.get(row.id),
      before = connections.get(row.connection_id),
      after = current.get(row.connection_id);
    if (
      !before ||
      !after ||
      before.generation !== after.generation ||
      !value ||
      value instanceof IntegrationError
    )
      return {
        id: row.id,
        provider: row.locator.provider,
        status: "unavailable",
        message:
          value instanceof IntegrationError
            ? safeIntegrationError(value)
            : "Connection unavailable.",
      };
    return {
      id: row.id,
      provider: row.locator.provider,
      status: "available",
      resource: value,
    };
  });
  return {
    items,
    cursor: (result.data?.length ?? 0) > 5 ? rows.at(-1)?.id : undefined,
  };
}
export async function calendarChoices(
  target: IntegrationTarget,
  connectionId: string,
) {
  const context = await integrationContext();
  await authorizeTarget(context, target, true);
  const { connection, token } = await liveToken(context, connectionId);
  if (connection.provider !== "google-calendar")
    throw new IntegrationError("denied");
  try {
    return await googleCalendars(token);
  } catch (error) {
    await markConnectionAttention(connection, error);
    throw error;
  }
}
export async function calendarRecovery(
  target: IntegrationTarget,
  connectionId: string,
) {
  const context = await integrationContext();
  await authorizeTarget(context, target, true);
  const connection = await readConnection(context, connectionId);
  if (connection.provider !== "google-calendar")
    throw new IntegrationError("denied");
  const result = await createServiceSupabaseClient()
    .from("integration_calendar_intents")
    .select("id,input,account_id")
    .eq("organization_id", context.org)
    .eq("actor_id", context.actor)
    .eq("connection_id", connectionId)
    .eq("entity_type", target.entityType)
    .eq("entity_id", target.entityId)
    .eq("state", "pending")
    .maybeSingle();
  if (result.error) throw new IntegrationError("unavailable");
  if (result.data && result.data.account_id !== connection.account_id)
    throw new IntegrationError("conflict");
  return result.data;
}
export async function addCalendarEvent(
  target: IntegrationTarget,
  connectionId: string,
  intentId: string,
  input: CalendarCreateInput,
) {
  const context = await integrationContext();
  const projection = await authorizeTarget(context, target, true);
  if (
    !["core.task", "core.milestone", "marketing.experiment"].includes(
      target.entityType,
    ) ||
    !projection.date
  )
    throw new IntegrationError("denied");
  const { connection, token } = await liveToken(context, connectionId);
  if (connection.provider !== "google-calendar")
    throw new IntegrationError("denied");
  let calendars: Awaited<ReturnType<typeof googleCalendars>>;
  try {
    calendars = await googleCalendars(token);
  } catch (error) {
    await markConnectionAttention(connection, error);
    throw error;
  }
  if (!calendars.some((c) => c.id === input.calendarId && c.writable))
    throw new IntegrationError("denied");
  const service = createServiceSupabaseClient();
  const pending = {
    account_id: connection.account_id,
    id: intentId,
    organization_id: context.org,
    actor_id: context.actor,
    connection_id: connection.id,
    entity_type: target.entityType,
    entity_id: target.entityId,
    input: { ...input },
    state: "pending" as const,
    created_at: new Date().toISOString(),
  };
  const inserted = await service
    .from("integration_calendar_intents")
    .upsert(pending, { onConflict: "id", ignoreDuplicates: true });
  if (inserted.error)
    throw new IntegrationError(
      inserted.error.code === "23505" ? "conflict" : "unavailable",
    );
  const receipt = await service
    .from("integration_calendar_intents")
    .select("*")
    .eq("id", intentId)
    .eq("actor_id", context.actor)
    .eq("organization_id", context.org)
    .maybeSingle();
  if (
    receipt.error ||
    !receipt.data ||
    receipt.data.connection_id !== connection.id ||
    receipt.data.account_id !== connection.account_id ||
    receipt.data.entity_type !== target.entityType ||
    receipt.data.entity_id !== target.entityId ||
    Object.entries(input).some(([k, v]) => receipt.data!.input[k] !== v)
  )
    throw new IntegrationError("conflict");
  let resource: ResourceProjection;
  try {
    resource = await createGoogleEvent(
      token,
      input,
      intentId,
      new URL(projection.href, serverEnv.NEXT_PUBLIC_SITE_URL).href,
    );
  } catch (error) {
    // A definite invalid request did not create an event. Allow corrected input;
    // unknown/lost responses retain the receipt and exact ID for recovery.
    if (error instanceof IntegrationError && error.category === "invalid") {
      const discarded = await service
        .from("integration_calendar_intents")
        .delete()
        .eq("id", intentId)
        .eq("organization_id", context.org)
        .eq("actor_id", context.actor)
        .eq("state", "pending");
      if (discarded.error) throw new IntegrationError("unavailable");
    }
    await markConnectionAttention(connection, error);
    throw error;
  }
  // Recovery repeats this link only. The same receipt always resolves the same
  // provider event; neither unlink nor changing Stylus dates mutates that event.
  const linked = await context.db.rpc("set_external_resource_link", {
    p_organization_id: context.org,
    p_type: target.entityType,
    p_entity: target.entityId,
    p_connection: connection.id,
    p_locator: resource.locator,
    p_remove: false,
  });
  if (linked.error) throw new IntegrationError("unavailable");
  await service
    .from("integration_calendar_intents")
    .update({ state: "linked" })
    .eq("id", intentId)
    .eq("actor_id", context.actor)
    .eq("organization_id", context.org);
  return resource;
}
export async function resourceWorkspace(target: IntegrationTarget) {
  const context = await integrationContext(),
    projection = await authorizeTarget(context, target);
  const { configured } = await import("./config");
  const result = await context.db
    .from("integration_connections")
    .select("id,provider,status,display_name,config")
    .eq("organization_id", context.org)
    .eq("status", "connected")
    .order("provider");
  if (result.error) throw new IntegrationError("setup");
  return {
    connections: (result.data ?? []).filter((c) => configured(c.provider)),
    canEdit: context.role !== "VIEWER",
    target: projection,
  };
}
