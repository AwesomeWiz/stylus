"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import type {
  BoardCommentRow,
  BoardElementRow,
  BoardRow,
} from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

import { assertCanMutateWhiteboards } from "./authorization";
import {
  boardIdSchema,
  boardImageSchema,
  boardTitleSchema,
  commentIdSchema,
  createBoardCommentSchema,
  createElementSchema,
  elementIdSchema,
  type CreateElementInput,
  type CreateBoardCommentInput,
  type UpdateElementInput,
  updateElementSchema,
} from "./schemas";

export type WhiteboardActionResult<T = undefined> =
  { data: T; status: "success" } | { message: string; status: "error" };

async function mutationContext() {
  const current = await getCurrentOrganizationContext();
  if (!current) redirect("/organization/new");
  assertCanMutateWhiteboards(current.membership.role);
  return current;
}

function actionError(error: unknown, fallback: string) {
  unstable_rethrow(error);
  if (error && typeof error === "object" && "issues" in error) {
    const issue = (error as { issues?: { message?: string }[] }).issues?.[0];
    if (issue?.message) return issue.message;
  }
  return fallback;
}

export async function createBoardAction(
  title: string,
): Promise<WhiteboardActionResult<BoardRow>> {
  try {
    const parsedTitle = boardTitleSchema.parse(title);
    const current = await mutationContext();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("boards")
      .insert({
        created_by: current.user.id,
        organization_id: current.organization.id,
        title: parsedTitle,
        updated_by: current.user.id,
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/whiteboards");
    return { data, status: "success" };
  } catch (error) {
    return {
      message: actionError(
        error,
        "The board could not be created. Please try again.",
      ),
      status: "error",
    };
  }
}

export async function renameBoardAction(
  boardId: string,
  title: string,
): Promise<WhiteboardActionResult<BoardRow>> {
  try {
    const parsedId = boardIdSchema.parse(boardId);
    const parsedTitle = boardTitleSchema.parse(title);
    const current = await mutationContext();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("boards")
      .update({ title: parsedTitle, updated_by: current.user.id })
      .eq("id", parsedId)
      .eq("organization_id", current.organization.id)
      .is("archived_at", null)
      .select("*")
      .maybeSingle();
    if (error || !data) throw error ?? new Error("Board not found");
    revalidatePath("/whiteboards");
    revalidatePath(`/whiteboards/${parsedId}`);
    return { data, status: "success" };
  } catch (error) {
    return {
      message: actionError(
        error,
        "The board could not be renamed. Please try again.",
      ),
      status: "error",
    };
  }
}

export async function archiveBoardAction(
  boardId: string,
): Promise<WhiteboardActionResult> {
  try {
    const parsedId = boardIdSchema.parse(boardId);
    const current = await mutationContext();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("boards")
      .update({
        archived_at: new Date().toISOString(),
        updated_by: current.user.id,
      })
      .eq("id", parsedId)
      .eq("organization_id", current.organization.id)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();
    if (error || !data) throw error ?? new Error("Board not found");
    revalidatePath("/whiteboards");
    return { data: undefined, status: "success" };
  } catch (error) {
    return {
      message: actionError(
        error,
        "The board could not be archived. Please try again.",
      ),
      status: "error",
    };
  }
}

export async function createBoardElementAction(
  input: CreateElementInput,
): Promise<WhiteboardActionResult<BoardElementRow>> {
  try {
    const parsed = createElementSchema.parse(input);
    const current = await mutationContext();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("board_elements")
      .insert({
        board_id: parsed.boardId,
        content: parsed.content,
        created_by: current.user.id,
        element_type: parsed.elementType,
        height: parsed.height,
        metadata: parsed.metadata,
        organization_id: current.organization.id,
        rotation: parsed.rotation,
        style: parsed.style,
        updated_by: current.user.id,
        width: parsed.width,
        x: parsed.x,
        y: parsed.y,
        z_index: parsed.zIndex,
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath(`/whiteboards/${parsed.boardId}`);
    return { data, status: "success" };
  } catch (error) {
    return {
      message: actionError(
        error,
        "The element could not be added. Please try again.",
      ),
      status: "error",
    };
  }
}

export async function updateBoardElementAction(
  input: UpdateElementInput,
): Promise<WhiteboardActionResult<BoardElementRow>> {
  try {
    const parsed = updateElementSchema.parse(input);
    const current = await mutationContext();
    const supabase = await createServerSupabaseClient();
    const { elementId, ...changes } = parsed;
    const { data, error } = await supabase
      .from("board_elements")
      .update({
        ...(changes.content === undefined ? {} : { content: changes.content }),
        ...(changes.height === undefined ? {} : { height: changes.height }),
        ...(changes.metadata === undefined
          ? {}
          : { metadata: changes.metadata }),
        ...(changes.rotation === undefined
          ? {}
          : { rotation: changes.rotation }),
        ...(changes.style === undefined ? {} : { style: changes.style }),
        ...(changes.width === undefined ? {} : { width: changes.width }),
        ...(changes.x === undefined ? {} : { x: changes.x }),
        ...(changes.y === undefined ? {} : { y: changes.y }),
        ...(changes.zIndex === undefined ? {} : { z_index: changes.zIndex }),
        updated_by: current.user.id,
      })
      .eq("id", elementId)
      .eq("organization_id", current.organization.id)
      .is("archived_at", null)
      .select("*")
      .maybeSingle();
    if (error || !data) throw error ?? new Error("Element not found");
    revalidatePath(`/whiteboards/${data.board_id}`);
    return { data, status: "success" };
  } catch (error) {
    return {
      message: actionError(
        error,
        "The change could not be saved. Please try again.",
      ),
      status: "error",
    };
  }
}

export async function archiveBoardElementAction(
  elementId: string,
): Promise<WhiteboardActionResult<BoardElementRow>> {
  try {
    const parsedId = elementIdSchema.parse(elementId);
    const current = await mutationContext();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("board_elements")
      .update({
        archived_at: new Date().toISOString(),
        updated_by: current.user.id,
      })
      .eq("id", parsedId)
      .eq("organization_id", current.organization.id)
      .is("archived_at", null)
      .select("*")
      .maybeSingle();
    if (error || !data) throw error ?? new Error("Element not found");
    revalidatePath(`/whiteboards/${data.board_id}`);
    return { data, status: "success" };
  } catch (error) {
    return {
      message: actionError(
        error,
        "The element could not be removed. Please try again.",
      ),
      status: "error",
    };
  }
}

export async function restoreBoardElementAction(
  elementId: string,
): Promise<WhiteboardActionResult<BoardElementRow>> {
  try {
    const parsedId = elementIdSchema.parse(elementId);
    const current = await mutationContext();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("board_elements")
      .update({ archived_at: null, updated_by: current.user.id })
      .eq("id", parsedId)
      .eq("organization_id", current.organization.id)
      .not("archived_at", "is", null)
      .select("*")
      .maybeSingle();
    if (error || !data) throw error ?? new Error("Element not found");
    revalidatePath(`/whiteboards/${data.board_id}`);
    return { data, status: "success" };
  } catch (error) {
    return {
      message: actionError(
        error,
        "The element could not be restored. Please try again.",
      ),
      status: "error",
    };
  }
}

export async function uploadBoardImageAction(
  formData: FormData,
): Promise<
  WhiteboardActionResult<{ element: BoardElementRow; signedUrl: string }>
> {
  let uploadedPath: string | null = null;
  try {
    const parsed = boardImageSchema.parse({
      boardId: formData.get("boardId"),
      file: formData.get("file"),
      height: Number(formData.get("height")),
      width: Number(formData.get("width")),
      x: Number(formData.get("x")),
      y: Number(formData.get("y")),
      zIndex: Number(formData.get("zIndex")),
    });
    const current = await mutationContext();
    const supabase = await createServerSupabaseClient();
    const extension = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    }[parsed.file.type];
    uploadedPath = `${current.organization.id}/${parsed.boardId}/${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage
      .from("board-images")
      .upload(uploadedPath, parsed.file, {
        cacheControl: "3600",
        contentType: parsed.file.type,
        upsert: false,
      });
    if (upload.error) throw upload.error;
    const elementResult = await createBoardElementAction({
      boardId: parsed.boardId,
      content: { alt: parsed.file.name.replace(/\.[^.]+$/, "") },
      elementType: "IMAGE",
      height: parsed.height,
      metadata: {
        mimeType: parsed.file.type,
        originalName: parsed.file.name,
        storagePath: uploadedPath,
      },
      rotation: 0,
      style: { objectFit: "contain" },
      width: parsed.width,
      x: parsed.x,
      y: parsed.y,
      zIndex: parsed.zIndex,
    });
    if (elementResult.status === "error")
      throw new Error(elementResult.message);
    const signed = await supabase.storage
      .from("board-images")
      .createSignedUrl(uploadedPath, 3600);
    if (signed.error) throw signed.error;
    return {
      data: { element: elementResult.data, signedUrl: signed.data.signedUrl },
      status: "success",
    };
  } catch (error) {
    if (uploadedPath) {
      const supabase = await createServerSupabaseClient();
      await supabase.storage.from("board-images").remove([uploadedPath]);
    }
    return {
      message: actionError(
        error,
        "The image could not be uploaded. Please try again.",
      ),
      status: "error",
    };
  }
}

export async function createBoardCommentAction(
  input: CreateBoardCommentInput,
): Promise<WhiteboardActionResult<BoardCommentRow>> {
  try {
    const parsed = createBoardCommentSchema.parse(input);
    await mutationContext();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("create_board_comment", {
      p_board_id: parsed.boardId,
      p_body: parsed.body,
      p_element_id: parsed.elementId,
      p_mentioned_user_ids: [...new Set(parsed.mentionedUserIds)],
      p_parent_id: parsed.parentId,
    });
    if (error || !data) throw error ?? new Error("Comment not created");
    revalidatePath(`/whiteboards/${parsed.boardId}`);
    revalidatePath("/activity");
    revalidatePath("/", "layout");
    return { data, status: "success" };
  } catch (error) {
    return {
      message: actionError(
        error,
        "The comment could not be added. Please try again.",
      ),
      status: "error",
    };
  }
}

export async function archiveBoardCommentAction(
  commentId: string,
): Promise<WhiteboardActionResult<BoardCommentRow>> {
  try {
    const parsedId = commentIdSchema.parse(commentId);
    await mutationContext();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("archive_board_comment", {
      p_comment_id: parsedId,
    });
    if (error || !data) throw error ?? new Error("Comment not found");
    revalidatePath(`/whiteboards/${data.board_id}`);
    return { data, status: "success" };
  } catch (error) {
    return {
      message: actionError(
        error,
        "The comment could not be removed. Please try again.",
      ),
      status: "error",
    };
  }
}
