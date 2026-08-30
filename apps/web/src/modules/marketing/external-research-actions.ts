"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { createServiceSupabaseClient } from "@/lib/supabase/service";
import {
  isHostedServerlessExecutionEnabled,
  runOneHostedServerlessJob,
} from "@/modules/jobs/server/hosted-serverless-execution";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

import { assertCanMutateMarketing } from "./authorization";
import {
  externalResearchRequestSchema,
  type ExternalResearchActionState,
} from "./external-research";

const enqueueResultSchema = z
  .object({
    duplicate: z.boolean(),
    jobId: z.uuid(),
    runId: z.uuid(),
  })
  .strict();

export async function enqueueExternalResearchAction(
  _state: ExternalResearchActionState,
  form: FormData,
): Promise<ExternalResearchActionState> {
  try {
    const request = externalResearchRequestSchema.parse({
      hackerNewsStream: form.get("hackerNewsStream") || null,
      objective: form.get("objective"),
      queryTerms: form
        .getAll("queryTerm")
        .map(String)
        .map((term) => term.trim())
        .filter(Boolean),
      question: form.get("question"),
      rssFeedUrls: form
        .getAll("rssFeedUrl")
        .map(String)
        .map((url) => url.trim())
        .filter(Boolean),
    });
    const invocationKey = String(form.get("invocationKey") ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(invocationKey))
      throw new Error("invalid_request");
    const current = await getCurrentOrganizationContext();
    if (!current) throw new Error("not_authorized");
    assertCanMutateMarketing(current.membership.role);
    const { data, error } = await createServiceSupabaseClient().rpc(
      "enqueue_marketing_external_research",
      {
        p_actor_id: current.user.id,
        p_invocation_key: invocationKey,
        p_organization_id: current.organization.id,
        p_request_snapshot: request,
      },
    );
    if (error || !data) throw new Error("enqueue_failed");
    const result = enqueueResultSchema.parse(data);
    if (isHostedServerlessExecutionEnabled()) {
      after(async () => {
        try {
          await runOneHostedServerlessJob("immediate", result.jobId);
        } catch {
          // The durable queued job remains authoritative. Daily Cron can recover
          // work when the immediate serverless invocation cannot start.
        }
      });
    }
    revalidatePath("/apps/marketing/research");
    return {
      message: result.duplicate
        ? "This research request was already received."
        : "External research queued.",
      runId: result.runId,
      status: "success",
    };
  } catch (error) {
    unstable_rethrow(error);
    return {
      message:
        "External research could not be queued. Check the bounded source inputs and try again.",
      status: "error",
    };
  }
}
