import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/jobs/actions", () => ({
  cancelJobAction: vi.fn(),
  enqueueExampleJobAction: vi.fn(),
  retryJobAction: vi.fn(),
}));

import type { JobSummary } from "@/modules/jobs/server/data";

import { JobsWorkspace } from "./jobs-workspace";

afterEach(cleanup);

const job: JobSummary = {
  attempt_count: 1,
  cancellation_requested_at: null,
  cancelled_at: null,
  capability: "core.jobs.test",
  claimant_id: null,
  completed_at: "2026-08-27T10:01:00Z",
  concurrency_group: "core.test.echo",
  created_at: "2026-08-27T10:00:00Z",
  created_by: "00000000-0000-4000-8000-000000000001",
  duration_ms: 100,
  error_category: null,
  execution_class: "DATABASE",
  has_result: true,
  heartbeat_at: "2026-08-27T10:00:01Z",
  id: "20000000-0000-4000-8000-000000000001",
  idempotency_key: "diagnostic-1",
  job_type: "core.test.echo",
  lease_expires_at: null,
  max_attempts: 2,
  next_attempt_at: "2026-08-27T10:00:00Z",
  organization_id: "10000000-0000-4000-8000-000000000001",
  parent_job_id: null,
  plugin_id: null,
  priority: 50,
  progress: 100,
  progress_message: "Completed.",
  progress_updated_at: "2026-08-27T10:01:00Z",
  scheduled_at: "2026-08-27T10:00:00Z",
  started_at: "2026-08-27T10:00:01Z",
  status: "SUCCEEDED",
  timeout_seconds: 60,
};

describe("JobsWorkspace", () => {
  it("shows safe operational metadata without raw input or result payloads", () => {
    render(
      <JobsWorkspace
        currentRole="OWNER"
        currentUserId={job.created_by}
        jobs={[job]}
        memberNames={{ [job.created_by]: "Owner" }}
      />,
    );
    expect(screen.getByText("core.test.echo")).toBeInTheDocument();
    expect(screen.getByText("Result recorded")).toBeInTheDocument();
    expect(screen.getByText(/by Owner/)).toBeInTheDocument();
    expect(
      screen.queryByText("Stylus job infrastructure check"),
    ).not.toBeInTheDocument();
  });

  it("keeps VIEWER enqueue controls disabled", () => {
    render(
      <JobsWorkspace
        currentRole="VIEWER"
        currentUserId="viewer"
        jobs={[]}
        memberNames={{}}
      />,
    );
    expect(screen.getByRole("button", { name: "Queue test" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Schedule in 5 min" }),
    ).toBeDisabled();
  });

  it("offers manager retry only for retryable terminal jobs", () => {
    render(
      <JobsWorkspace
        currentRole="ADMIN"
        currentUserId="admin"
        jobs={[
          {
            ...job,
            error_category: "permanent_failure",
            has_result: false,
            status: "FAILED",
          },
        ]}
        memberNames={{}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Retry job" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel job" }),
    ).not.toBeInTheDocument();
  });

  it("offers a member cancellation only for their own active job", () => {
    const active = {
      ...job,
      completed_at: null,
      has_result: false,
      progress: 10,
      status: "RUNNING" as const,
    };
    const { rerender } = render(
      <JobsWorkspace
        currentRole="MEMBER"
        currentUserId={job.created_by}
        jobs={[active]}
        memberNames={{}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Cancel job" }),
    ).toBeInTheDocument();
    rerender(
      <JobsWorkspace
        currentRole="MEMBER"
        currentUserId="other"
        jobs={[active]}
        memberNames={{}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Cancel job" }),
    ).not.toBeInTheDocument();
  });
});
