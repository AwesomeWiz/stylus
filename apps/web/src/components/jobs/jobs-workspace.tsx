import { CircleCheck, CircleDashed, ServerCog } from "lucide-react";

import type { OrganizationRole } from "@/lib/supabase/database.types";
import { canCancelJob, canRetryJob } from "@/modules/jobs/authorization";
import type { JobSummary } from "@/modules/jobs/server/data";

import { PageHeader } from "../ui/page-header";
import { EnqueueExampleControls, JobLifecycleControls } from "./job-actions";

const cancellable = new Set(["QUEUED", "SCHEDULED", "RUNNING"]);
const retryable = new Set(["FAILED", "TIMED_OUT", "DEAD_LETTER"]);

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(value)) + " UTC"
    : "—";
}

function statusStyle(status: JobSummary["status"]) {
  if (status === "SUCCEEDED") return "text-emerald-700 dark:text-emerald-400";
  if (["FAILED", "DEAD_LETTER", "TIMED_OUT"].includes(status))
    return "text-destructive";
  if (status === "CANCELLED" || status === "CANCEL_REQUESTED")
    return "text-amber-700 dark:text-amber-400";
  return "text-foreground";
}

export function JobsWorkspace({
  currentRole,
  currentUserId,
  jobs,
  memberNames,
}: {
  currentRole: OrganizationRole;
  currentUserId: string;
  jobs: JobSummary[];
  memberNames: Record<string, string>;
}) {
  return (
    <div className="space-y-8">
      <PageHeader
        action={<EnqueueExampleControls disabled={currentRole === "VIEWER"} />}
        description="Inspect durable background work, progress, attempts, and safe failures. Heavy execution remains independent of browser requests."
        title="Jobs"
      />

      <section aria-labelledby="queue-heading">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-sm font-semibold" id="queue-heading">
              Organization queue
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">
              Inputs and potentially sensitive result payloads are hidden from
              this operational view.
            </p>
          </div>
          <span className="text-muted-foreground text-xs">
            {jobs.length} recent jobs
          </span>
        </div>

        {jobs.length ? (
          <div className="divide-y">
            {jobs.map((job) => {
              const mayCancel =
                cancellable.has(job.status) &&
                canCancelJob({
                  createdBy: job.created_by,
                  role: currentRole,
                  userId: currentUserId,
                });
              const mayRetry =
                retryable.has(job.status) && canRetryJob(currentRole);
              return (
                <article
                  className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_10rem_13rem_auto] lg:items-center"
                  key={job.id}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {job.status === "SUCCEEDED" ? (
                        <CircleCheck
                          aria-hidden="true"
                          className="size-4 text-emerald-600"
                        />
                      ) : (
                        <CircleDashed
                          aria-hidden="true"
                          className="text-muted-foreground size-4"
                        />
                      )}
                      <p className="truncate text-sm font-medium">
                        {job.job_type}
                      </p>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {job.plugin_id ? `Plugin: ${job.plugin_id}` : "Core"} ·{" "}
                      {job.execution_class.toLowerCase().replace("_", " ")} · by{" "}
                      {memberNames[job.created_by] ?? "Organization member"}
                    </p>
                  </div>
                  <div>
                    <p
                      className={`text-xs font-semibold ${statusStyle(job.status)}`}
                    >
                      {job.status.replace("_", " ")}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Attempt {job.attempt_count}/{job.max_attempts}
                    </p>
                  </div>
                  <div>
                    <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <p className="text-muted-foreground mt-1 truncate text-xs">
                      {job.progress}% · {job.progress_message ?? "Waiting"}
                    </p>
                  </div>
                  <JobLifecycleControls
                    canCancel={mayCancel}
                    canRetry={mayRetry}
                    jobId={job.id}
                  />
                  <dl className="text-muted-foreground col-span-full grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="font-medium">Queued</dt>
                      <dd>{formatDate(job.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Scheduled</dt>
                      <dd>{formatDate(job.scheduled_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Completed</dt>
                      <dd>{formatDate(job.completed_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Safe result</dt>
                      <dd>
                        {job.error_category ??
                          (job.has_result ? "Result recorded" : "—")}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <ServerCog
              aria-hidden="true"
              className="text-muted-foreground mx-auto size-5"
            />
            <p className="mt-2 text-sm font-medium">No background jobs yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Queue the harmless Core test to verify the lifecycle.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
