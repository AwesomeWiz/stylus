import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  entityReferenceKey,
  entitySearchPattern,
  type EntityContext,
  type EntityProvider,
  type EntityProjection,
  type EntityReference,
} from "@/core/entities/public";
import type { CoreNoteRow } from "@/lib/supabase/database.types";
const reference = (
  organizationId: string,
  entityId: string,
): EntityReference => ({ entityType: "core.note", organizationId, entityId });
const project = (
  row: Pick<CoreNoteRow, "id" | "title" | "updated_at" | "archived_at">,
): EntityProjection => ({
  title: row.title,
  archived: !!row.archived_at,
  href: `/notes?note=${row.id}${row.archived_at ? "&archived=true" : ""}`,
  details: [{ label: "Updated", value: row.updated_at, kind: "date" }],
});
const columns = "id,title,updated_at,archived_at";
export const noteEntityProvider: EntityProvider = {
  metadata: {
    id: "core.note",
    label: "Note",
    icon: "note",
    binding: "live",
    routePrefix: "/notes",
  },
  async resolve(context: EntityContext, refs: readonly EntityReference[]) {
    const db = await createServerSupabaseClient(),
      result = await db
        .from("notes")
        .select(columns)
        .eq("organization_id", context.organizationId)
        .in(
          "id",
          refs.map((r) => r.entityId),
        );
    if (result.error) throw result.error;
    return new Map(
      (result.data ?? []).map((row) => [
        entityReferenceKey(reference(context.organizationId, row.id)),
        project(row),
      ]),
    );
  },
  async search(context, query, cursor) {
    const db = await createServerSupabaseClient();
    let request = db
      .from("notes")
      .select(columns)
      .eq("organization_id", context.organizationId)
      .is("archived_at", null)
      .ilike("title", entitySearchPattern(query))
      .order("id")
      .limit(26);
    if (cursor) request = request.gt("id", cursor);
    const result = await request;
    if (result.error) throw result.error;
    const rows = (result.data ?? []).slice(0, 25);
    return {
      items: rows.map((row) => ({
        reference: reference(context.organizationId, row.id),
        projection: project(row),
        status: "available" as const,
      })),
      hasMore: (result.data?.length ?? 0) > 25,
    };
  },
};
