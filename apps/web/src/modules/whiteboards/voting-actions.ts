"use server";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { assertCanMutateWhiteboards } from "./authorization";
import {
  startVotingSchema,
  voteSchema,
  readVotingSchema,
  votingScopeSchema,
  votingSnapshotSchema,
  votingError,
} from "./voting";

async function context(
  input: z.infer<typeof votingScopeSchema>,
  mutate: boolean,
) {
  const current = await getCurrentOrganizationContext();
  if (!current || current.organization.id !== input.organizationId)
    throw { code: "42501" };
  if (mutate) assertCanMutateWhiteboards(current.membership.role);
  const supabase = await createServerSupabaseClient();
  const board = await supabase
    .from("boards")
    .select("id")
    .eq("id", input.boardId)
    .eq("organization_id", current.organization.id)
    .is("archived_at", null)
    .maybeSingle();
  if (board.error || !board.data) throw { code: "42501" };
  return supabase;
}
function failure(error: unknown) {
  unstable_rethrow(error);
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : undefined;
  return {
    status: "error",
    message: votingError(code),
    code: code === "42501" ? "ACCESS" : "RETRY",
  } as const;
}
export async function startBoardVotingAction(input: unknown) {
  try {
    const parsed = startVotingSchema.parse(input),
      supabase = await context(parsed, true);
    const result = await supabase.rpc("start_board_voting", {
      p_board_id: parsed.boardId,
      p_allowance: parsed.allowance,
      p_eligible_types: parsed.types,
    });
    if (result.error) throw result.error;
    return { status: "success", data: result.data } as const;
  } catch (error) {
    return failure(error);
  }
}
export async function setBoardVoteAction(input: unknown) {
  try {
    const parsed = voteSchema.parse(input),
      supabase = await context(parsed, true);
    const session = await supabase
      .from("board_voting_sessions")
      .select("id")
      .eq("id", parsed.sessionId)
      .eq("board_id", parsed.boardId)
      .eq("organization_id", parsed.organizationId)
      .maybeSingle();
    if (session.error || !session.data) throw { code: "42501" };
    const result = await supabase.rpc("set_board_vote", {
      p_session_id: parsed.sessionId,
      p_element_id: parsed.elementId,
      p_slot: parsed.slot,
      p_active: parsed.active,
      p_request_id: parsed.requestId,
      p_expected_version: parsed.expectedVersion,
    });
    if (result.error) throw result.error;
    return { status: "success", data: result.data } as const;
  } catch (error) {
    return failure(error);
  }
}
export async function endBoardVotingAction(input: unknown) {
  try {
    const parsed = votingScopeSchema
        .extend({ sessionId: z.uuid() })
        .parse(input),
      supabase = await context(parsed, true);
    const session = await supabase
      .from("board_voting_sessions")
      .select("id")
      .eq("id", parsed.sessionId)
      .eq("board_id", parsed.boardId)
      .eq("organization_id", parsed.organizationId)
      .maybeSingle();
    if (session.error || !session.data) throw { code: "42501" };
    const result = await supabase.rpc("end_board_voting", {
      p_session_id: parsed.sessionId,
    });
    if (result.error) throw result.error;
    return { status: "success", data: result.data } as const;
  } catch (error) {
    return failure(error);
  }
}
export async function readBoardVotingAction(input: unknown) {
  try {
    const parsed = readVotingSchema.parse(input),
      supabase = await context(parsed, false);
    const result = await supabase.rpc("read_board_voting", {
      p_board_id: parsed.boardId,
      p_element_ids: parsed.ids,
      ...(parsed.after
        ? { p_after_total: parsed.after.total, p_after_id: parsed.after.id }
        : {}),
    });
    if (result.error) throw result.error;
    const data = votingSnapshotSchema.parse(result.data);
    if (
      data.session &&
      (data.session.board_id !== parsed.boardId ||
        data.session.organization_id !== parsed.organizationId)
    )
      throw { code: "42501" };
    return { status: "success", data } as const;
  } catch (error) {
    return failure(error);
  }
}
