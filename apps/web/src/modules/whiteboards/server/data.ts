import "server-only";
import { cache } from "react";

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
  if (error) throw new Error("Boards could not be loaded.");
  return data ?? [];
}

/** Request-scoped only: metadata and page share the same tenant/RLS-checked row. */
export const getBoardRecord = cache(
  async (organizationId: string, boardId: string) => {
    const supabase = await createServerSupabaseClient();
    const boardResult = await supabase
      .from("boards")
      .select("*")
      .eq("id", boardId)
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .maybeSingle();
    if (boardResult.error) throw new Error("The board could not be loaded.");
    return boardResult.data;
  },
);

export async function getBoardEditorData(
  organizationId: string,
  boardId: string,
): Promise<BoardEditorData | null> {
  const board = await getBoardRecord(organizationId, boardId);
  if (!board) return null;
  const supabase = await createServerSupabaseClient();
  async function readElements() {
    const result: BoardElementRow[] = [];
    let afterId: string | null = null;
    for (;;) {
      let query = supabase
        .from("board_elements")
        .select("*")
        .eq("board_id", boardId)
        .eq("organization_id", organizationId)
        .is("archived_at", null)
        .order("id");
      if (afterId) query = query.gt("id", afterId);
      const page = await query.limit(1000);
      if (page.error) throw new Error("Board objects could not load.");
      result.push(...(page.data ?? []));
      if ((page.data?.length ?? 0) < 1000)
        return result.sort(
          (a, b) => a.z_index - b.z_index || a.id.localeCompare(b.id),
        );
      afterId = page.data!.at(-1)!.id;
    }
  }
  const [elements, members] = await Promise.all([
    readElements(),
    supabase.rpc("list_organization_task_members", {
      p_organization_id: organizationId,
    }),
  ]);
  if (members.error) throw new Error("Board members could not load.");
  return {
    board,
    elements,
    members: members.data ?? [],
    comments: [],
    imageUrls: {},
  };
}
