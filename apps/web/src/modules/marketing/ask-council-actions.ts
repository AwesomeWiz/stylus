"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AIError } from "@/modules/ai/errors";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

import {
  askCouncilRequestSchema,
  type AskCouncilActionState,
} from "./ask-council";
import { assertCanMutateMarketing } from "./authorization";
import { runAskCouncil } from "./server/ask-council-orchestrator";

export async function askCouncilAction(
  _state: AskCouncilActionState,
  form: FormData,
): Promise<AskCouncilActionState> {
  try {
    const parsed = askCouncilRequestSchema.parse({
      conversationId: form.get("conversationId"),
      idempotencyKey: form.get("idempotencyKey"),
      intent: form.get("intent"),
      performanceLearningIds: form.getAll("performanceLearningId"),
      question: form.get("question"),
      reelBriefVersionId: form.get("reelBriefVersionId"),
      researchReportId: form.get("researchReportId"),
      strategicReviewId: form.get("strategicReviewId"),
    });
    const current = await getCurrentOrganizationContext();
    if (!current) throw new Error("not_authorized");
    assertCanMutateMarketing(current.membership.role);
    const result = await runAskCouncil({
      actorId: current.user.id,
      organizationId: current.organization.id,
      request: parsed,
    });
    revalidatePath("/apps/marketing/council");
    return {
      conversationId: result.conversationId,
      message: result.duplicate
        ? "This Ask Council request was already received."
        : "Council response completed.",
      status: "success",
      turnId: result.turnId,
    };
  } catch (error) {
    unstable_rethrow(error);
    return {
      message:
        error instanceof AIError
          ? error.message
          : "Ask Council could not complete this response.",
      status: "error",
    };
  }
}

export async function setAskCouncilConversationArchivedAction(form: FormData) {
  try {
    const conversationId = String(form.get("conversationId") ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(conversationId))
      throw new Error("invalid_conversation");
    const current = await getCurrentOrganizationContext();
    if (!current) throw new Error("not_authorized");
    assertCanMutateMarketing(current.membership.role);
    const db = await createServerSupabaseClient();
    const { error } = await db.rpc(
      "set_marketing_ask_council_conversation_archived",
      {
        p_archived: true,
        p_conversation_id: conversationId,
        p_organization_id: current.organization.id,
      },
    );
    if (error) throw new Error("archive_failed");
    revalidatePath("/apps/marketing/council");
  } catch (error) {
    unstable_rethrow(error);
    throw new Error("Ask Council conversation could not be archived.");
  }
}
