# Stylus — Durable Job Infrastructure

## Purpose

TASK-011 provides organization-scoped durable background-work infrastructure.
It does not implement research, ingestion, embeddings, Marketing workflows,
media processing, transcription, agents, or the Windows worker.

Jobs and AI runs remain separate concepts. A job is a durable workflow that may
later create zero or more AI runs through the existing AI API. Job completion
never writes Company Memory; a future memory job must call a trusted memory API.

## Queue Model

`public.jobs` stores bounded operational metadata, not large artifacts:

- trusted Core/plugin origin, job type, capability, and execution class
- QUEUED/SCHEDULED/RUNNING and terminal lifecycle state
- priority, schedule, retry eligibility, attempt count, and timeout
- claimant, heartbeat, and lease expiry
- bounded progress, safe input/result metadata, and normalized error category
- creator, cancellation, parent retry, and optional idempotency provenance

Inputs and results are JSON objects capped at 16 KiB. Secret-, credential-, raw
prompt-, and raw-response-shaped keys are rejected recursively. Large documents,
scrapes, video, transcripts, and artifacts belong in domain tables or private
Storage, with only a safe reference in the job.

## Trusted Registry and Enqueue Boundary

`core/jobs/public.ts` defines Zod-backed job metadata, schemas, handlers, and the
instance-scoped registry. Job IDs and capabilities are stable namespaced values.
Duplicate IDs, invalid ownership, and executable classes without static handlers
fail registration.

A browser-inaccessible database definition allowlist repeats the stable type,
origin, capability and execution settings. The enqueue RPC rejects unknown types
and mismatched priority/retry/timeout/provenance values, then persists allowlist
values. This prevents a direct Supabase caller from bypassing the TypeScript
boundary.

Core definitions use an explicit Core origin. Plugins register definitions
through trusted static plugin code. A plugin definition must use its namespace
and a capability declared by its manifest. Enqueue then independently requires
the registered job, valid input, authenticated active membership, non-VIEWER
role, and current plugin enablement.

The browser does not provide organization ID, actor ID, plugin provenance,
capability, execution class, priority, retry limits, timeout, or worker identity.
The harmless `/jobs` diagnostic always enqueues `core.test.echo` with fixed input.

Corrective migration `20260825001110_fix_job_enqueue.sql` explicitly types the
initial QUEUED/SCHEDULED selection as `public.job_status`. The applied original
function's uncast `CASE` resolved to `text` and PostgreSQL rejected its insert
before any tuple was created; the failed RPC transaction then rolled back with
no durable row. The replacement retains the original
signature, authorization, allowlist, idempotency, limits, grants and pinned
search path. The migration also casts the database processor's 50% progress
literal to the lifecycle RPC's `smallint` contract, repairing the second runtime
error identified by linked PostgreSQL lint.

Optional idempotency is scoped by organization, job type, and explicit key. An
organization transaction lock makes the lookup/insert atomic. The initial queue
caps are 100 active jobs per organization and 25 active jobs per creator.

## Claims, Leases, and Concurrency

`claim_next_job` is worker-only and uses `FOR UPDATE SKIP LOCKED`. It respects
execution class, schedule, retry time, cancellation, attempts, priority, and a
lease. Only one job is returned per claim. A transaction advisory lock protects
optional organization concurrency groups from the separate-row race that row
locking alone cannot prevent.

Workers use narrow functions to heartbeat, report monotonic progress, succeed,
fail/retry, or acknowledge cancellation. Claimant and unexpired lease must match
for every transition. Authenticated browser roles cannot call these functions or
write lifecycle columns directly.

Expired leases are reconciled deterministically. Cooperative cancellation becomes
CANCELLED. Other stale attempts use bounded exponential backoff when attempts
remain and become TIMED_OUT when exhausted. Retryable failures use 30, 60, 120,
and bounded later delays up to 15 minutes; permanent, validation, policy, and
cancellation failures are never blindly retried. Exhausted retryable failures
remain inspectable as DEAD_LETTER.

## Cancellation, Timeout, and Progress

Queued or scheduled cancellation is immediate. Running work becomes
CANCEL_REQUESTED and requires cooperative worker acknowledgement. Serverless
runtimes cannot promise hard process termination, so handlers receive an
AbortSignal, cancellation check, heartbeat, and progress callback.

Definitions cap runtime between one second and 24 hours. Leases cannot extend
past the job's absolute timeout. Progress is 0–100 with a concise 280-character
message and should be written only at meaningful boundaries.

## Execution Classes

- `DATABASE`: short, deterministic database-native work. TASK-011 implements
  only `core.test.echo` and `process_database_jobs()` for this class.
- `SERVERLESS`: bounded network/CPU work through the typed executor contract.
  No hosted generic adapter is deployed in TASK-011.
- `EXTERNAL_WORKER`: heavy or machine-specific work. TASK-012 will add the
  authenticated outbound Windows adapter.

The generic TypeScript `JobExecutor` resolves only static handlers, revalidates
persisted input/output, provides cooperative cancellation and heartbeat, bounds
output size, normalizes failures, and delegates lifecycle persistence to a store
adapter. It never evaluates code or loads remote executables.

An optional terminal lifecycle observer receives only organization, job ID/type,
status and normalized error category. Future user-visible workflows can map this
hook to meaningful Activity or notifications without copying payloads or making
every internal operation noisy. TASK-011 does not emit generic job spam.

## Hosted Strategy and Limitations

Supabase Cron can call `public.process_database_jobs(10)` every minute. This
executes the tiny DATABASE class with no browser, developer laptop, Node daemon,
Redis, queue service, pg_net, Edge Function, or paid always-on VPS.

CPU/network-heavy work is deliberately not run inside PostgreSQL. SERVERLESS and
EXTERNAL_WORKER jobs remain durable until a compatible adapter exists. TASK-012
adds worker authentication and the first outbound heavy worker. The service-role
credential must never be distributed to browsers or the laptop; future external
workers must reach narrow lifecycle RPCs through a dedicated authenticated
server boundary.

Supabase free-tier availability, Cron cadence, database statement limits, and
serverless runtime limits still apply. TASK-011 does not promise zero-cost or
continuous execution when a hosted project is paused.

## Hosted Manual QA

Use a non-production test organization and never expose a service-role key:

1. Apply only `20260825001100_heavy_job_infrastructure.sql`.
2. Run `supabase/tests/database/heavy_jobs_rls.test.sql`; require all 54
   assertions to pass.
3. Configure `stylus-database-jobs` exactly as documented in `DEPLOYMENT.md` and
   confirm one successful Cron history entry.
4. As OWNER, open `/jobs`, queue the Core test, and record its displayed job ID.
5. Without refreshing every few seconds, wait for the one-minute Cron boundary,
   refresh once, and confirm QUEUED → RUNNING → SUCCEEDED, 100% progress, one
   attempt, completion time, and “Result recorded.”
6. In SQL Editor, confirm that job's `result_metadata` is exactly
   `{"acknowledged": true}` and contains no raw input copy.
7. Schedule the five-minute test and confirm a worker claim before
   `scheduled_at` returns no such job; confirm it succeeds after eligibility.
8. Pause the Cron job, enqueue a test, cancel it while QUEUED, and confirm
   immediate CANCELLED with no claim.
9. Pause Cron, enqueue and claim a test from SQL Editor with executor
   `qa/worker`, request cancellation in `/jobs`, then call
   `acknowledge_job_cancellation(job_id, 'qa/worker')`; confirm
   CANCEL_REQUESTED → CANCELLED.
10. For retry QA, claim a fresh test as `qa/worker`, call
    `report_job_failure(job_id, 'qa/worker', 'transient_failure', true)`, and
    confirm SCHEDULED with `next_attempt_at` at least 30 seconds later.
11. Exhaust a one-attempt test in the pgTAP flow and confirm DEAD_LETTER remains
    inspectable; use OWNER/ADMIN Retry and confirm a new job whose
    `parent_job_id` is the terminal source.
12. Expire a claimed test lease in the test database, run
    `recover_stale_jobs(now())`, and confirm it retries when attempts remain or
    becomes TIMED_OUT when exhausted.
13. Trigger the same immediate test twice inside its five-minute diagnostic
    bucket and confirm one idempotent job ID rather than duplicate advancement.
14. With one eligible test, call `claim_next_job` as two trusted executor IDs and
    confirm only one receives that job; repeat with two jobs in the same
    concurrency group.
15. With two organizations, confirm each sees only its own rows. Confirm MEMBER
    can enqueue and cancel only its own work, VIEWER cannot enqueue/cancel/retry,
    and removed members cannot read or mutate.
16. Enable the Example plugin, enqueue its registered job through a trusted test
    path, disable the plugin, and confirm new enqueue is rejected while history
    remains. The pgTAP suite covers the database half of this check.
17. Close all browsers and power off the developer laptop; with hosted Cron
    active, enqueue beforehand and confirm eligible DATABASE work still runs.
18. Inspect `/jobs` at desktop, tablet and narrow mobile widths and confirm safe
    metadata, controls, progress, empty/error states and no raw payload exposure.

Re-enable Cron after controlled failure/cancellation tests. Do not attempt to run
SERVERLESS or EXTERNAL_WORKER work until a corresponding trusted adapter exists.
