# Stylus — Roadmap

## Phase 0 — Foundation

Status: COMPLETE

- [x] repository structure
- [x] web application skeleton
- [x] TypeScript
- [x] styling foundation
- [x] design system foundation
- [x] Lucide icons
- [x] linting
- [x] formatting
- [x] tests
- [x] environment validation
- [x] documentation workflow
- [x] production build verification

---

## Phase 1 — Authentication & Organizations

Status: COMPLETE

- [x] Supabase
- [x] signup
- [x] login
- [x] logout
- [x] sessions
- [x] organizations
- [x] memberships
- [x] team invitations and member management
- [x] protected routes
- [x] role/permission foundation
- [x] RLS
- [x] authorization tests

---

## Phase 2 — Company Onboarding

Status: READY FOR MANUAL QA

- [x] company profile
- [x] startup idea
- [x] problem
- [x] product concept
- [x] stage
- [x] audience
- [x] brand
- [x] marketing objectives
- [x] competitors

---

## Phase 3 — Tasks

Status: READY FOR MANUAL QA

- [x] create/edit task
- [x] assignment
- [x] priority
- [x] status
- [x] due date/time
- [x] comments
- [x] My Tasks
- [x] Team Tasks
- [x] upcoming
- [x] overdue
- [x] completed
- [x] 14-day completed visibility
- [x] archive
- [x] calendar

---

## Phase 4 — Notifications & Activity

Status: READY FOR MANUAL QA

- [x] notification model
- [x] compact notification center
- [x] task reminders
- [x] deadline notifications
- [ ] mentions
- [x] activity stream
- [x] idempotency

Mentions remain deferred; TASK-005 implements deadline notifications and the
notification/activity foundations without external delivery channels.

---

## Phase 5 — Whiteboards

- [x] boards
- [x] pan/zoom
- [x] text
- [x] sticky notes
- [x] images
- [x] shapes
- [x] arrows
- [x] drag/resize
- [x] comments
- [x] mentions
- [x] realtime collaboration
- [x] permissions

TASK-006 provides the persistent editor and TASK-007 adds board-scoped Realtime
updates, private presence, comments/replies, structural mentions, notifications,
activity and collaboration-safe local operation history. Live cursors and a CRDT
remain deliberately outside this milestone.

---

## Phase 6 — Plugin Platform

Status: READY FOR MANUAL QA

- [x] plugin manifest
- [x] registry
- [x] capabilities
- [x] permissions
- [x] navigation contributions
- [x] events
- [x] plugin isolation
- [x] example plugin

TASK-008 provides trusted static discovery, organization enablement, guarded
routes and metadata-only AI tool/memory extension points. Marketing and Web
Agency implementations remain future tasks.

---

## Phase 7 — AI Platform

Status: READY FOR MANUAL QA

- [x] ModelGateway
- [x] providers
- [x] logical model profiles
- [ ] agent interface
- [x] trusted tool registry foundation
- [ ] workflows
- [x] structured outputs
- [x] AI run metadata
- [x] organization AI policy and budget foundation
- [x] fake AI provider for tests

TASK-009 provides provider-neutral synchronous execution, deterministic routing,
local/remote policy, safe run metadata and future tool contracts. It deliberately
does not implement agents, orchestration, memory retrieval or long-running jobs.

---

## Phase 8 — Company Knowledge & Memory

- [x] structured knowledge
- [x] explicit human-created durable memory
- [ ] embeddings
- [ ] pgvector
- [x] bounded deterministic retrieval
- [x] domain isolation
- [x] memory authorization tests

Status: READY FOR MANUAL QA

TASK-010 composes canonical Company Knowledge from existing profile tables and
adds explicit provenance-aware relational memory, indexed text filtering, soft
archival and a trusted AI context boundary. Embeddings, pgvector, semantic RAG,
document ingestion and automatic promotion remain deferred to a dedicated later
task.

---

## Phase 9 — Jobs & Local Worker

- [x] persisted jobs
- [x] claiming
- [x] progress
- [x] retries
- [x] heartbeat
- [x] stale recovery
- [x] Windows worker
- [ ] Ollama detection
- [ ] FFmpeg detection
- [ ] transcription detection

Status: TASK-012 COMPLETE

TASK-011 provides the durable PostgreSQL queue, trusted registry/executor,
database-native verification job, hosted Cron boundary, leases, cancellation,
timeouts and `/jobs`. TASK-012 adds brokered pairing, scoped worker credentials,
the Windows CLI/runtime, `/workers`, and a harmless external diagnostic. Domain
handlers and optional binary/model detection remain deferred.

---

## Phase 10 — Marketing Foundation

- [x] statically registered, organization-enableable Marketing plugin
- [x] operational overview
- [x] manual competitors
- [x] manual Reel Ideas
- [x] manual campaigns
- [x] manual research notes
- [x] manual creative briefs

TASK-013 intentionally excludes Reasoning History and Creative Studio.
Competitor Reel analysis begins in TASK-014, external research automation in
TASK-017, and AI creative generation in the later Creative Council phases.

---

## Phase 11 — Competitor Reel Intelligence

- [x] manual MP4 media ingestion
- [x] bounded audio extraction
- [x] local transcription
- [x] deterministic scene/cut detection
- [ ] representative-frame persistence (deferred)
- [ ] text-overlay extraction/OCR (deferred)
- [x] deterministic media metrics
- [x] transcript-based hook analysis
- [x] transcript-based script analysis
- [ ] semantic visual brand analysis (requires future vision foundation)
- [x] versioned structured competitor intelligence

TASK-014 V1 is implemented and merged into `main` through its corrective commits.

---

## Phase 12 — Creative Council V1

- [x] Hook Strategist
- [x] Script Writer
- [x] Creative Critic
- [x] bounded workflow
- [x] versioned Reel Brief

TASK-015 V1 uses three sequential tool-free structured ModelGateway calls in a
bounded synchronous Marketing service. It starts from one active Reel Idea,
optionally projects up to three explicitly selected TASK-014 analyses, snapshots
bounded canonical Company context, and stores immutable safe Reasoning History.
Marketing memory retrieval, cancellation, queues, research, and additional
agents remain deferred.

TASK-015 passed manual QA and is merged into `main`.

---

## Phase 13 — Creative Council Expansion

- [x] Audience Researcher
- [x] Trend Researcher
- [x] Competitor Analyst
- [x] Content Strategist
- [x] Retention Editor
- [x] Visual Director
- [x] Brand Director
- [x] Creative Judge
- [x] Challenge Reviewer

TASK-016 registers reusable static, tool-free specialist contracts and adds one
separate Strategic Review Create workflow over an exact TASK-015 Reel Brief
version. Audience Researcher -> Brand Director -> Content Strategist ->
Challenge Reviewer -> Creative Judge performs exactly five sequential calls and
creates an immutable Strategic Council Review. Trend, Competitor, Retention and
Visual specialists are registered but intentionally not invoked by this
workflow. TASK-020 remains the unimplemented conversational product.

---

## Phase 14 — External Marketing Research

- [ ] source adapter
- [ ] permitted Reddit research
- [ ] Hacker News
- [ ] RSS
- [ ] web sources
- [ ] normalization
- [ ] deduplication
- [ ] clustering
- [ ] evidence storage

---

## Phase 15 — Performance Learning

- [ ] published content records
- [ ] performance snapshots
- [ ] experiments
- [ ] lessons
- [ ] feedback into Creative Council

---

## Phase 16 — Web Agency Integration

- [ ] external plugin adapter
- [ ] authentication
- [ ] selected capabilities
- [ ] isolated agency domain
- [ ] agency UI integration

---

## Phase 17 — Ask Creative Council

- [ ] conversational Marketing question contract
- [ ] bounded intent/workflow routing
- [ ] smallest relevant approved specialist selection
- [ ] synthesized structured council answer
- [ ] company-aware authorized context
- [ ] team collaboration and bounded history decision
- [ ] RBAC, organization, plugin, AI-policy, call, and cost limits

TASK-020 is the dedicated future advisory mode. It may consume explicitly
authorized TASK-017 research or TASK-018 performance evidence, but neither is
implicitly activated by a question. It uses ModelGateway logical tiers and
finite code-defined workflows; no generic chatbot, arbitrary tool use, arbitrary
agent spawning, raw chain-of-thought, or automatic memory write is permitted.
