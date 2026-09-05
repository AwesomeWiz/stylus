# Stylus — Codex Task Queue

# Current

## Final Production Polish

Status: FINAL DESIGN REFINEMENT VERIFIED / FINAL VISUAL QA READY

The production-polish pass establishes `#0D98BA` as the canonical brand token,
uses the approved Stylus mark in auth/shell/icon metadata, adds hydration-safe
persisted Light/Dark/System appearance, and replaces the Settings placeholder
with real account, organization, team and OWNER-only danger-zone controls.

Team last-sign-in is projected through a server-only Supabase Auth Admin client
only after OWNER/ADMIN authorization. Organization deletion uses exact-name
confirmation, server-derived tenant identity, an OWNER-only transactional RPC,
and exact private Storage inventory/cleanup; it preserves member auth accounts.

Whiteboard collaborator membership uses slow-changing Realtime Presence and
explicitly unions the authoritative local member before deduplicating by user.
High-frequency cursors use throttled Realtime Broadcast on the same private,
organization-and-board-qualified channel. Broadcast carries only session and
bounded flow coordinates; display identity, role and deterministic color come
from authorized Presence plus the server-projected member directory.
The shared Marketing record editor now uses responsive dialogs. Creative
Council, Strategic Review and Ask Council share centralized Lucide specialist
visual metadata and readable substantive typography; their workflows, RBAC,
AI call counts and provenance are unchanged.

Forward migrations: `20260825002010_final_production_polish.sql` and corrective
`20260825002020_fix_whiteboard_realtime_collaboration.sql`. The correction
allows both Presence and Broadcast during private-channel authorization and
removes the payload predicate that Realtime could not evaluate at channel join.

Focused verification passes 17 files / 64 tests. Complete verification passes
161 web files / 912 tests and 5 worker files / 32 tests (166 files / 944 tests
total), repository lint, both TypeScript checks, both production builds, scoped
formatting, migration contracts and audit with zero vulnerabilities. The linked
dry run reports only the production-polish migration pending and applies
nothing. Repository-wide Prettier still reports 139 pre-existing files outside
this diff; they were deliberately not normalized. Docker/Podman and an in-app
browser session are unavailable, so local pgTAP and automated screenshot QA
remain unavailable; the new pgTAP suite is ready for hosted execution.

Whiteboard-correction verification passes the complete web suite (163 files /
921 tests), repository lint, web typecheck, production build, scoped formatting
and migration contracts. The linked dry run reports only `02020` pending and
applies nothing. Hosted two-user Presence/cursor QA remains required after that
migration is applied.

The final design refinement replaces placeholder Home content with a real
permission-aware operating dashboard, strengthens shared typography/spacing
and form controls, introduces centralized editorial pastel surfaces for light
and dark themes, and improves reading rhythm across the densest core and
Marketing screens. `#0D98BA` remains canonical; light primary actions use an
accessible darker derived surface with white text.

Whiteboard collaborators now share one deterministic active-set allocation
across avatars, cursors and labels using eight perceptually separated families.
Duplicate sessions consume one identity, preferred collisions resolve to unused
families, and existing assignments stay stable through ordinary joins/leaves.
No Realtime, RLS, database or migration contract changed. The complete web
suite passes 164 files / 928 tests; final browser visual QA remains manual
because no browser session is available to Codex.

The release-gate correction keeps team last-sign-in retrieval server-authorized
for OWNER/ADMIN and moves only timestamp presentation into a small
hydration-safe client boundary. Native `Intl` formatting follows each viewer's
browser/system timezone and daylight-saving rules without a database change.

Repository onboarding is consolidated in a detailed root `README.md` covering
the implemented Core and Marketing system, architecture, setup, environment
boundaries, verification, deployment and links to canonical documentation.

---

## TASK-020 — Ask Council

Status: CONTEXT RELEVANCE FIX VERIFIED / HOSTED RETEST PENDING

TASK-020 adds the bounded `/apps/marketing/council` advisory workspace. A
server-derived organization/actor context and controlled intent feed a
deterministic versioned route to one to three approved specialists, followed by
exactly one synthesis on full success. All calls use ModelGateway at the logical
`BALANCED` tier; the hard request maximum is four calls and 55 seconds.

Context selection is explicit-first and bounded: canonical Company context, two
existing Research Reports with six exact EVID references, four existing
Performance Learnings, one exact Reel Brief, one exact Strategic Review and six
prior messages inside 32,000 characters. Models receive only safe per-request
reference labels; real artifact UUIDs persist separately in immutable,
same-organization provenance.

Conversation messages, turn routing/context versions, specialist results,
context references and AI-run linkage are durable and immutable. OWNER, ADMIN
and MEMBER execute; VIEWER reads only. Specialist failure deterministically
fails the turn without synthesis, and synthesis failure creates no assistant
answer. Ask Council performs no Create, Strategic Review, Research, performance
derivation, memory, arbitrary-tool, job or Web Agency side effect.

Forward migration: `20260825002000_ask_council.sql`. Final local verification
passes 8 focused files / 46 tests, 153 web files / 883 tests and 5 worker files /
32 tests (158 files / 915 tests total), plus formatting, lint, both typechecks,
both production builds, migration contracts and audit with zero
vulnerabilities. The linked dry run reports only the TASK-020 migration
pending and applies nothing. Docker/Podman is unavailable, so the 35-assertion
pgTAP suite remains a hosted database check. Hosted acceptance remains before
merge readiness.

Hosted acceptance found that automatic Research selection used the literal
follow-up question, accepted one weak substring overlap and then preferred
recency. The corrective
`marketing-ask-council-research-relevance-v2` selector uses exact meaningful
concepts from the current question or the most recent bounded user turn,
requires at least two meaningful matches, ignores generic Marketing/Research/
Reel terms, fails closed to zero automatic reports and deduplicates report and
evidence identities. Explicit report attachments remain authoritative. The fix
adds zero model calls and requires no migration. Focused correction coverage
passes 8 files / 52 tests and the complete web suite passes 153 files / 889
tests. Lint, web typecheck, scoped formatting, the web production build and diff
checks pass. Hosted retest remains before merge readiness.

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

Status: COMPLETE / HOSTED ACCEPTANCE PASSED / READY FOR USER-MANAGED MERGE

Implementation adds a deterministic `SOCIAL` source family, a common official
transport boundary, first-class capability/status records for Instagram,
TikTok, YouTube and Pinterest, typed immutable social evidence, modality-aware
social/content/competitor report fields and an organization-scoped competitor
social-profile registry. No platform is activated in V1 because its current
official approval, intended-use or retention/deletion contract is not yet
compatible with the deployed immutable evidence lifecycle. Selected social
sources fail closed with safe observations; no scraper or unofficial fallback
exists. TASK-017C relevance, exact-EVID, RLS, zero/one ModelGateway synthesis,
partial-source semantics and durable SERVERLESS execution remain authoritative.

Hosted acceptance passed on 2026-09-01. Run
`823ef89e-bfae-4dda-9e53-11a61bd23f72` and SERVERLESS job
`b7e064d4-868c-44dc-811c-eacbb9f0a3b0` persisted the deterministic
`REDDIT` + `SOCIAL` plan. Social resolved to `YOUTUBE`; both selected sources
failed closed as `POLICY_DENIED` / `source_unavailable`. The run persisted zero
evidence and reports, made zero AI calls, and created no Council, Strategic
Review, memory, TASK-018 or TASK-020 side effect. Migration
`20260825001740_fashion_social_intelligence.sql` is present in the hosted
ledger. TASK-017D is ready for user-managed merge; TASK-018 is next after merge.

---

## TASK-017E — Fashion Web & Consumer Evidence Expansion

Status: LOCAL VERIFICATION PASS / HOSTED ACCEPTANCE PENDING

Extend the existing durable External Research workflow with deterministic,
intent-aware bounded public-web discovery for fashion and consumer evidence.
Discovery and fetch remain separate trust boundaries: provider results are
transient untrusted candidates, while every retained page must independently
pass URL policy, centralized pinned-DNS safe-fetch, deterministic extraction,
fashion relevance, normalization and deduplication. Ordinary research remains
bounded to zero or one ModelGateway synthesis call and invokes no Council,
memory, TASK-018 or TASK-020 path.

The implementation uses fixed-host Tavily Search only for transient candidate
URL/title metadata. It requests no provider answer/raw content and persists no
search snippet. Retained `WEB_PAGE` evidence comes only from an independent
robots-aware centralized pinned-DNS fetch and deterministic extraction. The
forward migration is
`20260825001750_fashion_web_consumer_evidence.sql`. TASK-017E remains current
until one hosted acceptance run passes.

Local verification passes: 10 focused files / 125 tests, 141 full web files /
791 tests, 5 worker files / 32 tests, lint, worker/web typechecks, worker/web
production builds, scoped formatting, migration contracts and npm audit with
zero vulnerabilities. The linked dry run reported only migration
`20260825001750_fashion_web_consumer_evidence.sql`. Its first apply exposed an
inline PL/pgSQL `CASE` parser ambiguity; the still-unapplied migration was
corrected to use a typed source-count-limit variable, PostgreSQL accepted it,
and the linked ledger now records `01750` applied. Local pgTAP is unavailable
because Docker/Podman is not installed. Hosted provider execution remains
required before completion.

The first hosted acceptance run reached Tavily and independently retrieved
three relevant full pages, but failed safely with zero evidence because the
shared persistence priority list omitted the new `WEB_PAGE` type. The narrow
correction includes `WEB_PAGE` in deterministic evidence selection without
changing discovery, SSRF, robots, extraction or relevance behavior. Its
regression and adapter suite pass 2 files / 17 tests; the updated full web suite
passes 141 files / 792 tests, plus lint, web typecheck and production build.
One additional deployed acceptance run must pass before completion.

The second hosted run (`197b9fc3-e7c3-4907-91e1-e4255b7db5ce`) retained five
`WEB_PAGE` rows from three independently fetched full pages, confirming the
persistence correction. Its one AI run succeeded, then application-side
semantic validation rejected an output shape that the provider schema had
allowed despite the absence of visual or configured-competitor evidence. The
provider schema now derives visual/competitor section limits from the exact
current-run evidence while the existing defensive validator remains in place.
The corrective focused suite passes 2 files / 22 tests and the complete web
suite passes 141 files / 793 tests; lint, worker/web typechecks and both
production builds also pass. Deploy this correction and run one final hosted
acceptance retest before marking TASK-017E complete.

---

## TASK-018 — Marketing Performance Learning

Status: COMPLETE / MERGED

Implemented scope:

- manually registered organization-scoped Instagram Reel publications with
  optional exact Reel Brief version linkage and optional explicit reuse of the
  TASK-017C Content Opportunity taxonomy;
- append-only manual performance snapshots with nullable raw metrics,
  nonnegative bounds and UTC observation provenance;
- deterministic explicit-denominator derived metrics and four observation-age
  horizons;
- latest-per-content/horizon, organization-local median baseline comparison;
- five-item baseline and three-item segment safeguards with deterministic
  WEAK/MODERATE/STRONG descriptive evidence labels;
- immutable, idempotent, exact-content/snapshot/Reel-Brief Performance
  Learnings under `marketing-performance-learning-v1`;
- protected `/apps/marketing/performance` UI and O/A/M write, VIEWER read-only
  behavior; and
- database RLS, same-organization foreign keys, service-only learning
  persistence, immutable-history triggers and bounded activity events.

Deliberately excluded: experiments, automatic Instagram/API ingestion,
scraping, AI interpretation, automatic Council or Strategic Review execution,
External Research execution, memory promotion, predictive scoring,
cross-organization benchmarks and TASK-020. Future Council consumption remains
an explicit later authorized integration, not TASK-018 behavior.

---

## TASK-019 — Web Agency Integration

Status: DEFERRED

Integrate the separate AI Web Agency through Stylus plugin interfaces.

Agency memory must remain isolated.

Deferred because the separate `ai-web-agency` implementation is not yet mature
enough for a stable integration contract. It is not cancelled or renumbered.

---

## TASK-020 — Ask Council

Status: LOCAL IMPLEMENTATION VERIFIED / HOSTED ACCEPTANCE PENDING

Implemented scope:

- conversational Marketing questions from authorized team members
- bounded company-aware Company and Marketing context
- code-defined intent/workflow routing to the smallest approved specialist set
- synthesized team-facing answers with concise perspectives, evidence,
  assumptions, disagreements, risks, and confidence where appropriate
- bounded collaborative conversation/history persistence
- organization, role, plugin, AI-policy, and ModelGateway boundaries
- explicit call, cost, context, and stopping limits using logical model tiers
- optional explicit use of TASK-017 research evidence when a selected workflow
  requires research; ordinary questions do not imply web research
- read-only TASK-018 performance evidence through an authorized bounded
  interface

Migration `20260825002000_ask_council.sql` adds organization-scoped,
RLS-protected conversations, immutable messages/turn provenance, typed exact
context references and specialist/AI-run history. Workflow mutation is
service-only; archival is guarded and history-preserving.

Do not implement Ask Council as a generic chatbot, an unrestricted research
assistant, or an autonomous swarm. It must not expose raw chain-of-thought,
spawn arbitrary agents, invoke arbitrary tools, broaden Marketing into agency
memory, or write durable memory automatically. Suggested actions are advisory
text and execute nothing.
