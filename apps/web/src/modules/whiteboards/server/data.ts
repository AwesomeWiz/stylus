import "server-only";

import type {
  BoardCommentRow,
  BoardElementRow,
  BoardRow,
  TaskMember,
} from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface BoardEditorData {
  board: BoardRow;
  comments: BoardCommentRow[];
  elements: BoardElementRow[];
  imageUrls: Record<string, string>;
  members: TaskMember[];
}

export async function getBoards(organizationId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw new Error("Whiteboards could not be loaded.");
  return data ?? [];
}

export async function getBoardEditorData(
  organizationId: string,
  boardId: string,
): Promise<BoardEditorData | null> {
  const supabase = await createServerSupabaseClient();
  const [boardResult, commentsResult, elementsResult, membersResult] =
    await Promise.all([
      supabase
        .from("boards")
        .select("*")
        .eq("id", boardId)
        .eq("organization_id", organizationId)
        .is("archived_at", null)
        .maybeSingle(),
      supabase
        .from("board_comments")
        .select("*")
        .eq("board_id", boardId)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(200),
      supabase
        .from("board_elements")
        .select("*")
        .eq("board_id", boardId)
        .eq("organization_id", organizationId)
        .is("archived_at", null)
        .order("z_index", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase.rpc("list_organization_task_members", {
        p_organization_id: organizationId,
      }),
    ]);
  if (
    boardResult.error ||
    commentsResult.error ||
    elementsResult.error ||
    membersResult.error
  ) {
    throw new Error("The whiteboard could not be loaded.");
  }
  if (!boardResult.data) return null;

  const elements = elementsResult.data ?? [];
  const imageEntries = await Promise.all(
    elements
      .filter((element) => element.element_type === "IMAGE")
      .map(async (element) => {
        const storagePath = element.metadata.storagePath;
        if (typeof storagePath !== "string") return null;
        const { data, error } = await supabase.storage
          .from("board-images")
          .createSignedUrl(storagePath, 3600);
        return !error && data ? ([element.id, data.signedUrl] as const) : null;
      }),
  );

  return {
    board: boardResult.data,
    comments: commentsResult.data ?? [],
    elements,
    imageUrls: Object.fromEntries(
      imageEntries.filter((entry) => entry !== null),
    ),
    members: membersResult.data ?? [],
  };
}
