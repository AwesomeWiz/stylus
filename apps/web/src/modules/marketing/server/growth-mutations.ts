import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";
import { assertCanMutateMarketing } from "../authorization";
import { growthMutationSchema } from "../growth";
import { invalidateMarketingRecord } from "./invalidation";

export async function mutateGrowth(input: unknown) {
  const value = growthMutationSchema.parse(input);
  const { context } = await requireEnabledPlugin("marketing");
  assertCanMutateMarketing(context.membership.role);
  const db = await createServerSupabaseClient(),
    org = context.organization.id;
  const result = await (async () => {
    switch (value.operation) {
      case "hypothesis":
        return db.rpc("save_marketing_hypothesis", {
          p_organization_id: org,
          p_id: value.id,
          p_fields: value.fields,
          p_expected_updated_at: value.revision,
          p_source: value.source ?? null,
        });
      case "experiment":
        return db.rpc("save_marketing_experiment", {
          p_organization_id: org,
          p_id: value.id,
          p_fields: value.fields,
          p_expected_updated_at: value.revision,
        });
      case "learning":
        return db.rpc("save_marketing_learning", {
          p_organization_id: org,
          p_id: value.id,
          p_experiment_id: value.experimentId,
          p_title: value.fields.title,
          p_conclusion: value.fields.conclusion,
          p_confidence: value.fields.confidence,
          p_archived: value.fields.archived,
          p_expected_updated_at: value.revision,
        });
      case "source":
        return db.rpc("link_marketing_hypothesis_source", {
          p_organization_id: org,
          p_hypothesis_id: value.hypothesisId,
          p_source: value.source,
          p_archived: value.archived,
        });
      case "link":
        return db.rpc("link_marketing_experiment", {
          p_organization_id: org,
          p_experiment_id: value.experimentId,
          p_kind: value.kind,
          p_target_id: value.targetId,
          p_archived: value.archived,
        });
      case "evaluate":
        return db.rpc("evaluate_marketing_experiment", {
          p_organization_id: org,
          p_experiment_id: value.experimentId,
          p_outcome: value.outcome,
          p_result_summary: value.resultSummary,
          p_expected_updated_at: value.revision,
          p_learning: value.learning,
          p_update_hypothesis: value.updateHypothesis,
        });
      case "promote":
        return db.rpc("promote_marketing_learning", {
          p_organization_id: org,
          p_learning_id: value.learningId,
          p_kind: value.kind,
          p_title: value.title,
          p_content: value.content,
        });
    }
  })();
  if (result.error) throw result.error;
  for (const route of ["hypotheses", "experiments", "learn"])
    invalidateMarketingRecord("/apps/marketing/" + route);
  if (value.operation === "promote") {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/memory");
  }
  return { id: result.data, operation: value.operation };
}
