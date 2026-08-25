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
