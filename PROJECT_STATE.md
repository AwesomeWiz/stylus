# Stylus — Project State

Last Updated: 2026-09-01

## Overall Status

TASK-017E IMPLEMENTED / HOSTED ACCEPTANCE PENDING

Stylus now has its first organization-enableable business plugin. Marketing
provides guarded manual workspaces, bounded Creative Council workflows, and a
durable fashion-marketing research system. TASK-017E adds deterministic,
bounded public-web discovery for fashion and consumer evidence while keeping
search discovery separate from independently validated page retrieval.

---

## Current Phase

Phase 14 — External Marketing Research

Status: TASK-017E IMPLEMENTED / HOSTED ACCEPTANCE PENDING

---

## Current Objective

Confirm the TASK-017E server-only discovery credential in the hosted preview,
then perform one deliberate hosted acceptance run. TASK-018 Performance
Learning remains next and unstarted.
Preserve source-plan-to-evidence-to-opportunity provenance, organization
isolation and the zero/one synthesis-call invariant.

---

# Phase 0 Implementation

- npm workspace structure with `apps/web` and shared TypeScript config
- Next.js App Router application with strict TypeScript
- Tailwind CSS design tokens with light and dark theme variables
- shadcn/ui-compatible component conventions and aliases
- Lucide icon system
- responsive desktop sidebar and accessible mobile navigation drawer
- topbar with global search, notifications and account placeholders
- placeholder Home page with no business functionality
- Zod-backed environment validation and `.env.example`
- ESLint, Prettier and Vitest configuration
- focused navigation and Home placeholder tests

---

# Phase 0 Verification

Verified on 2026-08-25:

- `npm install`: passed; 0 audit vulnerabilities
- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 3 files and 4 tests
- `npm run build`: passed; `/` prerendered as static content
- development server: started successfully; `/` returned HTTP 200

---

# Phase 1 Implementation

- browser-safe and server-only Supabase clients using `@supabase/ssr`
- Next.js Proxy session refresh using verified Supabase claims
- signup, email-confirmation, login and logout flows
- protected application and organization-setup routes
- server-side identity and organization-membership helpers
- organization setup boundary before entering the Stylus shell
- shell account identity, organization name, role and logout menu
- Zod validation for required public environment configuration and forms
- generic authentication errors that do not expose credentials or account state

---

# Phase 1 Database

Migration: `supabase/migrations/20260825000100_auth_organizations.sql`

Introduced:

- `public.organization_role`: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`
- `public.organizations`
- `public.memberships` with `(organization_id, user_id)` primary key
- private membership/role authorization functions with pinned search paths
- atomic `public.create_organization(text)` RPC
- restricted table/function grants
- RLS policies for organization reads, organization updates and membership reads
- pgTAP policy suite at `supabase/tests/database/organizations_rls.test.sql`

---

# Phase 1 Verification

Verified on 2026-08-25 with browser-safe test configuration:

- dependency installation: passed; 0 audit vulnerabilities
- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 10 files and 27 tests
- `npm run build`: passed; 7 application routes plus Proxy compiled
- development server: passed
- `/login` and `/signup`: HTTP 200 with expected labeled forms
- `/` and `/organization/new` while unauthenticated: HTTP 307 to `/login`
- browser bundle scan: no service-role environment names or secret-key prefixes
- source scan: no credential/token logging or service-role client

---

# Phase 2 Implementation

- focused eight-step onboarding: Company; Problem & Idea; Product; Audience;
  Positioning & Brand; Marketing; Competitors; Review & Finish
- per-step validation, field errors, pending states, Back and Save/Continue
- bounded add/remove list controls and zero-or-more competitor editor
- durable server-side progress saved between steps
- completion timestamp and workspace routing that does not repeat onboarding
- Company Profile review/edit page after completion
- pre-product-friendly optional website, social, brand and competitor fields
- no AI provider, memory, embedding, RAG, scraping or Marketing plugin code

---

# Phase 2 Database and Security

Migration: `supabase/migrations/20260825000200_company_onboarding.sql`

Introduced:

- controlled company, product, brand, marketing and competitor enums
- `company_profiles`
- `audience_profiles`
- `brand_profiles`
- `marketing_profiles`
- `competitors` with archival removal
- `onboarding_progress`
- member read policies and OWNER/ADMIN insert/update policies on every table
- immutable organization ownership, creator/starter provenance and authenticated
  updater enforcement
- pgTAP policy suite at
  `supabase/tests/database/company_onboarding_rls.test.sql`

Server Actions independently derive the current organization from the validated
membership context and map accepted fields explicitly. MEMBER and VIEWER roles
cannot mutate onboarding data.

---

# Phase 2 Verification

Verified on 2026-08-25:

- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 16 files and 49 tests
- `npm run build`: passed; onboarding and Company Profile routes compiled
- linked `supabase db push --dry-run --skip-vault`: passed; exactly the new Phase
  2 migration is pending and no remote changes were made
- unauthenticated `/onboarding/company` and `/company/profile`: HTTP 307 to
  `/login`
- source security scan: no service-role use, secret logging, AI calls or memory
  implementation

## Manual-QA Navigation Fix

Resolved on 2026-08-25:

- removed broad root-layout revalidation before onboarding redirects
- replaced the separate progress read/upsert with
  `advance_onboarding_progress(uuid, smallint)` on the same authenticated client
- progress advancement now targets the absolute completed step, making duplicate
  requests idempotent rather than incrementing twice
- regression coverage verifies first-submit persistence/redirect, validation and
  persistence failures, duplicate requests, disabled pending submission and
  refresh/login recovery
- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 18 files and 59 tests
- `npm run build`: passed
- linked migration dry run: passed; only
  `20260825000300_fix_onboarding_progress_advance.sql` is pending

---

# Phase 3 Implementation

- protected `/tasks` workspace integrated with the responsive Stylus shell
- fast create/edit dialog with title, description, one optional assignee,
  priority, status, scheduled time and due time
- compact task rows with accessible completion/reopen controls and overdue state
- My Tasks, All Tasks, Upcoming, Overdue, Completed, Archive and Calendar views
- composing title, assignee, status and priority filters
- deterministic actionable ordering and UTC date handling
- 14-day recent-completion window with older history retained in Archive
- lightweight task comments for working collaboration context
- view-specific empty states plus loading, error and pending states
- no reminder delivery, notifications, workers, AI or later-task infrastructure

---

# Phase 3 Database and Security

Migration: `supabase/migrations/20260825000400_task_management.sql`

Introduced:

- `task_status` and `task_priority` enums
- `tasks` with one nullable same-organization assignee
- `task_comments`
- organization/status, assignee, due and completion-history indexes
- composite organization/member and organization/task foreign keys
- database-managed, idempotent `completed_at` lifecycle
- immutable organization/creator provenance and authenticated updater enforcement
- column-level grants that exclude IDs, ownership and managed timestamps
- organization member reads; OWNER/ADMIN/MEMBER writes; VIEWER read-only RLS
- authenticated `list_organization_task_members(uuid)` directory RPC exposing
  only member IDs, display names and roles
- 19-assertion pgTAP suite at
  `supabase/tests/database/task_management_rls.test.sql`

---

# Phase 3 Verification

Verified on 2026-08-25:

- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 25 files and 92 tests
- `npm run build`: passed; protected `/tasks` route compiled
- linked `supabase db push --dry-run --skip-vault`: passed; exactly
  `20260825000400_task_management.sql` is pending and no remote change was made
- migration/security contract coverage verifies RLS roles, organization isolation,
  same-organization assignment, restricted grants and lifecycle invariants
- component coverage verifies compact task display, collaborator dialogs,
  VIEWER read-only behavior and view-specific empty states

## Manual-QA Overdue Deadline Fix

Resolved on 2026-08-25:

- local date/time inputs now convert through the browser timezone to UTC
  instants before persistence, and stored instants display in local time
- overdue uses the inclusive `due_at <= now` boundary for active tasks only
- the open workspace schedules one refresh at the nearest future active
  deadline, with timer cleanup and no polling when no deadline can change state
- deterministic coverage verifies timezone conversion, active/inactive status
  behavior, the deadline boundary, refresh-time filtering and the existing
  14-day completion split
- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 26 files and 97 tests
- `npm run build`: passed; protected `/tasks` route compiled

---

# Phase 4 Implementation

- compact global notification bell/popover with unread count, recent messages,
  explicit unread text, mark-one and mark-all read actions
- safe task-context navigation derived from controlled entity references
- 24-hour, one-hour and at-deadline in-app reminder policy for assigned active
  tasks
- deterministic database processor with exact UTC deadline-version idempotency
- current status, assignee, membership and deadline revalidation on every run
- immutable task create/update/assignment/status/comment activity triggers
- protected responsive `/activity` history with member identities and task links
- no external delivery channel, browser polling, local daemon, VPS or AI scope

---

# Phase 4 Database and Security

Migration: `supabase/migrations/20260825000500_reminders_notifications_activity.sql`

Introduced:

- controlled notification, reminder and activity event enums
- recipient-private `notifications`
- deadline-versioned `task_reminder_deliveries`
- immutable organization-readable `activity_events`
- `process_task_reminders(timestamptz)` restricted to trusted database/service
  execution
- recipient-scoped database-time read-state functions
- composite organization/member and organization/task foreign keys
- RLS and grants denying browser notification creation, activity forgery and
  reminder-ledger access
- 32-assertion pgTAP suite at
  `supabase/tests/database/reminders_notifications_activity_rls.test.sql`

---

# Phase 4 Verification

Verified on 2026-08-25:

- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 33 files and 112 tests
- `npm run build`: passed; protected `/activity` and `/tasks` routes compiled
- linked `supabase db push --dry-run --skip-vault`: passed; exactly
  `20260825000500_reminders_notifications_activity.sql` is pending and no remote
  change was made
- deterministic tests use fixed instants with no sleeps
- migration contract verifies current-state eligibility, deadline-version
  deduplication, trusted execution grants and immutable activity provenance

Production build, linked migration dry run and final formatting are recorded
after the final verification pass.

## Manual-QA Reminder Processor Fix

Resolved on 2026-08-25 after hosted Supabase Cron exposed a PostgreSQL runtime
ambiguity:

- the applied processor's local `reminder_kind` collided with the unqualified
  `reminder_kind` conflict-target column, aborting every eligible reminder run
- forward migration `20260825000510_fix_reminder_processor.sql` replaces only
  `public.process_task_reminders(timestamptz)` and preserves existing data
- all processor locals now use a `v_` prefix and target-row identifiers are
  explicitly qualified where PostgreSQL permits qualification
- `SECURITY DEFINER`, the empty `search_path`, current task/member checks,
  deadline-version idempotency, and service-role-only execution are preserved
- pgTAP now executes the eligible insert branch with `lives_ok`, directly
  covering the hosted failure path
- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 33 files and 114 tests
- `npm run build`: passed
- linked migration dry run: passed; only
  `20260825000510_fix_reminder_processor.sql` is pending

---

# Phase 5 Implementation

- protected `/whiteboards` list/grid with create, rename, open and archival
- full-space React Flow editor with pan, zoom, fit, selection and touch-friendly
  compact tooling
- independently persisted TEXT, STICKY, IMAGE, SHAPE and ARROW elements
- rectangle/ellipse shapes, direct text/sticky editing, resizing and deterministic
  bring/send layering
- bounded persistence on create, drag end, resize end and edit commit with
  visible saving/error/retry feedback
- private validated image upload with one-hour signed rendering URLs
- contextual font size, alignment and curated text/sticky/fill/stroke palettes
- 75-operation local undo/redo with persisted archive, restore and update
  transitions plus Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl+Y shortcuts
- horizontally centered default arrows, memoized element rendering during
  pointer updates and direct toolbar-to-native image picker activation
- VIEWER read-only behavior and OWNER/ADMIN/MEMBER collaboration
- no comments, mentions, realtime, presence, AI or Marketing integration

---

# Phase 5 Database and Security

Migration: `supabase/migrations/20260825000600_whiteboard_foundation.sql`

Introduced:

- controlled `board_element_type`
- organization-scoped `boards` and independently addressable `board_elements`
- finite geometry, positive dimensions, JSON-object and z-index constraints
- composite organization/board and membership provenance foreign keys
- provenance triggers preventing creator, organization and board reassignment
- collaborator-write/member-read RLS with restricted column grants
- private `board-images` bucket limited to 10 MB PNG/JPEG/WebP files
- path-derived organization storage policies for member reads and collaborator
  writes/removal
- 22-assertion pgTAP suite at
  `supabase/tests/database/whiteboards_rls.test.sql`

---

# Phase 5 Verification

Verified on 2026-08-25:

- focused TASK-006 usability tests: passed
- full web suite: passed; 44 files and 168 tests
- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run build`: passed; `/whiteboards` and `/whiteboards/[boardId]` compiled
- unauthenticated list and direct board routes return HTTP 307 to `/login`
- linked migration dry run: passed; remote database is current with no pending
  migrations; the usability pass required no schema change
- dependency audit: 0 vulnerabilities after adding `@xyflow/react`
- local pgTAP execution unavailable because Docker/Podman is not installed
- in-app browser QA unavailable because no browser surface was connected

---

# Manual Verification Still Required

The current machine does not have Docker or an available in-app browser surface.
The linked Supabase project was available for a non-mutating migration dry run.
Before merge/deployment:

1. Run `npm run db:start`, `npm run db:reset`, `npm run db:lint` and
   `npm run test:db` in a Docker-enabled environment.
2. Create OWNER/ADMIN/MEMBER/VIEWER users in two organizations and confirm list,
   direct-route, board mutation and element mutation boundaries.
3. Create a board and each element type; pan, zoom, move, resize, layer, edit and
   archive elements, then navigate away/reopen and verify reconstruction.
4. Exercise formatting and undo/redo controls and shortcuts for create, move,
   resize, content, style, archive and layer changes; reload after undo and redo.
5. Upload valid PNG/JPEG/WebP images and reject SVG/executable and oversized
   files; confirm Organization A cannot sign or fetch Organization B paths.
6. Confirm save/error/retry feedback under a simulated network failure and that
   repeated clicks while pending do not duplicate creation.
7. At desktop, laptop, tablet and narrow mobile widths, verify canvas containment,
   toolbar overflow, touch targets, selection controls and no page-level
   horizontal scrolling.
8. Verify keyboard focus, Enter text editing, Escape deselection, Delete/Backspace
   archival and React Flow keyboard movement without intercepting text input.

---

# Phase 6 Implementation

- trusted built-in plugin definitions with explicit static discovery
- Zod-validated stable IDs, metadata, permissions, capabilities, navigation,
  event subscriptions, memory domains and future AI tool descriptions
- instance-scoped deterministic registry with duplicate ID/capability rejection
- controlled Lucide icon resolution and namespaced plugin routes
- organization-scoped enable/disable state with non-destructive semantics
- enabled-only capabilities, navigation, event dispatch and server route guards
- compact `/apps` management UI with OWNER/ADMIN controls and member reads
- guarded `/apps/example` development proof plugin with no business functionality
- focused Core/plugin import-boundary enforcement

---

# Phase 6 Database and Security

Migration: `supabase/migrations/20260825000800_plugin_framework.sql`

Introduced:

- `organization_plugins` with organization/plugin composite identity
- enable, disable, creation and update timestamps with member provenance
- active plugin index and stable safe plugin-ID constraint
- organization-member SELECT RLS and no direct browser writes
- OWNER/ADMIN-only `set_organization_plugin_enabled` with derived actor,
  validated organization membership and an empty `search_path`
- 19-assertion pgTAP suite at
  `supabase/tests/database/plugin_framework_rls.test.sql`

Disablement preserves the row and does not delete plugin data, memory,
configuration or historical activity. Unknown well-formed database IDs remain
inert because only the static application registry can provide behavior.

---

# Phase 6 Verification

Verified on 2026-08-26:

- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- full web suite: passed; 58 files and 241 tests
- `npm run build`: passed; `/apps` and guarded `/apps/example` compiled
- focused registry, event, enablement, UI, route and architecture tests passed
- Team member and invitation dates now use an explicit locale and UTC timezone,
  preventing server/client hydration differences during manual QA
- local pgTAP execution unavailable because Docker/Podman is not installed
- linked migration dry run: passed; only
  `20260825000800_plugin_framework.sql` is pending and no remote change was made

---

# Phase 7 Implementation

- server-only normalized AI messages, text/structured results and execution context
- provider-neutral `ModelGateway` with no raw provider clients in its public API
- OpenAI-compatible HTTP adapter usable with configured hosted endpoints
- Ollama through its local OpenAI-compatible endpoint without startup probing
- deterministic fake provider covering success, failure, timeout and usage paths
- typed model registry with logical fast, balanced and reasoning tiers
- capability, location, allowlist, budget and organization-policy-aware routing
- controlled local-to-remote fallback only when `REMOTE_ALLOWED` explicitly permits it
- Zod validation of provider JSON before typed structured results are returned
- explicit trusted tool registry with schemas, capability ownership and read/write/
  external-side-effect metadata; no autonomous tool execution loop
- bounded timeouts, cancellation signals and one conservative transient retry
- optional pricing metadata, normalized usage and estimated-cost accounting
- `/ai` organization policy, metadata-only run diagnostics and fixed-input AI
  connection test

---

# Phase 7 Database and Security

Migrations:

- `supabase/migrations/20260825000900_ai_foundation.sql`
- `supabase/migrations/20260825000910_fix_ai_trace_metadata_constraint.sql`

Introduced:

- controlled AI execution mode, logical tier, run status and error enums
- `organization_ai_policies` with default-deny behavior, provider allowlist and
  optional monthly estimated remote-cost ceiling
- `ai_runs` with server-derived actor, organization/plugin context, lifecycle,
  timing, usage, estimated cost and bounded safe trace metadata
- no API keys, complete prompts or model responses in either table
- organization-member SELECT RLS and no direct browser table writes
- OWNER/ADMIN policy mutation and OWNER/ADMIN/MEMBER lifecycle functions with
  pinned search paths, active membership and enabled-plugin checks
- 32-assertion pgTAP suite at
  `supabase/tests/database/ai_foundation_rls.test.sql`

VIEWER cannot execute AI. Plugin execution additionally requires static
registration, current organization enablement and a declared capability. Memory
domains are copied from the manifest for audit context only and grant no retrieval.

---

# Phase 7 Verification

Verified on 2026-08-26:

- formatting passed
- lint passed with zero warnings
- type checking passed
- 74 test files passed with 316 tests
- production build passed, including the `/ai` route
- linked Supabase migration dry-run passed and reported only
  `20260825000910_fix_ai_trace_metadata_constraint.sql` as pending
- dependency audit passed with zero production vulnerabilities
- migration and application security reviews passed

Local pgTAP execution was unavailable because Docker/Podman is not installed.
Interactive browser QA was unavailable because no in-app browser surface was
connected. The pgTAP suite and hosted/local provider behavior remain explicit
manual-QA steps.

Manual QA then exposed a Next.js runtime boundary defect: the AI `"use server"`
module exported its ordinary initial action-state object. The state now lives in
the shared AI schema module, the action module exports only an async Server
Action, and permanent boundary/page/data/UI tests cover the runtime convention,
disabled default policy, safe failure UI and policy mutation paths. The linked
migration was confirmed applied; the generic settings fallback was caused by
the same module-loader failure rather than a demonstrated database connection
failure.

Manual QA confirmed the migration, policy persistence and local Ollama setup,
then identified the absence of an authenticated application execution path. The
`/ai` page now provides a fixed-input `core.ai.connection-test` diagnostic for
OWNER, ADMIN and MEMBER. It calls `generateAIText`, obeys the existing
organization policy/router, records the normal run lifecycle and returns only
provider, model, duration or normalized error category. VIEWER cannot execute,
and the browser cannot supply prompts, organization/actor IDs, plugin identity,
provider URL/ID or model ID.

The first live connection test then failed before Ollama invocation. The applied
trace constraint used recursive JSONPath descent followed by `keyvalue()`, an
object-only method, so valid scalar trace values raised during the
`start_ai_run` insert. The run store discarded the database error as a plain
`Error`, which normalized to `unknown`. The forward-only corrective migration
replaces that expression with a type-safe recursive helper, retains nested raw
content-key rejection and adds stage/code-only server diagnostics. The linked
dry run reports only the corrective migration as pending.

---

# Phase 8 Implementation

- typed Company Knowledge composition over canonical company, audience, brand,
  marketing and competitor rows, including incomplete-profile handling
- explicit `knowledge_memories` records with organization, controlled domain,
  kind, provenance, source, actor timestamps and archive lifecycle
- OWNER/ADMIN/MEMBER human company-memory create, update, archive and restore;
  VIEWER remains read-only
- simple indexed text search plus kind, provenance and active/archive filters
- stable bounded retrieval: 50 general results and 20 AI-context results
- `/memory` Core workspace with canonical-profile status and no plugin-private
  domain disclosure
- server-only AI context builder requiring explicit domains and independently
  enforcing active membership, Core/plugin origin, static registration,
  enablement, exact capability and declared domains
- meaningful memory lifecycle activity without read/search noise or content copy
- no automatic promotion from tasks, comments, boards, uploads or AI drafts
- no embeddings, pgvector, semantic search, ingestion, RAG or provider calls

---

# Phase 8 Database and Security

Migrations:

- `supabase/migrations/20260825001000_company_knowledge_memory.sql`
- `supabase/migrations/20260825001010_company_memory_lifecycle.sql`

The table is SELECT-only to authenticated browser roles. RLS exposes only the
current organization's company domain. Narrow SECURITY DEFINER functions use an
empty search path, derive `auth.uid()`, force human/company provenance and deny
VIEWER/removed/cross-organization mutations. No generic plugin-provenance write
function or hard-delete grant exists.

The 23-assertion pgTAP suite is at
`supabase/tests/database/company_knowledge_memory_rls.test.sql`.

---

# Phase 8 Verification

Verified on 2026-08-26:

- focused memory/activity suite passed: 11 files, 33 tests
- formatting passed
- lint passed with zero warnings
- type checking passed
- full suite passed: 84 files, 347 tests
- production build passed, including `/memory`
- linked Supabase dry-run passed and reported only the two ordered TASK-010
  migrations as pending
- migration, application-boundary and secrets/security reviews passed
- no dependency was added or changed

Docker and Podman are unavailable, so the 23-assertion pgTAP suite could not run
locally. No hosted migration was applied. Hosted pgTAP and role/isolation/manual
responsive QA remain required.

---

# Phase 9 TASK-011 Implementation

- trusted Zod-backed Core/plugin job definitions with duplicate and provenance
  rejection, fixed schemas, timeout/retry/side-effect policy and execution class
- authenticated server-derived enqueue boundary with no browser-provided tenant,
  actor, provenance, capability, priority, retry, timeout or worker identity
- explicit optional idempotency plus 100-active-organization and
  25-active-creator queue protection
- atomic one-at-a-time `FOR UPDATE SKIP LOCKED` claims, leases, heartbeats,
  monotonic progress and concurrency-group transaction locks
- bounded deterministic retries, eligibility times, dead-letter retention,
  terminal timeouts and stale-lease recovery
- immediate queued cancellation and cooperative running cancellation
- generic server-only executor contract with AbortSignal, heartbeat,
  cancellation, progress and bounded validated output
- DATABASE, SERVERLESS and EXTERNAL_WORKER routing without implementing the
  TASK-012 Windows adapter
- harmless database-native `core.test.echo` plus documented one-minute Supabase
  Cron schedule
- protected `/jobs` operational workspace with safe metadata and role-aware
  enqueue, cancellation and manager retry
- no AI-run merger, memory write, domain workload, Redis, Edge Function, pg_net,
  continuously running Node process or VPS

---

# Phase 9 TASK-011 Database and Security

Migration: `supabase/migrations/20260825001100_heavy_job_infrastructure.sql`

The `jobs` table is SELECT-only to authenticated organization members. Narrow
enqueue/cancel/retry functions derive `auth.uid()` and enforce role, tenant and
plugin state. Claim, heartbeat, progress, complete, failure and reconciliation
functions are revoked from browser roles and granted only to trusted database/
service execution. All SECURITY DEFINER functions pin an empty search path.

Bounded JSON constraints reject secret and raw prompt/response key shapes.
Claimant plus an unexpired lease is required for every worker transition. The
54-assertion pgTAP suite is at
`supabase/tests/database/heavy_jobs_rls.test.sql`.

---

# Phase 9 TASK-011 Verification

Verified on 2026-08-27:

- focused jobs/plugin boundary suite passed: 12 files, 78 tests
- formatting passed
- lint passed with zero warnings
- type checking passed
- full suite passed: 93 files, 407 tests
- production build passed, including `/jobs`
- linked Supabase dry run passed and reported only
  `20260825001100_heavy_job_infrastructure.sql` as pending
- migration, RLS/grant, concurrency/claim, AI/memory boundary and secrets reviews
  passed
- no dependency was added or changed

One load-sensitive pre-existing whiteboard keyboard-history assertion failed in
the first combined verification run, passed immediately in focused isolation,
and the complete suite then passed unchanged. No whiteboard code or test
was modified for TASK-011.

Docker and Podman are unavailable, so the 54-assertion pgTAP suite could not run
locally. No hosted migration or Cron change was applied. Hosted pgTAP,
role/isolation/concurrency QA and responsive browser QA remain required.

## Manual-QA Job Control Fix

Resolved on 2026-08-27:

- Queue, schedule, cancel and retry controls now explicitly submit their Server
  Action forms instead of inheriting the shared design-system button's safe
  `type="button"` default
- component regression coverage protects the submit semantics for all four job
  lifecycle controls
- no job authorization, RLS, worker lifecycle or migration behavior changed
- focused component coverage passed: 1 file, 5 tests
- formatting, lint and type checking passed; the full suite passed with 93 files
  and 408 tests; the production build passed with `/jobs`

## Manual-QA Durable Enqueue Fix

Resolved on 2026-08-27:

- hosted QA proved the Server Action ran and the trusted `core.test.echo`
  definition existed, but `public.jobs` remained empty
- PostgreSQL resolved the original enqueue `CASE` lifecycle expression as
  `text`; inserting it into the `public.job_status` enum failed with SQLSTATE
  `42804` at the `insert into public.jobs` statement
- execution reached the INSERT statement, but PostgreSQL rejected the typed
  expression before creating a tuple; the failed RPC transaction rolled back
  with no durable row, explaining the empty `public.jobs` result
- forward-only migration
  `20260825001110_fix_job_enqueue.sql` replaces the already-applied function and
  explicitly casts both initial states to `public.job_status`
- linked lint also found the hosted database processor passed integer progress
  `50` to a `smallint` lifecycle RPC; the same forward migration replaces the
  processor with an explicit `smallint` argument so Cron can complete Core echo
- safe server diagnostics now retain only enqueue stage, SQLSTATE and normalized
  category while the browser continues receiving a generic failure
- pgTAP executes the real enqueue path and now verifies exactly one Core row,
  initial state/type/scope, cross-organization denial, unknown-type denial,
  roles, removal and idempotency
- the 59-assertion database suite also executes the real processor path through
  100% progress, one attempt, `SUCCEEDED` and bounded
  `{"acknowledged": true}` result metadata
- focused regression suite passed: 4 files, 28 tests
- `npm run verify` passed: formatting, lint, typecheck, 93 files / 410 tests and
  the production build including `/jobs`
- linked lint independently reports only the two known hosted function errors,
  SQLSTATE `42804` and `42883`, because the correction is intentionally pending
- linked dry run applied nothing and reports exactly
  `20260825001110_fix_job_enqueue.sql` pending
- the corrective migration remains unapplied; hosted pgTAP and full lifecycle
  retest are required after it is applied manually

---

# Phase 9 TASK-012 Implementation

- forward migration `20260825001200_windows_workers.sql`
- protected worker registrations and one-time pairing requests with digest-only
  secrets, 15-minute expiry, single consumption and revocation
- brokered worker API using a hosted-only Supabase service credential; the
  Windows machine receives no database or human credential
- atomic organization/capability-scoped EXTERNAL_WORKER claims reusing TASK-011
  job states, leases, cancellation, retry and completion transitions
- static Windows handler registry and `core.test.worker-echo` diagnostic only
- conservative single-job polling, bounded backoff, lease heartbeat,
  cancellation/timeout AbortSignal and graceful shutdown
- `/workers` safe status UI with OWNER/ADMIN pairing/revocation and member reads
- local config under the current Windows user's application-data directory
- no arbitrary command execution, native binary, Ollama, media or domain work
- 22-assertion pgTAP worker suite plus application and worker regression tests

Manual-QA hardening on 2026-08-27 moved the worker action state/type into a
non-`use server` schema module. The worker Server Action boundary now exports
only async actions, matching the Next.js 16/Turbopack runtime contract, with
regression coverage for the boundary, pairing, revocation and role checks.
Formatting and lint passed, both typechecks passed, 101 test files with 434
tests passed, and both production builds passed. No migration changed.

Further manual-QA hardening keeps `/api/worker/*` outside human-session proxy
redirects while retaining the broker's pairing/credential authentication. The
broker now normalizes thrown failures as JSON, the worker rejects unexpected
non-JSON responses without reading or printing their bodies, and the CLI exits
safely. The one-time pairing display includes an explicit transient-feedback
copy control without persisting or retransmitting the raw code. No migration
changed. Final corrective verification passed formatting, lint, both typechecks,
102 test files with 444 tests, and both production builds. One pre-existing
whiteboard async-history test failed once under the full-suite load, then passed
all 12 tests in isolation and passed in the subsequent complete suite without
code changes.

Hosted migration, broker configuration, pgTAP and end-to-end Windows manual QA
remain required. Final verification on 2026-08-27 passed formatting, lint,
worker/web type checking, 100 test files with 428 tests, both production builds,
the linked hosted-schema lint and a production dependency audit with zero known
vulnerabilities. The linked dry run detected only
`20260825001200_windows_workers.sql`. Docker and Podman are unavailable in this
environment, so the 22-assertion pgTAP suite remains a hosted QA step. The dry
run did not apply the migration.

---

# Phase 12 Implementation

- protected `/apps/marketing/creative-studio` route and Marketing navigation
- one explicitly selected active Reel Idea per run
- optional explicit selection of at most three eligible completed TASK-014
  analyses through a 12,000-character allowlisted abstract projection
- bounded 20,000-character canonical Company context without durable memory
  retrieval
- static Hook Strategist, Script Writer, and Creative Critic definitions
- one structured ModelGateway call per stage using balanced, balanced, and
  reasoning tiers with 90-second timeouts
- immutable run, selected-evidence, stage, and versioned Reel Brief history
- safe structured Reasoning History without prompts, provider output, or hidden
  reasoning
- client pending state plus server idempotency/advisory-lock duplicate protection
- failure short-circuiting with successful prior-stage preservation
- OWNER/ADMIN/MEMBER execute and VIEWER read-only behavior
- no jobs, worker, tools, external research, Marketing memory, memory writes, or
  TASK-016 agents

Migration: `supabase/migrations/20260825001500_creative_council_v1.sql`

Database QA: `supabase/tests/database/creative_council_rls.test.sql` contains 21
organization, role, transition-privilege, duplicate, isolation, and non-promotion
assertions. Hosted application and pgTAP verification remain required.

Automated verification on 2026-08-28 passed focused TASK-015 coverage (8 files,
48 tests), lint, worker/web type checking, the full worker suite (5 files, 32
tests), the full web suite (112 files, 513 tests), and both production builds.
All TASK-015 source and documentation files pass Prettier; the repository-wide
format command still sees inherited Windows line-ending status noise in
unchanged TASK-012/TASK-014 files, whose Git content has no diff. Linked
migration dry-run reports only `20260825001500_creative_council_v1.sql` pending;
no hosted change was applied. Linked database lint reports no existing-schema
errors. Local pgTAP could not run because Docker, Podman, and local PostgreSQL
are unavailable.

Hosted manual QA was subsequently accepted, and TASK-015 was externally merged
into `main` as `7a17d2b` on 2026-08-28. Its V1 contract remains exactly three
successful tool-free structured calls—Hook Strategist, Script Writer, and
Creative Critic—producing a versioned Reel Brief with safe structured Reasoning
History and no durable memory retrieval or write.

---

# Phase 13 TASK-016 Implementation

- static reusable definitions for Audience Researcher, Trend Researcher,
  Competitor Analyst, Content Strategist, Retention Editor, Visual Director,
  Brand Director, Creative Judge and Challenge Reviewer
- professional Challenge Reviewer identity
  `marketing.challenge-reviewer`, with bounded adversarial output and no claim
  that unsupported material is necessarily false
- separate synchronous Strategic Review bound to one exact immutable TASK-015
  Reel Brief version
- exact Audience -> Brand -> Strategy -> Challenge -> Judge order, five calls
  maximum, 60-second call timeouts and a 285-second overall deadline
- balanced tiers for Audience and Brand; reasoning tiers for Strategy,
  Challenge and Judge; all calls use the existing Marketing capability through
  ModelGateway
- explicit evidence/inference/assumption and supported/weak/unsupported/
  contradicted/requires-verification semantics
- immutable successful partial stages, linked AI-run provenance, normalized
  failure state and a versioned Strategic Council Review only after Judge
  success
- same-user/source active-run and idempotency protection while intentional later
  review versions remain possible
- Creative Studio execution, five-stage progress and structured review history;
  VIEWER remains read-only
- no durable memory retrieval/write, tools, competitor evidence, raw media,
  external research, job/worker execution or TASK-020 chat behavior
- TASK-015 Hook -> Script -> Critic semantics and Reel Brief history remain
  unchanged

Migration: `supabase/migrations/20260825001600_creative_council_expansion.sql`

Database QA: `supabase/tests/database/strategic_review_rls.test.sql` covers
service-only transitions, role/isolation boundaries, exact-source binding,
sequential stages, idempotency, immutable completion and non-promotion.

Automated verification on 2026-08-29 passed focused TASK-016/TASK-015 coverage
(9 files, 63 tests), lint, worker/web type checking, the complete worker suite
(5 files, 32 tests), the complete web suite (118 files, 559 tests), and both
production builds. A final UI/migration/orchestration pass after presentation
refinement passed 5 files and 35 tests plus the web production build. All
TASK-016 and updated documentation files pass Prettier. Repository-wide
`format:check` remains blocked by 40 inherited TASK-012/TASK-014 Windows
line-ending files with no TASK-016 content changes; they were not rewritten.

The linked migration dry-run applied nothing and reports exactly
`20260825001600_creative_council_expansion.sql` pending. Linked schema lint
reports one pre-existing warning in the already-applied TASK-015
`record_marketing_creative_council_stage` enum assignment; the new TASK-016
assignment uses explicit enum casts. Docker, Podman and local PostgreSQL are
unavailable, so the 29-assertion TASK-016 pgTAP suite remains a hosted QA step.

## TASK-016 Creative Judge Manual-QA Fix

Resolved on 2026-08-29. The hosted failed run correctly preserved Audience,
Brand, Strategy and Challenge successes, recorded Judge as failed, terminalized
the run and created no final review. Its fifth `ai_run` was `SUCCEEDED`, proving
that Ollama returned JSON which passed the provider envelope, JSON parsing and
the static Judge Zod schema. The workflow then rejected it because the Judge's
disposition set did not exactly cover the Challenge identifier. Raw Judge output
was correctly not retained, so omission versus a different identifier cannot be
distinguished retrospectively.

The Judge now receives a per-run provider-visible schema containing the exact
Challenge reference enum and exact required disposition count. The same dynamic
Zod schema remains authoritative, and the existing final set-equality check is
retained as defense in depth. ModelGateway also records bounded safe diagnostic
categories, validation issue codes/paths, finish reason and known token usage
for structured failures without storing response or prompt content. No database
migration was required.

Corrective verification passed 49 focused tests, followed by the final 44-test
focused regression set, a one-call local Ollama reproduction using the real
dynamic Judge schema, lint, worker/web type checking, the complete worker suite
(5 files, 32 tests), the complete web suite (118 files, 562 tests), and both
production builds. The combined repository suite is 123 files and 594 tests.

---

# Product Direction

Stylus is a collaborative startup operating system.

Initial major capabilities:

- team accounts
- organizations
- tasks
- deadlines and reminders
- comments
- notifications
- activity
- whiteboards/moodboards
- company knowledge
- plugin infrastructure
- AI infrastructure

The first major business plugin will be Marketing.

Marketing initially focuses on pre-product Instagram Reel strategy and
creative intelligence.

---

# Completed Planning

The following decisions have been made:

- Stylus will use a modular architecture.
- Core collaboration features are separate from business plugins.
- Marketing is the first business plugin.
- Marketing initially focuses on Instagram Reels.
- Marketing uses multi-agent creative reasoning.
- Competitor Reel analysis is required.
- Reel analysis includes hooks, scripts, visuals, branding and pacing.
- Company and Marketing memory are isolated from Web Agency memory.
- Working content is not automatically permanent AI memory.
- Team task management is required.
- Task reminders are required.
- Completed tasks remain visible for approximately 14 days before being
  moved to an archive.
- Archived tasks are not automatically deleted.
- Collaborative whiteboards/moodboards are required.
- Whiteboards support images, text, sticky notes and comments.
- Stylus must use a professional SaaS UI.
- UI icons use Lucide rather than emojis.
- Initial hosting should avoid mandatory VPS costs.
- The production application must not depend on the developer laptop.
- The Windows laptop may act as an optional heavy AI/media worker.
- Codex sessions use repository documentation for continuity.

---

# Current Technology Direction

Frontend:
- Next.js
- TypeScript

UI:
- Tailwind CSS
- shadcn/ui
- Lucide React

Authentication:
- Supabase Auth

Database:
- Supabase PostgreSQL

Realtime:
- Supabase Realtime where useful

Vector search:
- deferred; pgvector is not installed by TASK-010

File storage:
- Supabase Storage initially

Queue/cache:
- Upstash and/or persisted PostgreSQL job infrastructure depending on
  workload

Local AI:
- Ollama

Heavy worker:
- Python
- Windows-compatible

Media:
- FFmpeg
- OpenCV

Transcription:
- local whisper.cpp CLI with operator-installed model

---

# Hosting Constraint

Initial production infrastructure should have no mandatory paid VPS.

The developer's laptop is NOT a production application server.

Stylus must remain available to teammates while the laptop is powered
off.

Heavy jobs may remain queued until an eligible worker becomes available.

---

# Current Work

TASK-017 External Research is implemented on its task branch and awaits hosted
migrations, pgTAP, immediate execution/daily Cron configuration and manual QA.
TASK-016 is merged. Its
separate five-call immutable review artifact and TASK-015's exact three-call
Reel Brief workflow remain unchanged. TASK-018 and TASK-020 have not started.

---

# Known Issues

Database pgTAP still requires Docker/Podman or hosted execution when a local
database is unavailable. Ask Creative Council persistence, UI, retrieval,
routing, and execution contracts remain intentionally undefined until TASK-020
discovery. TASK-016 expansion, TASK-017 research, and TASK-018 performance
learning remain separate concerns. The synchronous five-call workflow also
depends on the target server sustaining its bounded 285-second deadline; if the
deployment cannot, it fails safely and a future execution-placement decision is
required rather than a silent job conversion.

---

# Next Recommended Action

Apply the TASK-017 migrations in hosted Supabase, run its pgTAP suite, configure
the authenticated hosted immediate executor and daily recovery Cron, then
complete the documented HN, RSS,
provenance, prompt-injection, partial-failure, SSRF, provider-unavailable, RBAC
and TASK-015/TASK-016 regression QA. Do not begin TASK-018 or TASK-020.

---

# Next Session Handoff

TASK-015 is complete and merged. Its synchronous Create workflow remains Hook
Strategist (`balanced`) -> Script Writer (`balanced`) -> Creative Critic
(`reasoning`) -> versioned Reel Brief, with exactly three successful calls, no
tools, no durable memory retrieval/write, and safe structured Reasoning History.

TASK-016 adds Audience (`balanced`) -> Brand (`balanced`) -> Strategy
(`reasoning`) -> Challenge (`reasoning`) -> Judge (`reasoning`) over an exact
Reel Brief, with five calls maximum, 60-second call timeouts and a 285-second
deadline. Successful stages and final versions are immutable; failures preserve
prior stages and never fabricate a review. Trend, Competitor, Retention and
Visual are registered but unused in V1.

TASK-020 is the future Ask Creative Council product: bounded question routing to
the smallest approved specialist workflow and one synthesized team-facing
answer. It must preserve organization/RBAC/plugin/AI-policy boundaries,
ModelGateway-only execution, agency-memory isolation, explicit bounded context,
and no automatic memory writes, arbitrary tools, arbitrary spawning, or raw
chain-of-thought. TASK-017 research and TASK-018 performance learning may later
supply explicitly authorized evidence but are never implicit in asking a
question.

---

# Historical TASK-014 Handoff

Read:

1. AGENTS.md
2. PROJECT_STATE.md
3. CODEX_TASKS.md
4. docs/ROADMAP.md
5. docs/DECISIONS.md

TASK-014 is implemented on `codex/task-014-competitor-reel-analysis`; its hosted
migration is applied. Real Windows QA completed extraction and transcript
persistence, then ModelGateway recorded a LOCAL_ONLY Ollama
`provider_unavailable` failure before structured interpretation could persist.
The affected job exhausted its bounded retries and is now `DEAD_LETTER`; it must
not be executed again.

V1 accepts manually uploaded MP4 files only (100 MiB maximum, 180 seconds
maximum analyzed duration). A source/Instagram URL is bounded metadata and is
never fetched. Private organization-scoped Storage holds source media;
archiving preserves media and history until a future controlled cleanup tool.

The optional outbound Windows worker performs fixed FFmpeg/ffprobe extraction
and local whisper.cpp transcription, then the hosted application performs
text-only structured interpretation through ModelGateway. OCR, semantic vision,
Instagram acquisition, automatic memory promotion, and TASK-015 Creative
Council work remain deferred. Local database lint/pgTAP are pending because the
current machine has no Docker/Podman PostgreSQL stack.

TASK-014 corrective hardening removes the Python/faster-whisper/PyAV/CTranslate2
runtime because Windows Smart App Control blocked PyAV 18.1.0 during manual QA.
Stylus does not weaken Windows security. The worker now advertises Marketing
analysis only when its configured whisper.cpp CLI executes successfully, its
model is readable, and the required structured-output contract is available.
Corrective verification passed formatting, lint, both typechecks, 30 worker
tests, 468 web tests (498 total), and both production builds. No dependency or
database migration changed.

The interpretation correction preserves the safe ModelGateway route and
lets the existing terminal-job trigger own Reel/analysis failure state instead
of marking domain records failed while a retry is scheduled. The broker returns
a normalized retry category to the worker, the worker preserves it in the
dedicated failure report, and safe server diagnostics identify request-schema
versus RPC/claim failures without logging media, transcripts, tokens, or
credentials. A retry currently repeats deterministic extraction and local
transcription before interpretation; resumable interpretation is deferred.

Second Windows QA reached Ollama with `qwen3:1.7b`. The exact strategic schema
contains `summary.maxLength: 2000`; llama.cpp's grammar parser rejects a single
repetition count at its 2,000 sanity threshold. Synthetic requests reproduce 400
at 2,000 and succeed at 1,999. The Ollama adapter now omits only string bounds it
cannot represent, while the unchanged Zod schema remains the authoritative
post-response validator. Structured HTTP 400 is normalized as
`invalid_response`, which maps to non-retryable `validation_failed`.

Hosted metadata shows the QA job is `FAILED` at attempt 1/3 with
`validation_failed`. That terminal row proves its authenticated failure report
reached the database RPC; the separately observed `/fail` 400 was not the
accepted report's response. Exact `validation_failed`/`false` serializer and
broker coverage is now permanent, and safe diagnostics distinguish malformed
failure envelopes from malformed payloads without logging either body.
Earlier provider tests used small synthetic schemas and mocked HTTP, so they
never exercised llama.cpp's grammar threshold. Earlier failure tests covered
`provider_unavailable`/`true`, not the exact `validation_failed`/`false` pair or
the persisted hosted transition.

## Phase 14 TASK-017 External Research

TASK-017 adds one durable `marketing.external-research.run` SERVERLESS job and
an authenticated hosted executor that processes at most one claim per Cron
invocation. Research requests atomically create the domain run and job, enforce
one active run per organization and five submissions per hour, and derive
organization/actor authority on the server. Hacker News uses a fixed official
API host; up to two RSS/Atom feeds pass through centralized HTTPS-only,
pinned-DNS safe fetch with redirect, address, timeout and byte revalidation.

Deterministic code normalizes plain text, applies the 20-item/24k-character
ceilings, hashes and deduplicates, then persists immutable source and EVID-n
records. A partial run may synthesize retained evidence after source failures.
Zero evidence fails without a report. Synthesis uses exactly one maximum
`generateAIStructuredForTrustedJob` call at balanced tier and validates every
source-backed reference before persisting the immutable report. Retrieved
evidence remains auditable when AI policy/provider execution fails.

No Reddit, generic search, article crawling, Windows-worker dependency,
automatic Council research, agency memory, or automatic knowledge/memory write
was introduced. TASK-015 and TASK-016 remain unchanged. Local pgTAP execution
requires Docker/Podman, which was unavailable during implementation. The final
linked dry run passed and reported
`20260825001700_external_research.sql` pending; nothing was applied. Linked
database lint completed with only the pre-existing TASK-015 enum-assignment
warning. The TASK-017 pgTAP suite and hosted manual QA remain
deployment checks.

Focused TASK-017 verification passed 12 files / 60 tests. The final complete
suite passed 128 web files / 616 tests plus 5 worker files / 32 tests (648
tests total). Repository lint, worker/web typechecks and worker/web production
builds passed. Every TASK-017 source/document file passes targeted Prettier.
Repository-wide Prettier still reports the 55 known unrelated legacy/Windows
formatting files; they were preserved rather than rewritten.

### TASK-017 Vercel Hobby execution correction

Vercel Hobby rejects sub-daily Cron expressions, so the recovery schedule is
now `0 3 * * *` (daily at 03:00 UTC, with Hobby timing variance). A successful
hosted enqueue registers a stable Next.js `after()` callback that runs the same
registry-backed `JobExecutor` after the Server Action response. The callback
targets only the trusted job ID returned by the service-only atomic enqueue;
`20260825001710_claim_serverless_job.sql` adds the service-only `SKIP LOCKED`
claim needed to preserve exact-job execution and concurrent claim safety.

The durable job remains authoritative. Immediate execution failure leaves an
unclaimed job queued, and the authenticated daily Cron route drains at most one
remaining SERVERLESS job. Both paths use the same registry, store and atomic
database lease. Hobby functions are limited to 60 seconds even though the
durable job contract retains its 120-second timeout; runs exceeding the hosted
function window fail safely and require a platform with a longer function
duration rather than bypassing the queue or AI policy.

Corrective verification passed 9 focused files / 41 tests, 131 web files / 627
tests and 5 worker files / 32 tests (659 full-suite tests total). Lint,
worker/web typechecks, worker/web production builds and targeted formatting
passed. The pgTAP plan now contains 35 assertions. Linked migration dry-run
reported exactly `20260825001700_external_research.sql` and
`20260825001710_claim_serverless_job.sql` pending and applied neither. Linked
database lint still reports only the pre-existing TASK-015 warning.

### TASK-017 Hacker News hosted-QA correction

Hosted QA proved that the fixed HN stream and its sampled item requests had
completed successfully, but all candidates were removed at filtering because
each multi-word query input was previously required to occur as one contiguous
literal phrase. The `no_results` outcome therefore represented stage-C zero
matches, not a Vercel timeout, Firebase transport failure or RSS safe-fetch
rejection.

Filtering now tokenizes normalized Unicode query inputs and candidates, then
matches deterministic bounded keywords. HN payloads receive strict bounded
schema validation and deleted, dead, non-story and blank candidates remain
ineligible. HN and RSS adapters persist healthy zero-candidate/zero-match
observations as successful sources while zero retained evidence still prevents
synthesis and safely fails the overall run. Actual retrieval failures retain
their existing database category plus a safe diagnostic category and bounded
counts/HTTP status in existing `safe_metadata`.

No `01720` migration was required for that matching-only correction: the
applied source table already supported a successful observation with a
deterministic content hash and bounded JSON metadata. SSRF policy, fixed HN
host, RSS pinned-DNS/TLS hostname validation,
redirect revalidation, byte/time bounds, immutable provenance, one synthesis
maximum and job claim/idempotency boundaries remain unchanged.

Corrective verification passed 14 focused files / 79 tests, 131 web files / 634
tests and 5 worker files / 32 tests (666 full-suite tests total). Lint,
worker/web typechecks, worker/web production builds and targeted formatting for
all 16 changed files passed. Repository-wide Prettier continues to report only
the same 55 unrelated baseline files; none was rewritten. Hosted QA confirms
`01700` and `01710` are applied, and this correction adds no migration.

### TASK-017B External Research content enrichment

TASK-017B preserves the durable TASK-017 job and enriches only the first two
deterministically matched HN stories. Each matched story can yield separate
`HN_STORY`, `HN_TEXT`, `HN_COMMENT` and `ARTICLE_CONTENT` evidence. Discussion
selection keeps at most five top-level comments per story, the first listed
reply when usable at one nested level, and ten comments per run. Linked articles are limited
to two unique HTTPS URLs per run and pass through the existing pinned-DNS fetch
boundary before deterministic `htmlparser2` extraction and paragraph-based
chunking.

The runtime reserves the 60-second Hobby window: retrieval is capped at 20
seconds, article/comment requests at 8 seconds each, synthesis at 25 seconds,
the complete workflow at 55 seconds, and five seconds are reserved for durable
completion. Article responses are capped at 512 KiB; extracted article text at
4,500 characters in at most three 1,500-character chunks; evidence at 20 items,
24,000 total persisted characters, 18,000 synthesis-evidence characters and a
40,000-character serialized synthesis context. Enrichment
network concurrency is at most two inside the existing three-request gate.

`20260825001720_external_research_content_enrichment.sql` is the forward-only
schema correction. It extends immutable evidence with typed per-item
provenance, content hashes and bounded metadata, replaces only the service-only
retrieval RPC, preserves RLS and does not rewrite `01700` or `01710`. The pgTAP
plan now includes 38 assertions. Hosted evidence rows confirm that the migration
has been applied to Supabase.

Article/comment failure remains partial when story evidence survives. Safe
diagnostics include `extraction_failed` and `empty_content`; no response body,
header, address, stack trace, prompt, credential or raw model output is stored.
Exactly one trusted ModelGateway synthesis remains the maximum, with external
text explicitly treated as untrusted quoted data and no tool or memory access.
TASK-017C remains future fashion-oriented source expansion: Reddit plus bounded
web/fashion-editorial discovery. Social-platform intelligence remains separate.

Focused TASK-017B verification passed 8 files / 72 tests. The final complete
suite passed 132 web files / 655 tests plus 5 worker files / 32 tests (687 tests
total). Targeted formatting, repository lint, worker/web typechecks and both
production builds passed. The linked migration dry-run reported only `01720`
pending and applied nothing; linked database lint reported only the pre-existing
TASK-015 enum-assignment warning. The 38-assertion pgTAP suite was updated, but
local execution remains blocked because the local Supabase Docker database is
not running.

Hosted QA later proved that linked-article transport stopped before opening a
socket on Node 24: the HTTPS client requested an `all: true` custom lookup
result, while the pinned lookup returned the legacy scalar callback shape.
Node rejected that shape with `ERR_INVALID_IP_ADDRESS`, previously normalized
as `connection_failure`. The lookup now returns the same single validated pin
as a one-entry array when requested, retains scalar compatibility otherwise,
and categorizes that runtime-contract error as `transport_failure`. No SSRF,
DNS, TLS, redirect, size, timeout, tenant or evidence boundary changed.

Corrective verification passed 3 focused files / 45 tests and the complete web
suite at 132 files / 656 tests. Targeted formatting, web lint, worker/web
typechecks and both production builds passed. No migration or hosted database
change is required for this transport correction.

The next hosted enriched run proved retrieval and all 12 evidence rows, then
made one `openai-compatible` / `remote-default` structured attempt. A prior
attempt returned 1,598 of the 1,600 allowed output tokens with finish reason
`length` and `structured_output_truncated`; the enriched retest returned no
provider response before the former 25-second synthesis timeout. Neither case
reached evidence-reference post-validation or report persistence. The exact
14,190-character, 12-evidence synthesis context was below its 40,000-character
ceiling.

Synthesis now supplies a per-run structured schema whose evidence-reference
enum is exactly the EVID identifiers in context, preserves post-validation,
and bounds report breadth so a useful concise report fits the unchanged 1,600
output-token ceiling. The synthesis allowance is 35 seconds inside the existing
55-second workflow and five-second durable-completion reserve; timeout remains
single-attempt and safe. Evidence display sorts numeric EVID suffixes without
changing immutable IDs. No retrieval, migration, provider, authorization,
prompt-injection, memory, tool or one-call boundary changed.

Synthesis corrective verification passed 4 focused files / 31 tests and the
complete web suite at 132 files / 659 tests. Targeted formatting, web lint,
web typecheck and the web production build passed. Worker code was unaffected,
so its suite/build were not rerun. No migration was added or changed.

A final hosted `Creepy Crawlies` run proved the complete enrichment path with
13 immutable evidence rows, including three `ARTICLE_CONTENT` chunks. Its one
AI attempt returned 1,598 tokens with finish reason `length`; the durable
diagnostic was again `structured_output_truncated`, so JSON validation could
not produce typed data and report persistence was not reached. This was not a
provider timeout: the AI run completed in 32,288 ms inside the 35-second limit.

The remaining defect was a mismatch between the 1,600-token ceiling and the
synthesis schema's still-permissive maximum response: the prose requested
conciseness, but the schema allowed six findings, four patterns, four
recommendations and substantially longer text. Synthesis-only hard limits now
match the prompt at four findings, two patterns, two recommendations, one
disagreement and two inferences, with shorter field and citation bounds. All
13 input evidence records remain available, the exact per-run EVID enum and
post-validation remain intact, and the one-call/35-second/provider-policy
contracts are unchanged. No migration is required; hosted retest remains.

Final response-bounds corrective verification passed 4 focused files / 32
tests and the complete suites at 132 web files / 660 tests plus 5 worker files
/ 32 tests (692 tests total). Targeted formatting, repository lint, worker/web
typechecks and both production builds passed. No migration was added or changed.

Two independent post-`a686c2e` hosted synthesis attempts then failed earlier at
the provider-envelope boundary. `Creepy Crawlies` and the separate CDLM article
both received HTTP-success JSON that did not match the OpenAI-compatible
envelope; neither exposed usage, finish reason or `message.content`, and neither
reached report JSON parsing, dynamic EVID validation or persistence. The CDLM
AI run `fec8fd9e-f518-4aaf-bd4d-6596d0a2ad36` failed after 7,869 ms with
`provider_envelope_invalid`, independently establishing a repeated provider
response pattern rather than another timeout or truncation.

The adapter remains fail-closed. Provider-envelope failures now retain only up
to five Zod issue codes and bounded schema paths in the existing 500-character
safe diagnostic. Raw bodies, field values, content, prompts, headers,
credentials and arbitrary provider error text remain discarded, and the Zod
error object is not attached as an error cause. This is observability hardening
only: provider validation, research behavior, schema, timeout, retry,
provenance, persistence and routing are unchanged. No migration is required.

Provider-envelope diagnostic verification passed 4 focused files / 38 tests
and the complete suites at 132 web files / 662 tests plus 5 worker files / 32
tests (694 tests total). Targeted formatting, repository lint, worker/web
typechecks and both production builds passed.

The deployed `a4727726` CDLM run subsequently proved that its provider envelope
was valid: one `remote-default` attempt returned `finishReason=stop`, complete
usage metadata and string `message.content`. The gateway then failed before
report-schema validation because that string was malformed JSON. The generated
request used `response_format.type=json_schema`, `strict=true`, a closed schema
whose object properties are all required, and the exact EVID-1 through EVID-10
enum. No prompt, response body or generated content was retained or inspected.

OpenRouter documents that provider routing otherwise permits providers to
ignore unsupported parameters. Structured requests to the exact OpenRouter
host now add `provider.require_parameters=true`; other compatible endpoints and
ordinary text requests are unchanged. The `openrouter/free` alias remains a
random, changing free-model pool and is unsuitable as a deterministic hosted
structured-output contract. Deployment should select a concrete advertised
structured-output model before the single report-success retest. No migration,
retry, JSON repair, timeout/token increase or research-boundary change is
required.

Final hosted acceptance passed on the concrete-model deployment. Research run
`1a293e26-3946-4574-a4e7-5e2dd5e6ddfc` persisted one `HN_STORY`, ten bounded
`HN_COMMENT` records and three `ARTICLE_CONTENT` chunks with typed provenance.
Its single `remote-default` structured attempt finished with `stop`, validated
the exact per-run evidence enum including cited `EVID-14`, and created exactly
one immutable version-1 Research Report. No retry, repair, additional model
call, memory write or downstream Council workflow occurred.

### TASK-017C Fashion Marketing Intelligence

TASK-017C extends the merged durable research job without changing its enqueue,
immediate hosted execution, daily recovery, claim/lease, authorization or AI
policy boundaries. One server-derived intent produces an inspectable controlled
source plan. Reddit is selected for consumer discussion/language intents,
curated editorial feeds support fashion and retail context, and Hacker News is
selected only for `FASHION_TECH`.

Reddit uses application-only OAuth against fixed official hosts only when the
operator has explicit Reddit approval and enables complete server-only
configuration. The code-owned Marketing registry selects at most two relevant
communities and two query variants. Missing approval/configuration is a safe
unavailable source; there is no HTML, cookie, browser-session or anti-bot
fallback. Curated Vogue and Retail Dive feeds and their allowlisted articles use
the existing pinned-DNS HTTPS boundary. A narrow optional search-provider
interface exists, but no paid provider is required or configured.

The immutable evidence contract adds `REDDIT_POST` and `REDDIT_COMMENT` while
retaining all TASK-017B types. One maximum ModelGateway call classifies bounded
fashion signals and produces strategic Content Opportunity Candidates, never
finished hooks, scripts, shots, CTAs, captions or Council decisions. Every
signal and opportunity has one to three exact current-run EVID references; the
application and database independently reject foreign references. Deterministic
source coverage exposes family diversity, failures and unavailability.

Forward migration
`20260825001730_fashion_marketing_intelligence.sql` extends adapter/evidence and
report-version checks, replaces only the enqueue/completion functions, and
retains the existing RLS, immutable-history triggers, one-active-run constraint,
five-runs/hour limit and service-role-only lifecycle. No Council, memory,
TASK-018 or TASK-020 execution was added. TASK-017D remains future social/visual
source discovery.

Verification completed on 2026-08-31: 9 focused files / 77 tests and the full
135-file / 700-test web suite passed; repository lint, worker/web typechecks,
the web production build, scoped TASK-017C formatting and npm audit passed with
zero vulnerabilities. The linked Supabase dry run confirmed only
`20260825001730_fashion_marketing_intelligence.sql` is pending and applied
nothing. Local pgTAP remains a hosted-verification item because Docker/Podman is
not installed on this machine.

Hosted QA then found that the shared token matcher accepted two unrelated Vogue
items because each explicit multi-word term contained the generic token
`fashion`. TASK-017C now applies a dedicated deterministic editorial relevance
profile: meaningful explicit-term concepts take precedence, generic
fashion/request vocabulary cannot establish relevance, and meaningful question
concepts are only a fallback when the explicit terms contain no usable topic.
Feed metadata is gated before article fetching and safely extracted article
content is checked independently before it can become evidence. The two hosted
oversize diagnostics were confirmed as Vogue article bodies correctly rejected
by the unchanged 512 KiB limit. Corrective verification passed 7 focused files /
52 tests, the complete 136-file / 708-test web suite, scoped formatting, lint,
web typecheck and the production web build. No migration was required.

Final hosted acceptance passed after corrective commit
`9bbe02a7b23cd74f06b3b09025201c32ec6c382f`. Initial hosted QA had retained
unrelated Vogue evidence because generic `fashion` overlap was accepted. An
intermediate 15:58 UTC run persisted `AUDIENCE_PAIN` because that intent was
selected by the operator; it was not an intent-propagation defect. The final
deliberate `TREND_SIGNAL` run
`d49b4df5-bc5e-4f1b-9571-bc1706915a39`, backed by job
`671777c3-b743-411f-952c-178323c9924f`, checked 30 Vogue and 10 Retail Dive
candidates, retained zero matches, and safely failed retrieval while Reddit was
unavailable by policy. Hacker News was not selected. It persisted zero evidence
and reports and created zero AI runs, Council invocations or memory writes; no
TASK-017D, TASK-018 or TASK-020 behavior ran. Refusing to synthesize unsupported
sustainable-fashion claims is the correct zero-evidence outcome.

### TASK-017D Fashion Social Intelligence

TASK-017D extends the existing durable External Research workflow with a common
`SOCIAL` adapter boundary and first-class Instagram, TikTok, YouTube and
Pinterest capability states. Official-policy review intentionally activates no
production transport in V1: Meta professional/public-content access requires
approval and an account authorization lifecycle; TikTok Research Tools exclude
commercial product use; YouTube public discovery conflicts with the current
immutable evidence lifecycle's 30-day refresh/deletion obligations; and
Pinterest has no configured arbitrary public-listening path. Selected social
sources therefore return bounded `source_unavailable` observations and never
fall back to scraping, private APIs, browser automation or consumer sessions.

The deterministic planner adds social only to relevant consumer/competitor
intents and leaves `FASHION_TECH` unchanged. Browser input cannot select a
platform, profile, competitor, organization, actor, provider or model.
Organization-scoped competitor identities reuse `marketing_competitors` and are
validated by RLS plus the service-only enqueue function. Typed immutable social
evidence preserves platform, native/parent IDs, public account context,
retrieval/publication times, modality, deterministic hashes and bounded metrics.
Comment authors are not retained. Caption/comment/metadata evidence cannot
support visual claims, and competitor claims require configured competitor
provenance.

Ordinary research still performs deterministic retrieval/filtering/deduplication
and exactly zero or one trusted ModelGateway synthesis. It invokes no media
worker, Council, Reel Brief, memory, posting, TASK-018 or TASK-020 path. The
forward migration is `20260825001740_fashion_social_intelligence.sql`; the
predeployment linked dry run reported exactly that migration pending and
applied nothing. The hosted migration ledger now contains the same migration.
Local pgTAP remains unavailable because Docker/Podman is not installed.

Hosted acceptance passed on 2026-09-01 with `AUDIENCE_LANGUAGE` run
`823ef89e-bfae-4dda-9e53-11a61bd23f72` and durable SERVERLESS job
`b7e064d4-868c-44dc-811c-eacbb9f0a3b0`. The persisted deterministic plan
selected `REDDIT` plus `SOCIAL`; the social adapter resolved to `YOUTUBE` and
recorded `POLICY_DENIED` / `source_unavailable`, while Reddit recorded the same
safe unavailable outcome. The run and job failed safely with zero evidence,
zero reports, a null `synthesis_ai_run_id`, and zero attributable `ai_runs`.
The bounded execution window also contained zero Creative Council or Strategic
Review runs, zero memory writes, and no downstream job other than this External
Research job; TASK-018 and TASK-020 did not execute. This fail-closed result is
the correct V1 acceptance behavior and produced no unsupported social claims.

### TASK-017E Fashion Web & Consumer Evidence Expansion

TASK-017E implementation is complete locally and hosted acceptance is pending.
The deterministic fashion planner can add a `WEB` family only for applicable
intents and only when bounded server-built query variants contain meaningful
concepts. Tavily Search is the fixed-host discovery provider; its response is
transient candidate metadata, not evidence. Stylus requests no answer or raw
content and persists no provider snippet. Every retained URL independently
passes public-HTTPS policy, robots policy, pinned-DNS safe fetch with redirect
revalidation, deterministic article extraction and the existing fashion
relevance gate before immutable `WEB_PAGE` evidence is created.

Per run, the implementation permits at most three search queries, eight search
results per query, twelve unique candidates, six attempted page fetches, four
retained pages, two 1,500-character chunks per page and eight web evidence rows,
under the existing concurrency-three, four-MiB, 20-evidence, 20-second
retrieval, 35-second synthesis and 55-second workflow ceilings. A run still
makes exactly zero or one trusted ModelGateway call and invokes no Creative
Council, memory, worker, TASK-018 or TASK-020 path.

The forward migration is
`20260825001750_fashion_web_consumer_evidence.sql`. It adds only the controlled
adapter/evidence/report contract and forward-replaces the service-role enqueue
and completion validation functions. Existing RLS, one-active-run,
five-runs/hour, immutable history and organization/plugin boundaries remain.
Do not mark TASK-017E complete or merge-ready until one deliberate hosted
acceptance run passes.

Local verification passed on 2026-09-01: 10 focused files / 125 tests, the full
141-file / 791-test web suite, 5 worker files / 32 tests, repository lint,
worker/web typechecks, both production builds, scoped formatting, migration
contracts and npm audit with zero vulnerabilities. The linked dry run reported
only `20260825001750_fashion_web_consumer_evidence.sql`. Its first apply exposed
an ambiguous inline `CASE` parser boundary in the enqueue function; the
unapplied migration was corrected to compute the source-count limit in a typed
local variable. PostgreSQL then accepted the migration and the linked ledger
now records `01750` applied. Local pgTAP could not run because Docker/Podman is
unavailable. Hosted acceptance remains the only completion gate.

The first deployed acceptance run
`60e2773d-4f5e-474a-a1fa-0d90b6f43c5b` (job
`addf9949-069c-44f2-bb8e-1d3a3cc88154`) exposed a shared persistence defect:
three Tavily candidates independently passed URL policy, robots, safe fetch,
extraction and fashion relevance, but `buildRetrievalPersistence` did not
include the new `WEB_PAGE` evidence type in its deterministic priority list.
The durable run therefore recorded three successful full-page source
observations but zero evidence, AI runs or reports and failed safely. The
handler now prioritizes `WEB_PAGE` drafts, with a regression proving exact
`EVID-1` persistence and one trusted synthesis. Focused verification passes 2
files / 17 tests; the complete web suite passes 141 files / 792 tests together
with lint, web typecheck, scoped formatting and the production web build. One
new deployed acceptance run remains required; the failed run is immutable.
