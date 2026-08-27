# Stylus — Codex Task Queue

# Current

## TASK-011 — Heavy Job Infrastructure

Status: COMPLETE / READY FOR MANUAL QA

Phase: 9

Implemented scope:

- organization-scoped durable PostgreSQL jobs with controlled lifecycle
- trusted static Core/plugin registry with Zod input/output contracts
- server-derived enqueue context, plugin enablement and queue/idempotency limits
- atomic `SKIP LOCKED` claims, leases, heartbeats and concurrency-group locks
- deterministic bounded retry/backoff, stale recovery and dead-letter retention
- cooperative cancellation, timeouts, bounded progress/results and safe errors
- replaceable DATABASE/SERVERLESS/EXTERNAL_WORKER execution classes
- real database-native `core.test.echo` handler for hosted Supabase Cron
- generic server-only executor contract and deterministic test adapter
- protected `/jobs` operational UI with role-aware cancel/retry controls
- organization RLS, worker-only lifecycle grants and pgTAP coverage
- no domain workloads, Edge Function, Redis, VPS or Windows worker

Manual-QA hardening:

- job queue, schedule, cancellation and retry buttons explicitly submit their
  Server Action forms; regression coverage protects the form boundary
- forward migration `20260825001110_fix_job_enqueue.sql` repairs PostgreSQL
  enum typing in the durable enqueue insert; real-path pgTAP and safe
  persistence diagnostics cover the hosted failure
- the same migration repairs the database processor's `smallint` progress call;
  linked dry run confirms it is the sole pending migration and hosted lifecycle
  QA remains required

---

# Next

## TASK-012 — Windows Worker

Status: READY

Phase: 9

Do not begin until TASK-011 has completed manual QA and is merged through the
normal workflow.

---

# Completed

## TASK-010 — Company Knowledge and Memory

Status: COMPLETE

Implemented scope includes canonical Company Knowledge composition, explicit
provenance-aware durable memory, bounded deterministic retrieval, lifecycle
controls, a trusted AI context boundary, organization/domain isolation and the
company-only `/memory` workspace.

## TASK-008 — Plugin Framework

Status: COMPLETE

Implemented scope includes trusted static plugin registration, organization
enablement, capabilities, navigation, events, route guards, safe metadata-only
AI extension declarations and the development example plugin.

---

## TASK-007 — Whiteboard Collaboration

Status: COMPLETE

Implemented scope includes board-scoped Realtime, private Presence, comments,
mentions, activity, bounded collaborative history, team invitations and the
final comment/copy usability refinements. Team dates render with an explicit
locale and timezone so server and browser hydration remains deterministic.

---

## TASK-005 — Reminders, Notifications and Activity

Status: COMPLETE / READY FOR MANUAL QA

Phase: 4

Implemented scope matches the current TASK-005 handoff above. External delivery
channels and mention notifications remain future work.

---

## TASK-004 — Task Management

Status: COMPLETE / READY FOR MANUAL QA AGAIN

Phase: 3

Implemented scope:

- organization-scoped task creation and editing
- controlled TODO, IN_PROGRESS, COMPLETED and CANCELLED lifecycle
- LOW, MEDIUM, HIGH and URGENT priority
- single same-organization assignee or unassigned work
- scheduled and due timestamps with UTC-safe validation
- My Tasks, All Tasks, Upcoming, Overdue, Completed, Archive and Calendar views
- composing title, assignee, status and priority filters
- database-managed idempotent completion and reopening
- 14-day recent-completion visibility with non-destructive derived archive
- lightweight organization-scoped task comments
- compact responsive rows, accessible dialogs, loading/error/empty states
- OWNER/ADMIN/MEMBER collaboration and VIEWER read-only behavior
- server-derived organization/audit scope, restricted column grants and RLS
- pgTAP, action, lifecycle, filtering, migration-contract and UI coverage

Migration `20260825000400_task_management.sql` requires manual application.
Authenticated role and responsive visual QA remain required before merge.

---

## TASK-003 — Company Onboarding

Status: COMPLETE

Phase: 2

Implemented scope:

- structured eight-step company onboarding and profile editing
- durable resumability and completion routing
- organization-scoped company, audience, brand, marketing and competitor data
- OWNER/ADMIN mutation policies with member reads
- idempotent first-submit progress advancement and navigation regression coverage

---

## TASK-002 — Authentication and Organizations

Status: COMPLETE

Phase: 1

Implemented scope:

- Supabase SSR integration with cookie-based sessions
- signup, email confirmation, login and logout
- protected route redirects and authenticated session detection
- organization and membership schema with role foundation
- atomic initial organization creation with OWNER membership
- validated server-side organization context helpers
- restricted grants and row-level security policies
- application shell account and organization context
- authorization, session, migration-contract and UI tests

Real Supabase flow and pgTAP verification remain documented deployment checks
because local Docker and project credentials were unavailable during TASK-002.

---

## TASK-001 — Repository Foundation

Status: COMPLETE

Phase: 0

### Objective

Create the initial Stylus repository foundation.

Do not implement business functionality.

### Requirements

Establish:

- monorepo structure
- Next.js web application skeleton
- TypeScript
- Tailwind CSS
- shadcn/ui foundation
- Lucide React
- shared package structure
- linting
- formatting
- testing
- environment validation
- .env.example
- design tokens
- application shell foundation
- module boundaries
- placeholder public interfaces only where justified

Create an initial professional application shell containing:

- sidebar
- top navigation area
- main content region
- responsive navigation behavior

The shell should establish the Stylus visual direction without
implementing real business pages.

### UI Requirements

- professional SaaS appearance
- Lucide icons
- no emojis as interface icons
- restrained styling
- neutral surfaces
- accessible contrast
- responsive
- no excessive gradients
- no glassmorphism-heavy design
- no glowing UI
- no unnecessary animations

### Do NOT Implement

- real authentication flows
- task management
- reminders
- notifications
- whiteboard functionality
- marketing functionality
- Reel analysis
- AI agents
- AI model calls
- Web Agency integration

### Acceptance Criteria

- dependencies install successfully
- development server starts
- application shell renders
- lint passes
- typecheck passes
- tests pass
- production build passes
- repository follows documented architecture
- no business functionality has been prematurely implemented
- documentation matches implementation

### Completion Procedure

After verification:

1. Mark TASK-001 COMPLETE.
2. Update PROJECT_STATE.md.
3. Update docs/ROADMAP.md.
4. Move TASK-002 to Current.
5. Record unresolved issues if any.

---

# Planned Queue

## TASK-006 — Whiteboard Foundation

Planned scope:

- boards
- infinite/canvas workspace
- pan
- zoom
- text
- sticky notes
- images
- shapes
- arrows
- drag
- resize
- layering

---

## TASK-007 — Whiteboard Collaboration

Planned scope:

- comments
- element comments
- @mentions
- realtime updates
- board activity
- permissions

---

## TASK-008 — Plugin Framework

Planned scope:

- plugin manifest
- registry
- capability registration
- permissions
- navigation contributions
- event handlers
- plugin isolation
- example test plugin

---

## TASK-009 — AI Foundation

Planned scope:

- ModelGateway
- provider adapters
- logical model profiles
- deterministic policy/budget routing
- normalized text and structured generation
- trusted tool registry foundation
- AI policy and metadata-only run lifecycle
- fake provider for testing

No agents, workflows, memory retrieval or Marketing execution yet.

---

## TASK-011 — Heavy Job Infrastructure

Planned scope:

- persisted jobs
- worker claims
- progress
- retries
- heartbeat
- stale job recovery
- failure handling

---

## TASK-012 — Windows Worker

Planned scope:

- worker authentication
- job claiming
- Ollama detection
- FFmpeg detection
- transcription dependency detection
- heartbeat
- result upload
- dummy end-to-end heavy job

---

## TASK-013 — Marketing Plugin Foundation

Planned scope:

- Marketing plugin
- navigation
- competitors
- Reels
- campaigns
- research
- creative briefs

No full agent council yet.

---

## TASK-014 — Competitor Reel Analysis

Planned scope:

- manual Reel/video ingestion
- media job
- audio extraction
- transcription
- scene detection
- representative frames
- OCR where appropriate
- structured creative analysis

---

## TASK-015 — Creative Council V1

Initial agents:

- Hook Strategist
- Script Writer
- Creative Critic

---

## TASK-016 — Creative Council Expansion

Add:

- Audience Researcher
- Trend Researcher
- Competitor Analyst
- Content Strategist
- Retention Editor
- Visual Director
- Brand Director
- Creative Judge

---

## TASK-017 — Marketing Research

Planned scope:

- source adapter interface
- permitted web sources
- Reddit-compatible source strategy
- Hacker News
- RSS
- web research
- normalization
- deduplication
- clustering
- evidence storage

---

## TASK-018 — Marketing Performance Learning

Planned scope:

- published Reel records
- performance snapshots
- experiments
- learnings
- feedback into future Creative Council workflows

---

## TASK-019 — Web Agency Integration

Future only.

Integrate the separate AI Web Agency through Stylus plugin interfaces.

Agency memory must remain isolated.
