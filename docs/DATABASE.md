# Stylus — Database Direction

This document defines the initial conceptual data model.

Exact schemas are introduced through migrations during implementation.

---

# Identity

Supabase Auth owns users in `auth.users`.

Phase 1 introduces:

`organizations`

- `id` UUID primary key
- `name` constrained to 2–80 trimmed characters
- `created_by` references `auth.users`
- `created_at`
- `updated_at`

`memberships`

- `organization_id` references `organizations`
- `user_id` references `auth.users`
- `role` uses `OWNER`, `ADMIN`, `MEMBER` or `VIEWER`
- `created_at`
- primary key: `(organization_id, user_id)`
- nullable `removed_at`; removed members retain provenance but have no active access

TASK-007 prerequisite migration
`20260825000720_organization_team_invitations.sql` introduces
`organization_invitations` with normalized email, MEMBER/VIEWER role, unique
SHA-256 token hash, inviter, status, expiry and acceptance/revocation timestamps.
A partial unique index prevents duplicate pending email invitations per tenant.

Invitation lists never return token hashes. Manager functions create, regenerate
and revoke invitations; acceptance takes only the raw token, locks the row,
verifies status/expiry/authenticated email and atomically creates or reactivates
membership. Removal softly revokes access to preserve historical provenance.

Initial organization creation uses the authenticated-only
`create_organization` database function. Organization insertion and the
creator's `OWNER` membership occur in one transaction.

Direct client mutation of memberships is not granted in Phase 1. Organization
members may read their organization, users may read their own memberships, and
only owners/admins may update the organization name. RLS and server-side
authorization both enforce these boundaries.

Granular roles and permissions remain future work.

---

# Organization Plugins

TASK-008 migration `20260825000800_plugin_framework.sql` introduces
`organization_plugins`:

- composite `(organization_id, plugin_id)` identity
- stable validated machine-safe plugin ID
- enabled state and enable/disable timestamps
- database-derived enabling/updating membership provenance
- creation/update timestamps and active-state index

Rows are never deleted by disablement. Members may read only their organization's
state through RLS. OWNER/ADMIN use a pinned-search-path function that derives the
actor and repeats role checks; browser roles receive no direct insert, update or
delete grants. Registered manifest values remain application authority rather
than a brittle PostgreSQL enum, so unknown well-formed rows are inert.

---

# Tasks

Phase 3 introduces migration `20260825000400_task_management.sql`.

`tasks`

- UUID primary key and required `organization_id`
- controlled `task_status`: `TODO`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- controlled `task_priority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- one nullable assignee enforced by a composite organization-membership foreign key
- creator/updater membership provenance
- separate UTC `scheduled_at` and `due_at` timestamps
- database-managed `completed_at`, creation and update timestamps
- constraints for title/description length, date order and completion consistency
- indexes for organization/status, organization/assignee, deadlines and completion history

`task_comments`

- organization/task composite ownership
- bounded comment body, creator and creation timestamp
- retained with the task; no update/delete grant in Phase 3

`list_organization_task_members(uuid)` is an authenticated, membership-checked
directory RPC. It returns only member IDs, display names and roles required for
assignment; it does not expose emails or authentication records.

Tasks support:

- status
- priority
- due_at
- completed_at
- a derived Archive view for completions older than 14 days

Completed tasks are never hard-deleted automatically. Recent and archived
visibility is derived from `completed_at`, so no background archival mutation is
required.

---

# Notifications

Phase 4 introduces migration
`20260825000500_reminders_notifications_activity.sql`.

`notifications`

- organization boundary and composite recipient membership foreign key
- controlled deadline-reminder type
- concise title/body and optional controlled entity reference; no stored URL
- database timestamps for creation and read state
- recipient/recent and recipient/unread indexes
- recipient-only reads through RLS
- scoped database functions for marking one or all notifications read

`task_reminder_deliveries`

- immutable task, recipient, reminder kind, exact deadline version and channel
- initial `IN_APP` channel with a channel-aware idempotency key that later
  delivery adapters can reuse
- notification reference and database processing timestamp
- no browser grants or policies

`process_task_reminders(timestamptz)` reads current assigned TODO/IN_PROGRESS
tasks and memberships. It creates at most one 24-hour, one-hour or deadline
notification per deadline version and is executable only by a trusted database
role.

---

# Activity

`activity_events`

- immutable organization, actor, controlled event, entity and timestamp fields
- compact JSON metadata limited to task presentation context
- created by trusted task/comment triggers, never browser inserts
- organization-member read policy and no update/delete grants

---

# Whiteboards

Phase 5 introduces migration `20260825000600_whiteboard_foundation.sql`.

`boards`

- organization-scoped UUID identity, bounded title and creator/updater provenance
- archive timestamp rather than a browser delete grant
- active organization/update index for the board list

`board_elements`

- composite `(organization_id, board_id)` ownership
- controlled `TEXT`, `STICKY`, `IMAGE`, `SHAPE` and `ARROW` type
- finite bounded position, positive dimensions, rotation and deterministic z-index
- independently persisted content, style and metadata JSON objects
- text, sticky, shape and arrow presentation stored in the existing style JSON;
  the TASK-006 usability completion pass requires no schema migration
- creator/updater provenance and archival removal
- active board/order and organization/board indexes

Board elements contain:

- type
- x
- y
- width
- height
- rotation
- z-index
- content
- style
- metadata

The board is not stored as one opaque JSON document. Triggers prevent board,
organization and creator reassignment, require authenticated audit identities,
and touch the parent board after element changes. OWNER, ADMIN and MEMBER mutate;
VIEWER reads only.

Supabase Storage bucket `board-images` is private, limited to 10 MB PNG, JPEG and
WebP objects, and protected by organization-path membership/role policies.
Archiving an image element retains its private object so non-destructive recovery
remains possible; a future permanent purge workflow may remove archived assets.

TASK-007 adds migrations `20260825000700_extend_collaboration_enums.sql` and
`20260825000710_whiteboard_collaboration.sql`.

`board_comments` stores organization/board scope, optional element context,
optional one-level parent, authenticated author, bounded body and soft removal.
Composite foreign keys prevent cross-board and cross-organization links.
`board_comment_mentions` stores structural recipient UUIDs; duplicate recipients
are constrained and every recipient must be a current organization member.

Comment creation is atomic through `create_board_comment`: it validates the board,
active element, collaborator role and mentioned memberships before committing the
comment, mention relations, `BOARD_MENTION` notifications and `BOARD_COMMENTED`
activity. Direct browser comment writes and hard deletes are not granted.

`board_elements` and `board_comments` are added to `supabase_realtime`; RLS still
applies to Postgres Changes. Presence is ephemeral and has no application table.

---

# Company Knowledge

Phase 2 introduces authoritative onboarding source data through migration
`20260825000200_company_onboarding.sql`:

`company_profiles`

- one row per organization
- identity, stage, problem, startup idea, product concept and positioning
- controlled `company_stage` and `product_status` enums
- arrays only for variable lists such as capabilities and reasons to believe

`audience_profiles`

- supports multiple organization-scoped segments
- onboarding establishes one primary segment through a partial unique index
- structured characteristics, pains, goals, motivations, objections and channels

`brand_profiles`

- one row per organization
- optional personality, voice, perception and visual direction
- `brand_status` supports founders whose branding is not decided

`marketing_profiles`

- one row per organization
- controlled primary/secondary objectives and marketing stage
- multiple channels and content-focus areas without assuming Instagram exclusivity

`competitors`

- zero or more organization-scoped records
- `DIRECT`, `INDIRECT`, `ALTERNATIVE` and `INSPIRATION` types
- removals are archived through `archived_at`

`onboarding_progress`

- one row per organization
- durable current step and completion timestamp
- `advance_onboarding_progress(uuid, smallint)` records an absolute completed
  step idempotently, so retries cannot advance twice

All six tables are readable by organization members and mutable only by owners
or administrators. RLS uses the Phase 1 organization helpers. Database triggers
prevent organization, original creator or onboarding-starter reassignment and
require authenticated updater provenance.

TASK-010 migrations `20260825001000_company_knowledge_memory.sql` and
`20260825001010_company_memory_lifecycle.sql` do not duplicate any of these
rows. The second migration deliberately follows the first so newly extended
activity enum values commit before lifecycle functions use them. A server-only
composer reads the canonical tables into normalized identity, problem, product,
audience, positioning, brand, marketing and competitor sections. Missing
onboarding sections remain explicit null/empty values.

---

# Durable Memory

`knowledge_memories` stores only explicitly approved durable context:

- organization and controlled `company`, `marketing` or `agency` domain
- controlled fact, decision, insight, preference or note kind
- bounded title/content and structured metadata
- controlled human, plugin, imported or system provenance
- optional safe source reference, plugin owner and effective timestamp
- creator/updater and archive provenance
- soft archival rather than browser deletion

Database constraints bind human memory to the company domain with no plugin
identity and require plugin provenance to name an owning plugin. Browser roles
have no direct INSERT/UPDATE/DELETE grants. Narrow company-memory functions
derive `auth.uid()`, require OWNER/ADMIN/MEMBER, and always write `HUMAN` /
`company` provenance. VIEWER is read-only.

Member SELECT RLS exposes only company-domain memory for the active
organization. This prevents generic Core/browser queries from disclosing
plugin-private Marketing or Agency memory. Plugin-owned persistence is not
available through a forgeable generic authenticated function; a future plugin
must add a trusted, plugin-specific persistence boundary.

`search_company_memories` supports active/archived state, kind, provenance and
indexed simple full-text filtering. Input is limited to 100 characters, output
to 50 rows, and ordering is stable by `updated_at desc, id desc`. AI context is
further capped at 20 rows in application code.

The migration extends activity enums for create, update, archive and restore.
Activity metadata contains the title/kind only, never full memory content.

No embedding column, vector index, pgvector extension, chunk table or ingestion
pipeline is introduced.

---

# Organization AI Policy and Runs

TASK-009 migration `20260825000900_ai_foundation.sql` introduces:

`organization_ai_policies`

- one optional row per organization; absence is treated as AI disabled
- controlled `DISABLED`, `LOCAL_ONLY` and `REMOTE_ALLOWED` execution modes
- controlled FAST, BALANCED and REASONING default logical tier
- bounded deployment provider-ID allowlist, never provider URLs or credentials
- optional monthly estimated remote-cost ceiling
- manager updater provenance and timestamps

`ai_runs`

- stable UUID and explicit organization/actor membership provenance
- nullable plugin identity for explicit Core operations
- operation, declared capability and manifest memory-domain trace metadata
- requested tier plus selected stable model/provider IDs and local/remote flag
- controlled lifecycle status and safe normalized error category
- timing, token usage and optional estimated cost
- optional same-organization parent run for future bounded composition
- bounded JSON object trace metadata that rejects raw prompt/response key names

Corrective migration `20260825000910_fix_ai_trace_metadata_constraint.sql`
replaces the applied recursive JSONPath expression with an immutable recursive
helper. The original expression called object-only `keyvalue()` on scalar
descendants and blocked otherwise valid run initialization. The replacement
continues rejecting forbidden keys at every object/array depth without applying
object methods to scalar values.

Run rows do not contain API keys, complete prompts, model responses or hidden
chain-of-thought. Provider diagnostics are normalized before persistence.
Organization members can read their organization's metadata through RLS. Tables
have no direct browser writes: pinned-search-path functions derive the actor,
verify active role and enabled plugin state, and enforce one terminal transition.

Future agent/workflow records may reference `ai_runs`; TASK-009 does not create
reasoning-step or memory-retrieval tables.

Store explicit agent outputs, decisions and rationale designed for the
application.

---

# Jobs

TASK-011 migration `20260825001100_heavy_job_infrastructure.sql` introduces the
organization-scoped `jobs` table and controlled job status, execution class and
error-category enums.

Corrective migration `20260825001110_fix_job_enqueue.sql` replaces only
`public.enqueue_job`. It casts the function's initial QUEUED/SCHEDULED `CASE`
branches to `public.job_status`; without those casts PostgreSQL resolved the
expression as `text` and rejected the enum-column insert with SQLSTATE `42804`.
The function signature, privileges and security boundary are unchanged.
The same migration replaces `public.process_database_jobs` only to cast its 50%
progress argument to the existing `smallint` RPC signature; its execution class,
handler allowlist and grants remain unchanged.

The row records trusted Core/plugin provenance, capability, schedule, priority,
attempts, timeout, progress, bounded input/result metadata, cancellation,
idempotency, parent retry, claimant, lease and lifecycle timestamps. Partial
indexes cover the claimable queue and stale leases; organization/status, creator,
parent and optional idempotency access paths are indexed.

Authenticated users receive RLS-protected SELECT only. Narrow enqueue,
cancellation and manager retry functions derive the actor and repeat role/plugin
checks. Claim, heartbeat, progress, terminal transition and reconciliation
functions are service/database execution only. `claim_next_job` uses
`FOR UPDATE SKIP LOCKED`; transaction advisory locks protect idempotency, queue
limits and concurrency groups.

`job_definitions` is a browser-inaccessible database allowlist matching the
trusted TypeScript registry. Enqueue rejects unknown types or any caller-supplied
provenance/execution settings that differ from the registered definition, then
persists the definition values rather than the request values.

The database-native `core.test.echo` handler proves hosted Cron execution without
turning PostgreSQL into a media/network worker. See `docs/JOBS.md`.

TASK-012 migration `20260825001200_windows_workers.sql` adds protected worker
registrations and expiring one-time pairing rows. Raw pairing and durable
credentials are never stored. Human management functions derive `auth.uid()`;
service-only broker functions validate the credential digest before scoped
heartbeat, atomic EXTERNAL_WORKER claim or lease-owned lifecycle mutation. It
also registers the fixed `core.test.worker-echo` definition.

---

# Marketing

TASK-013 introduces exactly five plugin-owned canonical record tables:

- `marketing_competitors`, with an optional same-organization reference to the
  Core onboarding `competitors` row
- `marketing_campaigns`
- `marketing_reel_ideas`, with an optional campaign reference
- `marketing_research`, for manually entered notes only
- `marketing_creative_briefs`, with an optional campaign reference

Every table is organization-scoped, provenance-audited, RLS-protected, and
soft-archived. Composite foreign keys prevent cross-organization references;
archiving campaigns preserves related history. Reel media, transcripts,
analysis, performance, automated research, embeddings, and reasoning tables
remain deferred.

---

# Isolation

All organization-owned data must contain or inherit an enforceable
organization boundary.

AI memory additionally requires domain isolation.

Use RLS where appropriate.

## Competitor Reel Intelligence

TASK-014 adds `marketing_competitor_reels` as a child of the existing
same-organization `marketing_competitors`; it is deliberately unrelated to
`marketing_reel_ideas`. Source metadata and bounded deterministic metrics live
on the Reel. Full bounded text and timestamped segments live in
`marketing_competitor_reel_transcripts`, never job metadata.

`marketing_competitor_reel_analyses` preserves monotonically numbered versions,
job provenance, extraction/schema versions, optional `ai_runs` linkage, status,
and a bounded structured result. One active version is created atomically with
one registered EXTERNAL_WORKER job. Old versions are never overwritten.

The private `marketing-reel-media` bucket accepts `video/mp4` objects up to
104857600 bytes at `<organization>/<reel>/source.mp4`. RLS derives organization
from the path. Browser roles cannot write transcripts or analyses; narrow
service-role broker functions validate worker credential, organization, job,
claim, lease, Reel, and analysis relationships before signed access or writes.

## Creative Council V1

Migration `20260825001500_creative_council_v1.sql` adds:

- `marketing_creative_council_runs` for source, actor, bounded context snapshot,
  explicit status/current stage, normalized failure, workflow version, and
  request idempotency;
- `marketing_creative_council_evidence` for ordered same-organization TASK-014
  analysis references and bounded allowlisted projections;
- `marketing_creative_council_stages` for immutable Hook, Script, or Critique
  success/failure records with optional same-organization `ai_runs` provenance;
  and
- `marketing_reel_brief_versions` for immutable user-facing script packages and
  monotonically numbered versions per source Reel Idea.

Authenticated clients receive RLS-protected SELECT only. Service-role-only,
pinned-search-path functions start and advance runs after validating active
OWNER/ADMIN/MEMBER membership, Marketing enablement, same-organization active
source/evidence, legal stage order, logical tier, and AI-run provenance. The
failure transition is service-only and may only terminalize the matching
creator's current RUNNING stage, allowing safe cleanup if membership changes
mid-call. Advisory locks plus a unique idempotency key and partial one-active-run
index prevent duplicate execution. Only the completion function, after Hook and
Script rows exist and Critic AI succeeded, inserts a Reel Brief. No hard-delete
or update surface exists for history.
