"use server";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { boardIdSchema } from "./schemas";
import { isBoardImagePath } from "./elements";

const scopeSchema = z.object({
  boardId: boardIdSchema,
  organizationId: z.uuid(),
});
async function readContext(input: unknown) {
  const parsed = scopeSchema.parse(input);
  const current = await getCurrentOrganizationContext();
  if (!current || current.organization.id !== parsed.organizationId)
    throw new Error("Unavailable");
  const supabase = await createServerSupabaseClient();
  const board = await supabase
    .from("boards")
    .select("id")
    .eq("id", parsed.boardId)
    .eq("organization_id", current.organization.id)
    .is("archived_at", null)
    .maybeSingle();
  if (board.error || !board.data) throw new Error("Unavailable");
  return {
    ...parsed,
    supabase,
    canMutate: current.membership.role !== "VIEWER",
  };
}
export async function readBoardReactionsAction(input: unknown) {
  try {
    const parsed = scopeSchema
        .extend({ ids: z.array(z.uuid()).max(200) })
        .parse(input),
      { supabase, boardId } = await readContext(parsed);
    const result = await supabase.rpc("read_board_reactions", {
      p_board_id: boardId,
      p_element_ids: parsed.ids,
    });
    if (result.error) throw result.error;
    const counts = await supabase.rpc("read_board_comment_counts", {
      p_board_id: boardId,
      p_element_ids: parsed.ids,
    });
    if (counts.error) throw counts.error;
    return {
      status: "success",
      rows: result.data ?? [],
      commentCounts: counts.data ?? [],
    } as const;
  } catch (error) {
    unstable_rethrow(error);
    return {
      status: "error",
      message: "Reactions could not load. Check access and retry.",
    } as const;
  }
}
export async function readBoardSnapshotAction(input: unknown) {
  try {
    const { boardId, organizationId, supabase, canMutate } =
      await readContext(input);
    const rows: import("@/lib/supabase/database.types").BoardElementRow[] = [];
    let cursor: string | undefined;
    for (;;) {
      let query = supabase
        .from("board_elements")
        .select("*")
        .eq("board_id", boardId)
        .eq("organization_id", organizationId)
        .is("archived_at", null)
        .order("id");
      if (cursor) query = query.gt("id", cursor);
      const page = await query.limit(1000);
      if (page.error) throw page.error;
      rows.push(...(page.data ?? []));
      if ((page.data?.length ?? 0) < 1000)
        return { status: "success", rows, canMutate } as const;
      cursor = page.data!.at(-1)!.id;
    }
  } catch (error) {
    unstable_rethrow(error);
    return {
      status: "error",
      message: "Board access could not be refreshed. Reload to check access.",
    } as const;
  }
}
export async function readBoardCommentsAction(input: unknown) {
  try {
    const parsed = scopeSchema
      .extend({
        before: z
          .object({ createdAt: z.iso.datetime({ offset: true }), id: z.uuid() })
          .optional(),
      })
      .parse(input);
    const { boardId, organizationId, supabase } = await readContext(parsed);
    let query = supabase
      .from("board_comments")
      .select("*")
      .eq("board_id", boardId)
      .eq("organization_id", organizationId);
    if (parsed.before)
      query = query.or(
        `created_at.lt.${parsed.before.createdAt},and(created_at.eq.${parsed.before.createdAt},id.lt.${parsed.before.id})`,
      );
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(201);
    if (error) throw error;
    const page = (data ?? []).slice(0, 200),
      oldest = page.at(-1);
    const missingParents = [
      ...new Set(
        page.flatMap((row) =>
          row.parent_id && !page.some((parent) => parent.id === row.parent_id)
            ? [row.parent_id]
            : [],
        ),
      ),
    ];
    let parents = [] as typeof page;
    if (missingParents.length) {
      const result = await supabase
        .from("board_comments")
        .select("*")
        .eq("board_id", boardId)
        .eq("organization_id", organizationId)
        .in("id", missingParents)
        .limit(200);
      if (result.error) throw result.error;
      parents = result.data ?? [];
    }
    return {
      status: "success",
      comments: [...page, ...parents].sort(
        (a, b) =>
          Date.parse(a.created_at) - Date.parse(b.created_at) ||
          a.id.localeCompare(b.id),
      ),
      before:
        (data?.length ?? 0) > 200 && oldest
          ? { createdAt: oldest.created_at, id: oldest.id }
          : null,
    } as const;
  } catch (error) {
    unstable_rethrow(error);
    return {
      status: "error",
      message: "Comments could not load. Check access and retry comments.",
    } as const;
  }
}

export async function readBoardImagesAction(input: unknown) {
  try {
    const parsed = scopeSchema
      .extend({ ids: z.array(z.uuid()).min(1).max(25) })
      .parse(input);
    const { supabase, boardId, organizationId } = await readContext(parsed);
    const result = await supabase
      .from("board_elements")
      .select("id,metadata,updated_at")
      .eq("board_id", boardId)
      .eq("organization_id", organizationId)
      .eq("element_type", "IMAGE")
      .is("archived_at", null)
      .in("id", parsed.ids)
      .limit(25);
    if (result.error) throw result.error;
    const images = (result.data ?? []).flatMap((row) =>
      isBoardImagePath(row.metadata.storagePath, organizationId, boardId)
        ? [{ id: row.id, path: row.metadata.storagePath }]
        : [],
    );
    if (!images.length) return { status: "success", images: [] } as const;
    const signed = await supabase.storage
      .from("board-images")
      .createSignedUrls([...new Set(images.map((row) => row.path))], 3600, {
        cacheNonce: crypto.randomUUID(),
      });
    if (signed.error) throw signed.error;
    return {
      status: "success",
      images: images.map((row) => ({
        ...row,
        url:
          signed.data.find((entry) => entry.path === row.path && !entry.error)
            ?.signedUrl ?? null,
      })),
    } as const;
  } catch (error) {
    unstable_rethrow(error);
    return {
      status: "error",
      message: "Image previews could not load. Retry previews.",
    } as const;
  }
}

export async function readBoardPreviewAction(input: unknown) {
  try {
    const { boardId, organizationId, supabase } = await readContext(input);
    const { data, error } = await supabase
      .from("board_elements")
      .select(
        "id,element_type,x,y,width,height,rotation,z_index,content,style,parent_id",
      )
      .eq("board_id", boardId)
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .order("z_index")
      .order("id")
      .limit(128);
    if (error) throw error;
    // No asset keys, signed URLs, comments or audit/private metadata in thumbnails.
    return { status: "success", rows: data ?? [] } as const;
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error" } as const;
  }
}
