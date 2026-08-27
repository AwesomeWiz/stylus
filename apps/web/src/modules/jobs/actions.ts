"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

import { canRetryJob } from "./authorization";
import { jobIdSchema, type JobActionState } from "./schemas";
import { enqueueRegisteredJob } from "./server/enqueue";
import { applicationJobRegistry } from "./server/registry";

function failure(
  message = "The job operation could not be completed.",
): JobActionState {
  return { message, status: "error" };
}

export async function enqueueExampleJobAction(
  _state: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  void _state;
  const scheduled = formData.get("schedule") === "later";
  try {
    const bucket = Math.floor(Date.now() / 300_000);
    const job = await enqueueRegisteredJob({
      idempotencyKey: `diagnostic-${scheduled ? "scheduled" : "now"}-${bucket}`,
      input: { message: "Stylus job infrastructure check" },
      jobType: "core.test.echo",
      scheduledAt: scheduled ? new Date(Date.now() + 5 * 60_000) : undefined,
    });
    revalidatePath("/jobs");
    return {
      jobId: job.id,
      message: scheduled ? "Example job scheduled." : "Example job queued.",
      status: "success",
    };
  } catch {
    return failure("The example job could not be queued.");
  }
}

export async function enqueueWorkerExampleJobAction(
  _state: JobActionState,
): Promise<JobActionState> {
  void _state;
  try {
    const bucket = Math.floor(Date.now() / 300_000);
    const job = await enqueueRegisteredJob({
      idempotencyKey: `worker-diagnostic-${bucket}`,
      input: { message: "Stylus worker check" },
      jobType: "core.test.worker-echo",
    });
    revalidatePath("/jobs");
    return { jobId: job.id, message: "Worker test queued.", status: "success" };
  } catch {
    return failure("The worker test could not be queued.");
  }
}

export async function cancelJobAction(
  _state: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  void _state;
  const parsed = jobIdSchema.safeParse(formData.get("jobId"));
  if (!parsed.success) return failure();
  try {
    const context = await getCurrentOrganizationContext();
    if (!context) return failure("Job cancellation is not permitted.");
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("request_job_cancellation", {
      p_job_id: parsed.data,
      p_organization_id: context.organization.id,
    });
    if (error) return failure("Job cancellation is not permitted.");
    revalidatePath("/jobs");
    return { message: "Cancellation requested.", status: "success" };
  } catch {
    return failure("Job cancellation is not permitted.");
  }
}

export async function retryJobAction(
  _state: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  void _state;
  const parsed = jobIdSchema.safeParse(formData.get("jobId"));
  if (!parsed.success) return failure();
  try {
    const context = await getCurrentOrganizationContext();
    if (!context || !canRetryJob(context.membership.role))
      return failure("Job retry is not permitted.");
    const supabase = await createServerSupabaseClient();
    const { data: source, error: sourceError } = await supabase
      .from("jobs")
      .select("job_type")
      .eq("organization_id", context.organization.id)
      .eq("id", parsed.data)
      .maybeSingle();
    if (sourceError || !source || !applicationJobRegistry.get(source.job_type))
      return failure("Job retry is not permitted.");
    const { data, error } = await supabase.rpc("retry_job", {
      p_job_id: parsed.data,
      p_organization_id: context.organization.id,
    });
    if (error || !data) return failure("Job retry is not permitted.");
    revalidatePath("/jobs");
    return {
      jobId: data.id,
      message: "A retry job was queued.",
      status: "success",
    };
  } catch {
    return failure("Job retry is not permitted.");
  }
}
