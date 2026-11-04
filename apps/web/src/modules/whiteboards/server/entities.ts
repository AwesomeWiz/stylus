import "server-only";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { getEnabledOrganizationPluginIds } from "@/modules/plugins/server/data";
import { getBoardEntityRegistry } from "@/plugins";
import {
  canCreateEntities,
  entityReferenceKey,
  entityReferenceSchema,
  type EntityContext,
} from "@/core/entities/public";
import type { BoardElementRow } from "@/lib/supabase/database.types";
import { entityConversionSchema, entityReadSchema } from "../entity-schemas";

export async function boardEntityContext(
  input: { organizationId: string; boardId: string },
  mutate = false,
) {
  const current = await getCurrentOrganizationContext();
  if (!current || current.organization.id !== input.organizationId)
    throw { code: "42501" };
  const db = await createServerSupabaseClient();
  const target = await db
    .from("boards")
    .select("id,title")
    .eq("id", input.boardId)
    .eq("organization_id", current.organization.id)
    .is("archived_at", null)
    .maybeSingle();
  if (target.error || !target.data) throw { code: "42501" };
  const enabledPlugins = new Set(
    await getEnabledOrganizationPluginIds(current.organization.id),
  );
  const context: EntityContext = {
    organizationId: current.organization.id,
    actorId: current.user.id,
    role: current.membership.role,
    enabledPlugins,
  };
  if (mutate && !canCreateEntities(context)) throw { code: "42501" };
  return {
    context,
    db,
    board: target.data,
    registry: await getBoardEntityRegistry(),
  };
}
/** Only explicit plain textual content; no image paths, hidden descendants or native projections. */
export function extractEntitySelection(
  rows: Pick<BoardElementRow, "id" | "element_type" | "content" | "z_index">[],
  boardTitle: string,
) {
  const ordered = [...rows].sort(
    (a, b) => a.z_index - b.z_index || a.id.localeCompare(b.id),
  );
  const lines = ordered
    .map((row) => {
      const value =
        row.element_type === "TEXT" || row.element_type === "STICKY"
          ? row.content.text
          : row.element_type === "LINK"
            ? row.content.title
            : ["SHAPE", "ARROW"].includes(row.element_type)
              ? row.content.label
              : undefined;
      return typeof value === "string" ? value.trim() : "";
    })
    .filter(Boolean);
  if (!lines.length) throw { code: "22023" };
  const full =
    `Created from Board: ${boardTitle}\n\n` +
    lines.map((line) => "- " + line).join("\n");
  return {
    title: lines[0]!.split(/\r?\n/)[0]!.slice(0, 160),
    text: full.slice(0, 4800),
    truncated: full.length > 4800,
    sourceIds: ordered.map((row) => row.id).sort(),
  };
}
export async function readBoardEntities(input: unknown) {
  const value = entityReadSchema.parse(input),
    scope = await boardEntityContext(value),
    { context, db, registry } = scope;
  const types = registry.discover(context);
  const base = {
    organizationId: context.organizationId,
    boardId: scope.board.id,
    types,
  };
  if (value.operation === "resolve")
    return {
      ...base,
      resolutions: await registry.resolve(context, value.references),
    };
  if (value.operation === "search") {
    const provider = registry.available(context, value.entityType);
    if (!provider?.search || provider.metadata.conversionOnly)
      return { ...base, items: [], hasMore: false };
    const results = await provider.search(context, value.query, value.cursor);
    // Search projections pass the same validated resolver/opener boundary.
    const items = await registry.resolve(
      context,
      results.items.map((item) => item.reference),
    );
    return {
      ...base,
      items,
      hasMore: results.hasMore,
      cursor: results.items.at(-1)?.reference.entityId,
    };
  }
  if (value.operation === "preview") {
    if (!canCreateEntities(context)) throw { code: "42501" };
    const source = await db
      .from("board_elements")
      .select("id,element_type,content,z_index")
      .eq("organization_id", context.organizationId)
      .eq("board_id", scope.board.id)
      .in("id", value.sourceIds)
      .is("archived_at", null);
    if (
      source.error ||
      source.data?.length !== value.sourceIds.length ||
      source.data.some(
        (row) =>
          !["TEXT", "STICKY", "SHAPE", "ARROW", "LINK"].includes(
            row.element_type,
          ),
      )
    )
      throw { code: "42501" };
    return {
      ...base,
      preview: extractEntitySelection(source.data, scope.board.title),
    };
  }
  if (value.operation === "recover") {
    if (!canCreateEntities(context)) throw { code: "42501" };
    const receipt = await db
      .from("board_entity_conversions")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("board_id", scope.board.id)
      .eq("created_by", context.actorId)
      .eq("id", value.attemptId)
      .maybeSingle();
    if (
      receipt.error ||
      !receipt.data ||
      !registry.available(context, receipt.data.entity_type)?.create
    )
      throw { code: "42501" };
    const card = await db
      .from("board_elements")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("board_id", scope.board.id)
      .eq("id", receipt.data.card_id)
      .maybeSingle();
    if (card.error) throw card.error;
    if (card.data) {
      const reference = entityReferenceSchema.safeParse(
        card.data.content.reference,
      );
      if (
        card.data.element_type !== "ENTITY_CARD" ||
        !reference.success ||
        reference.data.organizationId !== context.organizationId ||
        reference.data.entityType !== receipt.data.entity_type ||
        reference.data.entityId !== receipt.data.entity_id ||
        card.data.metadata.conversionId !== receipt.data.id
      )
        throw { code: "42501" };
    }
    return { ...base, receipt: receipt.data, card: card.data };
  }
  const recovery = canCreateEntities(context)
    ? await db
        .from("board_entity_conversions")
        .select("id,entity_type,state,created_at,card_id")
        .eq("organization_id", context.organizationId)
        .eq("board_id", scope.board.id)
        .eq("created_by", context.actorId)
        .order("created_at", { ascending: false })
        .limit(20)
    : null;
  if (recovery?.error) throw recovery.error;
  const recoveries = (recovery?.data ?? []).filter(
    (row) => !!registry.available(context, row.entity_type)?.create,
  );
  return { ...base, recoveries };
}
export async function convertBoardEntity(input: unknown) {
  const value = entityConversionSchema.parse(input),
    { context, db, registry } = await boardEntityContext(value, true);
  const provider = registry.available(context, value.entityType);
  if (!provider?.create || !provider.parseCreation) throw { code: "42501" };
  const fields = provider.parseCreation(value.fields);
  const result = await db.rpc("prepare_board_entity_conversion", {
    p_id: value.attemptId,
    p_board_id: value.boardId,
    p_entity_type: value.entityType,
    p_input: fields,
    p_source_ids: [...value.sourceIds].sort(),
  });
  if (result.error) throw result.error;
  if (
    result.data.state === "PREPARED" &&
    provider.metadata.creationSelection === "single-sticky"
  ) {
    if (value.sourceIds.length !== 1) throw { code: "22023" };
    const source = await db
      .from("board_elements")
      .select("element_type")
      .eq("organization_id", context.organizationId)
      .eq("board_id", value.boardId)
      .eq("id", value.sourceIds[0]!)
      .is("archived_at", null)
      .maybeSingle();
    if (source.error || source.data?.element_type !== "STICKY")
      throw { code: "22023" };
  }
  const reference = entityReferenceSchema.parse(
    await provider.create(context, result.data),
  );
  if (
    reference.organizationId !== context.organizationId ||
    reference.entityId !== result.data.entity_id ||
    reference.entityType !== value.entityType ||
    reference.sourcePlugin !== provider.metadata.sourcePlugin
  )
    throw Error("Invalid creation result");
  return { reference, cardId: result.data.card_id, attemptId: result.data.id };
}

/** Authorize new/changed references at every normal Board write boundary. */
export async function validateNativeCardChanges(input: {
  organizationId: string;
  boardId: string;
  rows: {
    id?: string;
    element_type: string;
    content: Record<string, unknown>;
  }[];
}) {
  const cards = input.rows.filter((row) => row.element_type === "ENTITY_CARD");
  if (!cards.length) return;
  const db = await createServerSupabaseClient();
  const ids = cards.flatMap((row) => (row.id ? [row.id] : [])),
    existing = ids.length
      ? await db
          .from("board_elements")
          .select("id,content")
          .eq("organization_id", input.organizationId)
          .eq("board_id", input.boardId)
          .in("id", ids)
      : null;
  if (existing?.error) throw existing.error;
  const previous = new Map(
    (existing?.data ?? []).map((row) => [
      row.id,
      entityReferenceKey(entityReferenceSchema.parse(row.content.reference)),
    ]),
  );
  const refs = cards
    .map((row) => ({
      row,
      ref: entityReferenceSchema.parse(row.content.reference),
    }))
    .filter(
      ({ row, ref }) =>
        !row.id || previous.get(row.id) !== entityReferenceKey(ref),
    )
    .map(({ ref }) => ref);
  if (!refs.length) return;
  const { context, registry } = await boardEntityContext(input, true);
  for (let at = 0; at < refs.length; at += 50)
    if (
      (await registry.resolve(context, refs.slice(at, at + 50))).some(
        (row) => row.status !== "available",
      )
    )
      throw { code: "42501" };
}
export const parseSelectedEntityId = (value: unknown) =>
  z.uuid().safeParse(value).success ? String(value) : undefined;
