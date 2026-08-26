# Stylus — Architecture Decision Record

## ADR-001 — Stylus Is a Modular Monolith Initially

Status: ACCEPTED

Stylus will begin as a modular monolith rather than a collection of
microservices.

Reason:

- small team
- easier development
- easier Codex navigation
- easier testing
- zero/low infrastructure budget
- current scale does not justify distributed services

---

## ADR-002 — Marketing Is a Plugin

Status: ACCEPTED

Marketing is business functionality and must not become part of Stylus
Core.

---

## ADR-003 — Web Agency Is a Separate Domain

Status: ACCEPTED

The AI Web Agency is a separate business capability.

It may later integrate with Stylus through the plugin architecture.

It must not share unrestricted memory with company/marketing AI.

---

## ADR-004 — Domain-Isolated AI Memory

Status: ACCEPTED

AI memory is scoped by organization and domain.

Initial domains:

- company
- marketing
- agency

Marketing can retrieve company + marketing.

Agency retrieves agency only by default.

Isolation is enforced in code and tested.

---

## ADR-005 — Working Content Is Not Automatically Memory

Status: ACCEPTED

Tasks, whiteboard content, comments and drafts do not automatically become
permanent Company Knowledge.

Explicit promotion is required.

---

## ADR-006 — ModelGateway

Status: ACCEPTED

Business modules and agents never directly call model providers.

All model access passes through ModelGateway.

---

## ADR-007 — Bounded Agent Workflows

Status: ACCEPTED

Stylus does not initially use unlimited free-form agent conversations.

Multi-agent workflows have defined stages and stopping conditions.

---

## ADR-008 — No Mandatory VPS Initially

Status: ACCEPTED

Initial production architecture should avoid mandatory VPS subscription
costs.

Use free-tier/serverless infrastructure where practical.

---

## ADR-009 — Developer Laptop Is Optional Compute

Status: ACCEPTED

The Windows development laptop may perform heavy jobs but is never the
production application server.

Stylus remains usable while it is offline.

---

## ADR-010 — Professional SaaS UI

Status: ACCEPTED

Stylus uses a restrained professional productivity-system design.

Lucide is the standard icon system.

Emojis are not used as interface icons.

---

## ADR-011 — Completed Tasks Are Archived

Status: ACCEPTED

Completed tasks remain in the normal completed view for approximately
14 days.

Afterward they are archived rather than deleted.

Historical task records remain available.

---

## ADR-012 — Repository-Based Codex Continuity

Status: ACCEPTED

Codex sessions must not depend on previous conversation history.

AGENTS.md, PROJECT_STATE.md, CODEX_TASKS.md and /docs are the persistent
handoff mechanism.

---

## ADR-013 — Supabase SSR and Defense-in-Depth Tenancy

Status: ACCEPTED

Stylus uses Supabase Auth through `@supabase/ssr` with cookie-backed sessions.
Next.js Proxy refreshes sessions and provides early redirects, but every
protected server operation independently verifies identity and organization
membership.

Organization isolation is enforced by both reusable server authorization
helpers and PostgreSQL grants/RLS. Initial organization creation uses a narrowly
granted, security-definer database function with an empty search path so the
organization and creator `OWNER` membership are committed atomically.

No service-role client is introduced for normal authentication or organization
operations.

---

## ADR-014 — Structured, Resumable Company Onboarding

Status: ACCEPTED

Company onboarding is persisted as pragmatic structured relational records,
not a questionnaire JSON blob and not AI memory. Company, audience, brand,
marketing and competitor records share an explicit organization boundary, while
an onboarding-progress record controls resumability and completion routing.

Variable founder-supplied lists use bounded arrays where separate entities would
add little value. Audience profiles and competitors remain separate tables so
additional segments and competitors can be added later. Records stay editable
after completion, competitor removal is archival, and only owners or
administrators may mutate authoritative company context.

---

## ADR-015 — Lightweight, Organization-Scoped Task Collaboration

Status: ACCEPTED

The first task system uses one organization-scoped record with one optional
assignee, controlled status/priority, distinct scheduled and due timestamps, and
lightweight comments. OWNER, ADMIN and MEMBER collaborate; VIEWER is read-only.

Completion timestamps are database-managed and idempotent. The primary Completed
view shows the last 14 days, while older completions appear in Archive without
being mutated or deleted. This avoids background archival infrastructure and
keeps historical work intact.

---

## ADR-016 — Database-Native In-App Reminder Delivery

Status: ACCEPTED

Initial task reminders are derived and delivered by a deterministic PostgreSQL
function invoked approximately every five minutes by hosted Supabase Cron. The
processor rechecks the current task deadline, active status, assignee and
membership, then atomically creates an in-app notification and a deadline-
versioned idempotency record.

Notifications are private recipient messages. Activity events are separate,
immutable organization history produced by database triggers. No always-on Node
worker, developer laptop, VPS, external delivery channel or arbitrary stored
redirect URL is introduced. Hosted Cron activation remains an explicit
deployment step.

---

## ADR-017 — Relational Whiteboard Elements with React Flow

Status: ACCEPTED

TASK-006 uses the MIT-licensed React Flow library for canvas interaction while
retaining Stylus-owned rendering, mutation and persistence boundaries. Boards
are reconstructed from independently addressable organization-scoped element
rows rather than one opaque JSON document.

Writes occur at bounded interaction boundaries instead of pointer frequency.
Images live in a private organization-path Supabase Storage bucket and are
rendered through short-lived signed URLs. This foundation deliberately omits
realtime subscriptions, comments and presence so TASK-007 can add collaboration
over a stable authorized element model.

---

## ADR-018 — Bounded Local Whiteboard History with Persisted Transitions

Status: ACCEPTED

TASK-006 undo/redo keeps at most 75 active-element snapshots in the editor. One
snapshot is recorded per completed user operation rather than per pointer event.
Moving between snapshots produces ordinary organization-scoped update, archive
or restore actions, so reload reflects the last successful history state.

This deliberately avoids event sourcing and adds no database schema. Future
realtime collaboration must reconcile concurrent changes separately rather than
treating this single-session history as a shared event log.

---

## ADR-019 — Scoped Whiteboard Realtime and Local Operation History

Status: ACCEPTED

TASK-007 uses one private `board:<uuid>` Supabase Realtime channel per open board.
Postgres Changes are filtered by `board_id` for authorized element and comment
rows. Presence carries only a user identity; presentation comes from the
server-loaded organization member directory. Subscriptions are removed when the
editor unmounts. Pointer movement and presence are never persisted.

Local history stores at most 75 element operation patches. Remote operations do
not enter local history, unrelated remote changes survive local undo/redo, and a
remote change to an active local element waits for the bounded local write. The
persisted row with the newest database `updated_at` wins. This is deterministic
last-write reconciliation, not a CRDT or shared event log.

Comments and mention identities are created atomically by a permission-checking
`SECURITY DEFINER` RPC with an empty search path. The database derives scope,
author, recipients, notifications and activity; shallow replies and organization
membership are relational invariants.

---

## ADR-020 — Hashed Manual-Link Organization Invitations

Status: ACCEPTED

The TASK-007 multi-user QA prerequisite uses application-generated 256-bit
invitation tokens with SHA-256 hashes stored in PostgreSQL. Email delivery is not
fabricated: managers manually share the link until a transactional-email adapter
is configured.

Acceptance is atomic and takes only the token. PostgreSQL locks the invitation
and derives organization, role and expected normalized email. Invitations grant
only MEMBER or VIEWER. Membership removal softly revokes access because existing
business records retain membership provenance foreign keys.
