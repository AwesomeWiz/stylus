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

Initial organization creation uses the authenticated-only
`create_organization` database function. Organization insertion and the
creator's `OWNER` membership occur in one transaction.

Direct client mutation of memberships is not granted in Phase 1. Organization
members may read their organization, users may read their own memberships, and
only owners/admins may update the organization name. RLS and server-side
authorization both enforce these boundaries.

Granular roles and permissions remain future work.

---

# Tasks

tasks
task_assignees if multiple assignees are supported
task_comments
task_reminders

Tasks support:

- status
- priority
- due_at
- completed_at
- archived_at

Completed tasks should not be hard-deleted automatically.

---

# Notifications

notifications

Possible fields:

- organization_id
- user_id
- type
- title
- body
- entity_type
- entity_id
- read_at
- created_at

---

# Activity

activity_events

Used for auditable team activity.

---

# Whiteboards

boards
board_elements
board_comments
board_members where needed

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
