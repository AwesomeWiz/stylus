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

Future Company Knowledge tables:

company_knowledge
decisions
experiments

Exact decomposition may evolve during implementation.

---

# AI Memory

ai_memories

Required scoping:

- organization_id
- workspace_id where applicable
- domain_id

Additional conceptual fields:

- memory_type
- content
- embedding
- metadata
- source_type
- source_id
- created_by
- created_at

---

# AI Runs

reasoning_sessions
reasoning_steps

Record enough information to understand:

- workflow
- participating agents
- models
- inputs
- outputs
- timing
- status

Do not expose hidden model chain-of-thought.

Store explicit agent outputs, decisions and rationale designed for the
application.

---

# Jobs

jobs

Conceptual fields:

- organization_id
- domain_id
- type
- payload
- status
- priority
- claimed_by
- claimed_at
- heartbeat_at
- progress
- retry_count
- max_retries
- result
- error
- created_at
- completed_at

---

# Marketing

competitors
social_accounts
reels
reel_transcripts
reel_scenes
reel_analysis
campaigns
creative_briefs
content_performance
research_items
research_clusters

Exact tables should be introduced incrementally.

---

# Isolation

All organization-owned data must contain or inherit an enforceable
organization boundary.

AI memory additionally requires domain isolation.

Use RLS where appropriate.
