"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { AIError } from "@/modules/ai/errors";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

import { assertCanMutateMarketing } from "./authorization";
import {
  creativeCouncilRequestSchema,
  type CreativeCouncilActionState,
} from "./creative-council";
import { runCreativeCouncil } from "./server/creative-council-orchestrator";

export async function runCreativeCouncilAction(
  _state: CreativeCouncilActionState,
  form: FormData,
): Promise<CreativeCouncilActionState> {
  try {
    const parsed = creativeCouncilRequestSchema.parse({
      idempotencyKey: form.get("idempotencyKey"),
      selectedAnalysisIds: form.getAll("selectedAnalysisId"),
      sourceReelIdeaId: form.get("sourceReelIdeaId"),
    });
    const current = await getCurrentOrganizationContext();
    if (!current) throw new Error("not_authorized");
    assertCanMutateMarketing(current.membership.role);
    const result = await runCreativeCouncil({
      actorId: current.user.id,
      idempotencyKey: parsed.idempotencyKey,
      organizationId: current.organization.id,
      selectedAnalysisIds: parsed.selectedAnalysisIds,
      sourceReelIdeaId: parsed.sourceReelIdeaId,
    });
    revalidatePath("/apps/marketing/creative-studio");
    return {
      message: result.duplicate
        ? "This Creative Council request was already received."
        : "Reel Brief generated.",
      runId: result.runId,
      status: "success",
    };
  } catch (error) {
    unstable_rethrow(error);
    return {
      message:
        error instanceof AIError
          ? error.message
          : "Creative Council could not complete this run.",
      status: "error",
    };
  }
}
