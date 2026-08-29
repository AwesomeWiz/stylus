"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { AIError } from "@/modules/ai/errors";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

import { assertCanMutateMarketing } from "./authorization";
import { runStrategicReview } from "./server/strategic-review-orchestrator";
import {
  strategicReviewRequestSchema,
  type StrategicReviewActionState,
} from "./strategic-review";

export async function runStrategicReviewAction(
  _state: StrategicReviewActionState,
  form: FormData,
): Promise<StrategicReviewActionState> {
  try {
    const parsed = strategicReviewRequestSchema.parse({
      idempotencyKey: form.get("idempotencyKey"),
      sourceReelBriefVersionId: form.get("sourceReelBriefVersionId"),
    });
    const current = await getCurrentOrganizationContext();
    if (!current) throw new Error("not_authorized");
    assertCanMutateMarketing(current.membership.role);
    const result = await runStrategicReview({
      actorId: current.user.id,
      idempotencyKey: parsed.idempotencyKey,
      organizationId: current.organization.id,
      sourceReelBriefVersionId: parsed.sourceReelBriefVersionId,
    });
    revalidatePath("/apps/marketing/creative-studio");
    return {
      message: result.duplicate
        ? "This strategic review request was already received."
        : "Strategic Council Review created.",
      runId: result.runId,
      status: "success",
    };
  } catch (error) {
    unstable_rethrow(error);
    return {
      message:
        error instanceof AIError
          ? error.message
          : "Strategic review could not complete this run.",
      status: "error",
    };
  }
}
