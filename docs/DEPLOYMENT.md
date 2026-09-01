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

When the base URL is `https://openrouter.ai/api/v1`, structured requests require
all routed providers to support the supplied parameters. Do not use the random
`openrouter/free` router as the production contract for immutable structured
workflows. Configure a concrete model that currently advertises
`response_format` and `structured_outputs`, for example:

```text
STYLUS_AI_OPENAI_COMPATIBLE_MODEL=openai/gpt-4.1-nano
STYLUS_AI_REMOTE_INPUT_USD_PER_MILLION=0.10
STYLUS_AI_REMOTE_OUTPUT_USD_PER_MILLION=0.40
```

Provider capabilities and pricing are external deployment facts and must be
rechecked before changing production configuration. Free variants remain useful
for experiments but have lower availability/rate limits and do not provide a
stable underlying-model choice through the free router.

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

1. Apply `20260825001700_external_research.sql` followed by
   `20260825001710_claim_serverless_job.sql`, then run
   `supabase/tests/database/external_research_rls.test.sql`.
2. Configure the server-only `SUPABASE_SERVICE_ROLE_KEY` and a high-entropy
   `CRON_SECRET` in Vercel. Never use a `NEXT_PUBLIC_` prefix.
3. Deploy `vercel.json`; its Hobby-compatible `0 3 * * *` schedule invokes
   `GET /api/cron/serverless-jobs` once daily with
   `Authorization: Bearer $CRON_SECRET`. Hobby may invoke it anywhere within
   the selected UTC hour.
4. Normal hosted submissions do not wait for Cron. After enqueue commits, the
   Server Action registers a Next.js `after()` callback that targets the exact
   persisted job through the ordinary registry/executor and atomic database
   lease. The response does not wait for research completion.
5. Daily Cron is recovery/drain infrastructure for a job that remains queued
   because immediate execution did not start. It makes one generic SERVERLESS
   claim per invocation; concurrent immediate/Cron claims cannot both win.
6. Vercel Hobby functions have a 60-second maximum duration. The durable job
   definition retains its 120-second safety bound, but a hosted run must finish
   inside Hobby's function window. Use a plan/runtime with a longer supported
   duration if real workloads consistently exceed 60 seconds.
7. Configure an organization policy/provider that is reachable from the hosted
   application. LOCAL_ONLY is never weakened: a laptop-only Ollama endpoint is
   unavailable to Vercel, so evidence persists but synthesis safely fails and
   no report is fabricated.

Disable recovery safely by pausing/removing the Vercel Cron schedule or
rotating/removing `CRON_SECRET`; queued jobs remain durable. Immediate execution
continues only after an authorized hosted enqueue. Disabling Marketing or
removing execution membership prevents new work and trusted AI continuation.

### TASK-017C optional Reddit configuration

Reddit is optional and disabled by default. First obtain Reddit approval for the
exact production/Preview use case and confirm applicable research, commercial,
retention, attribution and removal requirements. Then configure server-only
values independently in each intended Vercel environment:

```text
STYLUS_REDDIT_API_ENABLED=true
STYLUS_REDDIT_CLIENT_ID=<approved confidential client id>
STYLUS_REDDIT_CLIENT_SECRET=<approved confidential client secret>
STYLUS_REDDIT_USER_AGENT=<approved descriptive user agent>
STYLUS_REDDIT_COMMUNITY_IDS=<optional comma-separated registry IDs>
```

Never prefix them with `NEXT_PUBLIC`. An incomplete or disabled configuration
returns a safe unavailable Reddit source. Other planned sources may still
produce a partial report; a Reddit-only intent safely fails if no evidence
exists. Preview deployments need their own explicit secret configuration.

No search-provider variable is required in TASK-017C. The interface is present
for a future terms-compliant optional provider, while curated Vogue and Retail
Dive feeds run without a paid search service. Apply
`20260825001730_fashion_marketing_intelligence.sql` before hosted QA.

### TASK-017D social intelligence deployment

Apply `20260825001740_fashion_social_intelligence.sql` after TASK-017C and run
the updated `supabase/tests/database/external_research_rls.test.sql`. No new
environment variable is required because V1 intentionally enables no production
social transport.

Do not add social credentials merely to bypass the capability status. Before a
future activation, obtain the platform's approval for the exact commercial use,
design a secure server-only token lifecycle, document quotas and retention/
deletion obligations, and add fixture plus hosted tests. YouTube additionally
requires a lifecycle that refreshes or deletes stored non-authorized API data at
least every 30 days; the current immutable evidence contract cannot claim that
compliance.

For hosted TASK-017D acceptance with no approved platform, deploy the migration
and branch, submit one controlled social-relevant intent, and verify the
persisted plan selects `SOCIAL`, its source observation is safely unavailable,
no social evidence or unsupported social claim exists, and zero AI calls occur
when no other family retains usable evidence. Do not repeat runs merely to
consume the five-runs/hour organization quota.

### TASK-017E web evidence deployment

Apply `20260825001750_fashion_web_consumer_evidence.sql` after TASK-017D. Set
`STYLUS_WEB_DISCOVERY_TAVILY_API_KEY` as a server-only secret in the exact hosted
environment and redeploy; never expose it as `NEXT_PUBLIC_*` or configure it on
the Windows worker. Without the key, applicable WEB observations fail closed as
unconfigured while other selected sources retain existing partial-source
semantics.

Before production use, confirm the selected Tavily plan/terms cover the deployed
internal application and publisher access remains compliant. For hosted
acceptance, use one deliberate consumer-pain or question-demand run with narrow
meaningful terms. Verify a WEB plan, bounded search calls, independently fetched
`FULL_PAGE`/`WEB_PAGE` evidence when permitted, zero snippet evidence, source
class/domain provenance, zero/one AI trace, and no Council/memory/TASK-018/
TASK-020 side effect. A safe zero-evidence result is valid when all discovered
pages are irrelevant, robots-denied or otherwise policy-blocked.
