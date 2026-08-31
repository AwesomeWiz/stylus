# Stylus — Codex Task Queue

# Current

## TASK-017C — Fashion Marketing Intelligence

Status: COMPLETE / READY FOR MANUAL QA

The existing TASK-017 durable SERVERLESS path now plans source families from one
controlled Marketing intent before retrieval. Ordinary fashion-consumer intents
use approved-configuration Reddit and/or curated fashion editorial sources;
Hacker News is selected only for `FASHION_TECH`. Immutable evidence adds Reddit
post/comment provenance, and the versioned fashion report produces bounded
signals plus strategic content opportunity candidates with exact EVID
citations. Retrieval remains deterministic and final interpretation makes zero
or one trusted ModelGateway call. TASK-015/TASK-016 are not invoked. TASK-017D,
TASK-018 and TASK-020 have not started.

Reddit is disabled by default. Enabling its fixed-host OAuth adapter requires
Reddit approval for the exact deployment/use case plus complete server-only
configuration. No HTML scraping or fallback exists. Curated Vogue and Retail
Dive feeds remain available through centralized pinned-DNS safe fetch; optional
search discovery has a narrow interface but no mandatory paid provider.

Verification passed with 9 focused files / 77 tests and the full 135-file /
700-test web suite. Repository lint, worker/web typechecks, the web production
build, scoped formatting and npm audit also passed. The linked non-applying
Supabase dry run reports only
`20260825001730_fashion_marketing_intelligence.sql` pending. Local pgTAP could
not run because Docker/Podman is unavailable; the migration and hosted source
paths remain for manual QA.

Hosted relevance hardening rejects editorial candidates whose only overlap is
generic vocabulary such as `fashion`, `style` or `trend`. Meaningful explicit
terms are authoritative; question concepts are a deterministic fallback only
when those terms are generic. Feed metadata is checked before article retrieval
and extracted article text is checked again before persistence. The hosted
oversize records were Vogue article responses correctly stopped by the existing
512 KiB limit, which remains unchanged. Corrective verification passed 7 focused
files / 52 tests and the full 136-file / 708-test web suite plus formatting,
lint, web typecheck and production build. No corrective migration is needed.

---

# Completed

## TASK-016 — Creative Council Expansion

Status: COMPLETE / MERGED

The exact five-stage Strategic Review and its Creative Judge manual-QA
correction are merged. TASK-017 does not alter or automatically invoke it.

---

## TASK-012 — Windows Worker

Status: COMPLETE / READY FOR MANUAL QA

Phase: 9

Implemented scope:

- optional Node.js/TypeScript Windows worker in `apps/worker`
- OWNER/ADMIN one-time 15-minute pairing and revocation on `/workers`
- SHA-256-only pairing and durable credential persistence
- bounded Next.js broker with server-only service credential, size/rate limits
- organization/capability-scoped atomic EXTERNAL_WORKER claims
- lease renewal, progress, cancellation, timeout, failure/retry and completion
- conservative single-job polling with transient backoff and graceful shutdown
- static handler registry and harmless `core.test.worker-echo`
- user-local Windows config with no service-role or human credential
- 22-assertion database security/lifecycle suite plus application/worker tests
- no FFmpeg, browser, transcription, Ollama or domain workload
- final verification: formatting, lint, both typechecks, 100 files/428 tests,
  both production builds, linked schema lint and zero production audit findings
- linked dry run: only `20260825001200_windows_workers.sql` pending; unapplied
- local Docker/Podman unavailable, so hosted pgTAP/manual QA remain required

Manual-QA hardening:

- worker action state/type moved out of the `use server` module so Next.js 16
  can load `/workers`; boundary and action behavior regressions added
- corrective verification: formatting, lint, both typechecks, 101 files/434
  tests and both production builds passed; no migration required
- pairing broker manual-QA fix: narrowly bypass human-session redirects for
  `/api/worker/*`, enforce JSON failures, harden non-JSON client handling and add
  an explicit transient-feedback pairing-code copy control
- pairing corrective verification: formatting, lint, both typechecks, 102
  files/444 tests and both production builds passed; no migration required

---

## TASK-011 — Heavy Job Infrastructure

Status: COMPLETE

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

Status: READY FOR MANUAL QA

Planned scope:

- Marketing plugin
- navigation
- competitors
- manual Reel Ideas
- campaigns
- research
- creative briefs

No full agent council yet.

Implemented as five plugin-owned, organization-scoped tables with soft
archival, same-organization optional campaign/Core-competitor relationships,
meaningful bounded activity events, guarded routes, and OWNER/ADMIN/MEMBER
write plus VIEWER read policy. No AI, memory writes, jobs, scraping, ingestion,
or comments are part of TASK-013.

---

## TASK-014 — Competitor Reel Analysis

Implemented on `codex/task-014-competitor-reel-analysis`:

- manual MP4 upload with optional metadata-only source URL
- private organization-scoped `marketing-reel-media` Storage
- distinct competitor Reel, bounded transcript, and versioned analysis records
- durable `marketing.competitor-reel.extract` EXTERNAL_WORKER job
- fixed FFmpeg/ffprobe metadata, audio, and bounded scene-cut extraction
- fixed shell-free whisper.cpp local transcription with bounded JSON parsing
- narrow claimed-job signed-download and result-persistence broker operations
- text-only structured ModelGateway interpretation and ordinary `ai_runs` trace
- archive/restore, cancellation, re-analysis, activity, role, plugin, and RLS boundaries
- no Instagram download/scraping, OCR, semantic vision, or automatic memory write

The hosted migration is applied. Manual QA proved the native extraction and
transcript path, then exposed a LOCAL_ONLY Ollama `provider_unavailable` failure
after ModelGateway run initialization. Corrective work preserves the normalized
AI category through the worker failure report and leaves domain failure state to
the terminal-job synchronization trigger. The exhausted QA job is DEAD_LETTER;
use a new analysis version for retest. Do not begin TASK-015 until TASK-014
manual QA is accepted.

Second QA proved Ollama connectivity and isolated its grammar rejection to the
generated `summary.maxLength: 2000`, equal to llama.cpp's rejected repetition
threshold. The Ollama adapter removes only unrepresentable large string bounds;
the original Zod schema still validates every returned object. Structured HTTP
400 maps to terminal `validation_failed`. Hosted state confirms the legitimate
failure report reached the RPC and produced FAILED attempt 1/3; added exact
serializer/broker tests and split safe envelope/payload diagnostics cover the
separately observed 400 without loosening the contract.

Manual-QA corrective hardening replaces Python/faster-whisper/PyAV after Windows
Smart App Control blocked PyAV 18.1.0. The worker now requires explicitly
configured whisper.cpp executable/model paths, validates the complete native
runtime before advertising the Marketing capability, and preserves the existing
bounded transcript and broker contract without a database migration. Stylus
does not disable or weaken Windows application-control policy.

Corrective verification: formatting, lint, worker/web typechecks, 30 worker
tests, 468 web tests (498 total), and worker/web production builds passed. No
dependency or migration change was required. Hosted whisper.cpp manual QA
reached transcript persistence successfully. Interpretation/failure-lifecycle
manual retest remains pending; no additional migration is required.

---

## TASK-015 — Creative Council V1

Status: COMPLETE / MERGED

Initial agents:

- Hook Strategist
- Script Writer
- Creative Critic

Implemented as one deterministic synchronous Marketing workflow starting from
one active Reel Idea. It performs exactly one structured ModelGateway call for
each agent (`balanced`, `balanced`, `reasoning`), persists immutable run/stage
history and versioned Reel Briefs, accepts zero-to-three explicitly selected
completed TASK-014 analyses through an allowlisted projection, and retrieves no
durable Marketing memory. `/apps/marketing/creative-studio` provides bounded
context review, pending-safe execution, stage/history inspection, and VIEWER
read-only access. Database/service idempotency prevents replayed or concurrent
duplicate runs while a new intentional request creates the next version.

Verification passed: 8 focused files/48 tests, lint, worker/web type checking,
5 worker files/32 tests, 112 web files/513 tests, and both production builds.
All TASK-015 files pass formatting. Linked dry-run reports only
`20260825001500_creative_council_v1.sql` pending during implementation; that run
did not apply it. Hosted manual QA was subsequently accepted.

Manual QA was accepted and TASK-015 was merged into `main` as `7a17d2b`.
Its three-agent Create workflow remains unchanged; Ask Creative Council is a
separate future interaction mode.

---

## TASK-016 — Creative Council Expansion

Status: IMPLEMENTED / READY FOR MANUAL QA AGAIN

Add:

- Audience Researcher
- Trend Researcher
- Competitor Analyst
- Content Strategist
- Retention Editor
- Visual Director
- Brand Director
- Creative Judge

Expanded specialists and orchestration primitives must be reusable by both
future bounded Create workflows and bounded Ask Council workflows. Do not bind
agent contracts exclusively to Reel Brief generation. TASK-016 preserves finite,
code-defined workflows and does not implement the full conversational Ask
Creative Council product unless separately authorized.

Implementation adds Challenge Reviewer (`marketing.challenge-reviewer`) and a
five-call Strategic Review artifact without changing TASK-015's three-call Reel
Brief workflow. TASK-016 is merged and TASK-017 follows it as a separate
external-evidence capability.

---

## TASK-017 — Marketing Research

Status: COMPLETE / MERGED

Implemented scope:

- fixed-host Hacker News top/new/ask retrieval
- explicit public-HTTPS RSS/Atom feeds through centralized pinned-DNS safe fetch
- durable SERVERLESS research jobs, immediate hosted execution, and
  authenticated once-daily recovery Cron compatible with Vercel Hobby
- deterministic bounded normalization, hashing, deduplication and evidence
- exactly one trusted structured synthesis maximum
- immutable source, evidence and report history with RLS

The original V1 foundation excluded article-body fetching. TASK-017B adds
matched-story content enrichment without adding Reddit, generic web discovery,
social scraping, automatic Council research or automatic memory promotion.

---

## TASK-017D — Fashion Social Intelligence

Status: FUTURE / NOT STARTED

Future discovery may evaluate feasible, authorized Instagram, TikTok, YouTube
and Pinterest visual/social signals. TASK-017D must not be inferred from the
text/RSS/Reddit boundaries implemented by TASK-017C.

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

---

## TASK-020 — Ask Creative Council

Future approved direction only.

Planned scope:

- conversational Marketing questions from authorized team members
- bounded company-aware Company and Marketing context
- code-defined intent/workflow routing to the smallest approved specialist set
- synthesized team-facing answers with concise perspectives, evidence,
  assumptions, disagreements, risks, and confidence where appropriate
- bounded collaborative conversation/history persistence if justified by its
  discovery pass
- organization, role, plugin, AI-policy, and ModelGateway boundaries
- explicit call, cost, context, and stopping limits using logical model tiers
- optional explicit use of TASK-017 research evidence when a selected workflow
  requires research; ordinary questions do not imply web research
- future TASK-018 performance evidence through an authorized bounded interface

Do not implement Ask Council as a generic chatbot, an unrestricted research
assistant, or an autonomous swarm. It must not expose raw chain-of-thought,
spawn arbitrary agents, invoke arbitrary tools, broaden Marketing into agency
memory, or write durable memory automatically. Its own discovery pass must
define persistence and implementation contracts before development begins.
