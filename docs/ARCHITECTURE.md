# Stylus — Architecture

## Architectural Style

Stylus begins as a modular monolith with external managed infrastructure.

Avoid premature microservices.

---

# Repository Layout

The repository uses npm workspaces:

- `apps/web` contains the Next.js application and its local UI foundation.
- `packages/typescript-config` contains shared strict TypeScript defaults.

Future packages should be added only when code has a real cross-application
or cross-module consumer. Core and plugin business modules have not been
introduced during Phase 0.

---

# High-Level Architecture

Users
  |
  v
Stylus Web Application
  |
  +-- Authentication
  +-- Organizations
  +-- Tasks
  +-- Notifications
  +-- Whiteboards
  +-- Company Knowledge
  +-- Plugin Platform
  +-- AI Platform
  |
  +------ Supabase
  |       +-- Auth
  |       +-- PostgreSQL
  |       +-- Realtime
  |       +-- Storage
  |       +-- pgvector
  |
  +------ Queue / Job Infrastructure
  |
  +------ Optional Hosted AI
  |
  +------ Optional Windows Heavy Worker
              |
              +-- Ollama
              +-- FFmpeg
              +-- OpenCV
              +-- transcription

---

# Core vs Plugins

Core owns reusable platform capabilities.

Plugins own business capabilities.

Core must never import Marketing business logic.

Marketing may depend on public Core interfaces.

---

# Authentication Boundary

Supabase Auth sessions use `@supabase/ssr` and HTTP cookies.

- Browser code receives only the project URL and publishable key.
- Server Components, Server Actions and Route Handlers create request-scoped
  server clients that operate as the authenticated user.
- Next.js Proxy refreshes sessions and performs optimistic route redirects with
  verified claims.
- Protected pages and every mutation independently revalidate identity and
  authorization on the server; Proxy is not the sole security control.
- TASK-002 does not require or instantiate a service-role client.

---

# Organization Boundary

Every authenticated application context resolves an explicit organization only
after validating the current user's membership. Client-supplied organization
identifiers are UUID-validated and checked against membership server-side.

PostgreSQL grants and RLS provide defense in depth. Organization creation is an
authenticated atomic database function that creates both the organization and
its creator's `OWNER` membership.

Team invitations use server-generated 256-bit random tokens. Only SHA-256 hashes
are stored; the plaintext token is returned once for manual sharing. Atomic
database functions derive organization and role, verify the authenticated email,
create/reactivate membership and mark acceptance. A validated HTTP-only
organization-selection cookie selects the accepted tenant without becoming an
authorization source.

Member removal is soft so provenance foreign keys and business history remain
intact. Authorization helpers and directories exclude removed rows.

Company onboarding never accepts an organization boundary from browser form
data. Server Actions derive the current organization from the authenticated
membership context, explicitly require `OWNER` or `ADMIN`, map accepted fields,
and then operate through the authenticated Supabase client. RLS repeats the
membership and role checks at the database boundary.

The onboarding records are authoritative structured company source data. They
do not create AI memory, embeddings or knowledge-retrieval records.

---

# Company Onboarding Flow

The protected workspace resolves organization setup before company onboarding.
Incomplete organizations resume from persisted `onboarding_progress`; completed
organizations enter the workspace without repeating onboarding. The same
structured records remain editable from Company Profile after completion.

Each successful step write is followed by one awaited, idempotent database
operation that records the absolute completed step. Navigation occurs only after
the durable next step is returned; no broad layout refresh competes with the
redirect. Repeating the same request cannot increment progress twice.

---

# Core Modules

Planned Core modules:

- auth
- organizations
- memberships
- permissions
- tasks
- notifications
- activity
- comments
- whiteboards
- company-knowledge
- events
- jobs
- plugins
- AI
- memory

---

# Task Management Boundary

Task management is a Core collaboration module. Server Components derive the
current organization and query only that scope; Server Actions map accepted
fields and never accept an organization or audit identity from the browser.

PostgreSQL repeats this boundary through RLS, composite organization/member
foreign keys, immutable provenance triggers and restricted column grants.
OWNER, ADMIN and MEMBER collaborate on tasks and comments, while VIEWER remains
read-only. Completion timestamps are database-managed and repeat completion is
idempotent. The 14-day Completed/Archive split is a deterministic read behavior,
not deletion or background infrastructure.

Scheduled and due inputs are local browser wall-clock values converted to UTC
instants for PostgreSQL `timestamptz` persistence, then formatted in the user's
local timezone. Overdue remains derived from active status, deadline and current
time. The client schedules a single refresh at the nearest future active
deadline so server-filtered views cross that boundary without polling.

---

# Whiteboard Boundary

Whiteboards are a Core collaboration module. React Flow supplies local canvas
geometry, pan, zoom, selection and resize interactions; it does not own the
database model. Every board element is an independently addressable PostgreSQL
row so authorization, partial updates and future realtime collaboration do not
depend on a monolithic board JSON document.

Server Components derive the active organization and reconstruct a board from
active ordered element rows. Server Actions validate explicit mutation schemas,
derive organization/creator/updater provenance, and persist only at bounded
interaction points. PostgreSQL repeats the boundary through composite board/org
foreign keys, restricted column grants, provenance triggers and RLS.

The editor keeps at most 75 local element snapshots. Each user-level operation
records once at its commit boundary; undo/redo diffs adjacent snapshots and
persists the resulting authorized update, archive or restore operations. This is
local editing history, not event sourcing, and reload reconstructs the last
persisted state from normal element rows.

Images use the private `board-images` Supabase Storage bucket. Object paths begin
with the validated organization and board IDs; membership/role storage policies
control object access, and the editor receives one-hour signed URLs. No service
role credential or public bucket is used.

TASK-007 subscribes only while a board is open, using a private board topic for
filtered element/comment Postgres Changes and Presence. Presence carries a user
ID; display names and roles come from the authorized server-loaded directory.
Connectivity failure is surfaced without disabling local editing.

Editor history is now a bounded list of local element patches. Realtime rows
never become undo entries, same-element remote changes invalidate stale local
history, and remote changes received during an active local edit wait for the
server response. Database timestamps determine the winner without CRDT
infrastructure.

---

# Plugin Modules

Initial:

- marketing

Future:

- web-agency
- additional business capabilities

---

# Event Architecture

Important state changes emit domain events.

Examples:

- task.created
- task.assigned
- task.completed
- task.archived
- board.comment.created
- user.mentioned
- knowledge.approved
- reel.ingested
- reel.analyzed
- agent.run.completed
- campaign.created
- plugin.installed

Events enable loosely coupled reactions such as notifications and
activity logging.

Phase 4 keeps recipient notifications separate from organization activity.
Task and comment triggers write immutable audit entries after successful
database mutations. A narrowly executable PostgreSQL reminder processor reads
current task/member state, versions deduplication by the exact UTC deadline, and
atomically creates in-app notification plus delivery ledger records.
The ledger includes a controlled `IN_APP` channel so future delivery adapters
can share the reminder event/version boundary without changing current UX.

Hosted Supabase Cron is the deployment scheduler boundary and should call
`public.process_task_reminders()` every five minutes. No browser, local laptop,
Node daemon, queue service or always-on VPS participates. The schedule is an
explicit hosted deployment step rather than a migration side effect.

---

# Heavy Work

Heavy operations are asynchronous.

Flow:

Request
-> persisted job
-> available worker claims job
-> worker updates progress
-> worker persists result
-> event emitted
-> user notified

The web application must not depend on a worker being continuously
online.

---

# AI Boundary

All AI access passes through:

ModelGateway

Logical capabilities:

- fast
- general
- reasoning
- vision
- embedding
- transcription

Providers are implementation details.

---

# Memory Boundary

Memory retrieval requires explicit:

- organization scope
- domain scope
- optional workspace scope

No unrestricted global semantic search is permitted.

---

# Deployment Principle

The initial architecture prioritizes:

- no mandatory VPS
- free-tier infrastructure where practical
- low idle cost
- portability
- future migration without application redesign
