import "server-only";

import type { JobErrorCategory } from "@/core/jobs/public";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

import type { ClaimedJob, JobExecutionStore } from "./executor";

export class SupabaseServerlessJobExecutionStore implements JobExecutionStore {
  private readonly service = createServiceSupabaseClient();

  constructor(private readonly targetJobId?: string) {}

  async claim(executorId: string): Promise<ClaimedJob | null> {
    const { data, error } = this.targetJobId
      ? await this.service.rpc("claim_serverless_job", {
          p_executor_id: executorId,
          p_job_id: this.targetJobId,
          p_lease_seconds: 120,
        })
      : await this.service.rpc("claim_next_job", {
          p_execution_class: "SERVERLESS",
          p_executor_id: executorId,
          p_lease_seconds: 120,
        });
    if (error) throw new Error("Serverless job claim failed");
    if (!data) return null;
    return {
      actorId: data.created_by,
      attempt: data.attempt_count,
      input: data.input_metadata,
      jobId: data.id,
      jobType: data.job_type,
      organizationId: data.organization_id,
      origin: data.plugin_id
        ? { kind: "plugin", pluginId: data.plugin_id }
        : { kind: "core" },
    };
  }

  async complete(jobId: string, executorId: string, result: unknown) {
    const { error } = await this.service.rpc("complete_job", {
      p_executor_id: executorId,
      p_job_id: jobId,
      p_result_metadata: result as Record<string, unknown>,
    });
    if (error) throw new Error("Serverless job completion failed");
  }

  async fail(input: {
    category: JobErrorCategory;
    executorId: string;
    jobId: string;
    retryable: boolean;
  }) {
    const { error } = await this.service.rpc("report_job_failure", {
      p_error_category: input.category,
      p_executor_id: input.executorId,
      p_job_id: input.jobId,
      p_retryable: input.retryable,
    });
    if (error) throw new Error("Serverless job failure transition failed");
  }

  async heartbeat(jobId: string, executorId: string) {
    const { error } = await this.service.rpc("heartbeat_job", {
      p_executor_id: executorId,
      p_job_id: jobId,
      p_lease_seconds: 120,
    });
    if (error) throw new Error("Serverless job heartbeat failed");
  }

  async isCancellationRequested(jobId: string, executorId: string) {
    const { data, error } = await this.service
      .from("jobs")
      .select("cancellation_requested_at, claimant_id, status")
      .eq("id", jobId)
      .maybeSingle();
    if (error || !data || data.claimant_id !== executorId)
      throw new Error("Active serverless job not found");
    return Boolean(data.cancellation_requested_at) || data.status !== "RUNNING";
  }

  async progress(
    jobId: string,
    executorId: string,
    progress: number,
    message: string,
  ) {
    const { error } = await this.service.rpc("report_job_progress", {
      p_executor_id: executorId,
      p_job_id: jobId,
      p_message: message,
      p_progress: progress,
    });
    if (error) throw new Error("Serverless job progress failed");
  }
}
