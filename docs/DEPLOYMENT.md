# Stylus — Deployment Strategy

## Initial Constraint

Stylus should initially operate without a mandatory paid VPS.

---

# Initial Hosted Architecture

Use free-tier/serverless services where practical.

Conceptual deployment:

Team
-> hosted Stylus frontend/API
-> Supabase
-> queue/job infrastructure
-> lightweight hosted AI where available

Heavy jobs
-> optional Windows worker

---

# Developer Laptop

The developer laptop is not the production server.

It may provide optional heavy computation.

When offline:

- users can still log in
- tasks remain available
- whiteboards remain available
- company knowledge remains available
- stored marketing analysis remains available
- heavy queued work waits

---

# Windows Worker

Worker responsibilities may include:

- FFmpeg processing
- OpenCV processing
- transcription
- Ollama inference
- multimodal analysis

The worker connects outbound to hosted infrastructure.

Do not expose inbound Ollama ports.

---

# Future Migration

When funding/revenue permits:

Windows Worker
-> cloud GPU worker

Free/serverless components may later migrate to dedicated infrastructure
without changing core application contracts.

---

# Hosted Task Reminder Schedule

TASK-005 reminder delivery is a PostgreSQL operation and does not require an
always-running Stylus server. After applying
`20260825000500_reminders_notifications_activity.sql` to hosted Supabase:

1. In Supabase Dashboard, open Integrations, enable the Cron Postgres Module
   (`pg_cron`), then open Jobs.
2. Create the case-sensitive job `stylus-task-reminders`.
3. Use schedule `*/5 * * * *`.
4. Configure the SQL job as:

   ```sql
   select public.process_task_reminders();
   ```

5. Activate it, inspect Job History after a run, and test with an assigned
   active task due within an hour.

The repository creates the processor but intentionally does not provision the
hosted Cron job. Deployment ownership, extension enablement and run-history
monitoring stay explicit. Supabase documents direct database-function jobs at
<https://supabase.com/docs/guides/cron/quickstart> and extension enablement at
<https://supabase.com/docs/guides/cron/install>.

Supabase Free projects may be paused after low activity; no database job runs
while a project is paused. Review
<https://supabase.com/docs/guides/platform/free-project-pausing> for current
platform behavior. This is the known free-tier availability limitation, not a
dependency on the developer laptop.

---

# Hosted Whiteboard Realtime

After applying `20260825000700_extend_collaboration_enums.sql` and
`20260825000710_whiteboard_collaboration.sql` to hosted Supabase:

1. In Realtime Settings, disable **Allow public access** so only private channels
   authorized by `realtime.messages` RLS policies can connect.
2. Confirm the `supabase_realtime` publication contains `board_elements` and
   `board_comments`. The migration adds these tables idempotently; no dashboard
   publication edit should normally be required.
3. Keep table RLS enabled. Postgres Changes authorization comes from the existing
   organization-member SELECT policies, while Presence uses the private
   `board:<uuid>` topic policies created by the migration.
4. Perform the documented two-browser test with two organization members, then a
   VIEWER and a user from another organization. Confirm channel cleanup by closing
   one board and observing Presence update.

Do not enable public board channels or publish additional tables for TASK-007.

---

# Team Invitation Delivery

Apply `20260825000720_organization_team_invitations.sql` before TASK-007
multi-user QA. OWNER/ADMIN creates an invitation on Team and copies the displayed
seven-day link for manual sharing. Regeneration invalidates the previous link.

Transactional email is not configured and the UI does not claim delivery. A
future provider may send the same application-generated link, but must not receive
database credentials or bypass the invitation acceptance function.

---

# Hosted Plugin Framework

Apply `20260825000800_plugin_framework.sql` before TASK-008 hosted QA. No hosted
extension, worker, service-role credential, plugin package download or secret
configuration is required.

After migration, use two organizations and OWNER/ADMIN/MEMBER/VIEWER accounts to
verify Apps state isolation, manager-only enablement, enabled navigation and the
guarded `/apps/example` route. Disablement must hide and deny the example route
without deleting its `organization_plugins` row.

---

# AI Foundation Configuration

Apply `20260825000900_ai_foundation.sql` and forward correction
`20260825000910_fix_ai_trace_metadata_constraint.sql` before exercising AI. No
paid provider, model download, worker, pgvector extension or service-role
credential is required. Organization policy defaults to disabled until
OWNER/ADMIN saves it.

Optional local development uses server-only values:

```text
STYLUS_AI_OLLAMA_BASE_URL=http://127.0.0.1:11434
STYLUS_AI_OLLAMA_MODEL=<installed-model-name>
```

Ollama is installed, secured and operated separately. Stylus does not start it,
download weights or fail startup when it is absent. Use LOCAL_ONLY during local
testing to prove remote fallback cannot occur.

An optional hosted OpenAI-compatible endpoint uses:

```text
STYLUS_AI_OPENAI_COMPATIBLE_BASE_URL=https://configured-provider.example/v1
STYLUS_AI_OPENAI_COMPATIBLE_MODEL=<provider-model-name>
STYLUS_AI_OPENAI_COMPATIBLE_API_KEY=<server-secret-if-required>
STYLUS_AI_REMOTE_INPUT_USD_PER_MILLION=<optional-estimate>
STYLUS_AI_REMOTE_OUTPUT_USD_PER_MILLION=<optional-estimate>
```

These values must remain server environment configuration and must never use a
`NEXT_PUBLIC_` prefix. Base URLs are deployment-controlled; the AI Settings page
contains provider IDs only and cannot turn Stylus into an arbitrary URL proxy.

A hosted deployment cannot reach `127.0.0.1` on a developer laptop. Configure a
provider reachable from the hosted server or leave hosted AI disabled. Do not
create an unauthenticated tunnel to Ollama. The later outbound worker/job system
will address optional laptop compute separately.

Hosted QA requires two organizations and OWNER/ADMIN/MEMBER/VIEWER accounts.
Verify manager-only policy changes, member-readable safe run metadata, VIEWER
execution denial, cross-organization RLS, LOCAL_ONLY behavior and the absence of
prompts, responses and credentials in database/browser-visible data.

---

# Company Knowledge and Memory

Apply `20260825001000_company_knowledge_memory.sql` followed by
`20260825001010_company_memory_lifecycle.sql` before opening `/memory`. No
extension, provider, worker, pgvector installation, model download or new secret
is required.

Run `supabase/tests/database/company_knowledge_memory_rls.test.sql` in a
database-capable environment. Hosted QA requires two organizations plus
OWNER/ADMIN/MEMBER/VIEWER accounts. Verify human company-memory lifecycle,
search/filtering, archived state, profile-derived Company Knowledge,
cross-organization and removed-member denial, and the absence of prompt/response
copies. Plugin-private domains are intentionally not exposed in the generic
Core UI or through generic browser mutation RPCs.

---

# Hosted Durable Jobs

Apply `20260825001100_heavy_job_infrastructure.sql` and forward correction
`20260825001110_fix_job_enqueue.sql`, then run
`supabase/tests/database/heavy_jobs_rls.test.sql` in a database-capable
environment. The migration adds no extension and requires no Redis, Edge
Function, pg_net, long-running Node process, or VPS.

The corrective migration is required when `01100` has already been applied. It
repairs the initial job-status enum cast and the database processor's progress
argument type without changing Cron configuration or function privileges.

For browser-independent lightweight DATABASE jobs:

1. In Supabase Dashboard, enable/open the Cron Postgres Module.
2. Create the case-sensitive job `stylus-database-jobs`.
3. Use schedule `* * * * *`.
4. Use SQL `select public.process_database_jobs(10);`.
5. Activate it and monitor Job History for bounded execution time and failures.

PostgreSQL owns durable state, atomic claims, leases, retry scheduling, stale
recovery and the harmless `core.test.echo` handler. Next.js owns authenticated
enqueue/cancel/retry actions, the trusted registry, and `/jobs`. No generic Edge
Function is deployed because TASK-011 has no real bounded network workload that
justifies one.

SERVERLESS and EXTERNAL_WORKER classes are routing contracts, not a claim that
heavy workloads run today. Video, FFmpeg, transcription and large AI work remain
queued until TASK-012 supplies an authenticated outbound worker. Do not place a
Supabase service-role key on the Windows worker or expose Ollama. Supabase project
pausing, Cron cadence, statement limits and future serverless/worker costs remain
real operational limitations.

---

# Hosted Windows Worker Broker

Apply `20260825001200_windows_workers.sql` and configure
`SUPABASE_SERVICE_ROLE_KEY` in the hosted Next.js server only. Redeploy the web
application so `/api/worker/*` can broker bounded requests. Do not put this key
in `NEXT_PUBLIC_*`, the Windows config, source control or browser code.

No Edge Function, pg_net, additional Cron job, public laptop port, firewall
change or worker-side Supabase key is required. Existing DATABASE Cron continues
unchanged. Follow `WINDOWS_WORKER.md` for pairing and offline/revocation QA.

---

# Deployment Philosophy

Optimize initially for:

- zero/low fixed cost
- security
- recoverability
- portability
- simple operations

Do not optimize for hypothetical massive scale.

## TASK-014 Hosted and Worker Setup

1. Apply `20260825001400_competitor_reel_analysis.sql` after TASK-013. It
   creates private Storage, Marketing media tables, job registration, RLS, and
   narrow service-role broker functions.
2. Keep `SUPABASE_SERVICE_ROLE_KEY` only in the hosted Next.js environment.
3. On the optional Windows worker, install FFmpeg/ffprobe and an
   organization-approved official whisper.cpp Windows release. Download a
   multilingual base GGML model explicitly, then configure
   `STYLUS_WORKER_WHISPER_CPP_PATH` and `STYLUS_WORKER_WHISPER_MODEL_PATH`.
   Follow `docs/WINDOWS_WORKER.md`; no native binary or model is downloaded by
   Stylus.
4. Re-pair the worker after migration, then start it outbound-only.

No Instagram credentials, browser automation, paid transcription provider,
public bucket, inbound laptop port, VPS, or new queue is required. Offline
worker jobs remain queued while the hosted app stays available. Archived media
continues consuming Storage until a future controlled cleanup feature exists.
Python, faster-whisper, PyAV, and CTranslate2 are no longer TASK-014 deployment
dependencies. Keep Windows Smart App Control and Code Integrity enabled; a
blocked whisper.cpp executable means the capability remains unavailable.

## TASK-017 Hosted External Research

1. Apply `20260825001700_external_research.sql` and run
   `supabase/tests/database/external_research_rls.test.sql`.
2. Configure the server-only `SUPABASE_SERVICE_ROLE_KEY` and a high-entropy
   `CRON_SECRET` in Vercel. Never use a `NEXT_PUBLIC_` prefix.
3. Deploy `vercel.json`; it invokes `GET /api/cron/serverless-jobs` every five
   minutes with `Authorization: Bearer $CRON_SECRET`. This cadence requires a
   Vercel plan that supports sub-daily Cron, or an equivalent trusted scheduler
   that supplies the same bearer header.
4. Each invocation claims and processes at most one SERVERLESS job with a
   120-second route/job bound. Monitor Vercel Cron logs plus safe job/run status;
   no Windows worker is required.
5. Configure an organization policy/provider that is reachable from the hosted
   application. LOCAL_ONLY is never weakened: a laptop-only Ollama endpoint is
   unavailable to Vercel, so evidence persists but synthesis safely fails and
   no report is fabricated.

Disable execution safely by pausing/removing the Vercel Cron schedule or
rotating/removing `CRON_SECRET`; queued jobs remain durable. Disabling Marketing
or removing execution membership prevents new work and trusted AI continuation.
