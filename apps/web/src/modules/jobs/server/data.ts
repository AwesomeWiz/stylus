import "server-only";

import { cache } from "react";

import type { JobRow } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type JobSummary = Omit<JobRow, "input_metadata" | "result_metadata"> & {
  has_result: boolean;
};

export const getOrganizationJobs = cache(
  async (organizationId: string): Promise<JobSummary[]> => {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("jobs")
      .select(
        "attempt_count, cancellation_requested_at, cancelled_at, capability, claimant_id, completed_at, concurrency_group, created_at, created_by, duration_ms, error_category, execution_class, heartbeat_at, id, idempotency_key, job_type, lease_expires_at, max_attempts, next_attempt_at, organization_id, parent_job_id, plugin_id, priority, progress, progress_message, progress_updated_at, scheduled_at, started_at, status, timeout_seconds, result_metadata",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Job history could not be loaded");
    return (data ?? []).map(({ result_metadata, ...job }) => ({
      ...job,
      has_result: result_metadata !== null,
    }));
  },
);
