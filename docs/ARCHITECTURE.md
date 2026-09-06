# Stylus — Architecture

## Architectural Style

Stylus begins as a modular monolith with external managed infrastructure.

Avoid premature microservices.

---

# Repository Layout

The repository uses npm workspaces:

- `apps/web` contains the Next.js application and its local UI foundation.
- `apps/worker` contains the optional outbound Windows worker.
- `packages/typescript-config` contains shared strict TypeScript defaults.

Future packages should be added only when code has a real cross-application
or cross-module consumer. Reusable platform modules live under
`apps/web/src/core` and `apps/web/src/modules`; statically registered business
plugins live under `apps/web/src/plugins` and depend on documented public Core
contracts.

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

Core modules include:

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

TASK-008 establishes a trusted built-in modular-monolith plugin host:

- `src/core/plugins/public.ts` is the explicit contract available to plugins.
- `src/plugins/<plugin-id>` contains private business-plugin definitions.
- `src/plugins/index.ts` is the static composition root and registry entrypoint.
- `src/modules/plugins` owns Core enablement, authorization and persistence APIs.
- Core/application modules may import the plugin root entrypoint but never a
  plugin's private directory.

Definitions are validated at module load and registered into an instance-scoped
registry. Duplicate plugin IDs and exclusive capability collisions fail loudly.
There is no filesystem scanning, URL import, package download, `eval`, MCP or
untrusted code execution.

The shell combines stable Core navigation with contributions from enabled
plugins after one organization-state query. Controlled icon identifiers resolve
through a Lucide registry. A shared server guard repeats registered/enabled checks
for direct plugin routes; hiding navigation is never the authorization boundary.

Plugin events are explicit synchronous in-process handlers. Dispatch continues
after a handler failure and returns structured failures, with an optional failure
observer for logging. Callers decide whether a source workflow may continue; no
job infrastructure is implied.

Manifests declare permissions, memory domains and future AI tool metadata, but
these declarations grant no access or execution. Core authorization remains
authoritative. Marketing may later request company and marketing domains; Web
Agency is restricted to agency by default.

---

# Windows Worker Boundary

TASK-012 uses an outbound Windows Node.js process through a narrow Next.js
broker. Pairing and durable credentials are random 256-bit values stored only as
SHA-256 hashes in PostgreSQL. The broker owns the hosted service credential;
workers receive no database superuser or human identity. Credential-validating
RPCs constrain every heartbeat, capability-filtered atomic claim and lease-owned
lifecycle mutation to one active worker and organization.

The worker registry is static and starts with only `core.test.worker-echo`.
Offline workers leave EXTERNAL_WORKER jobs queued; hosted DATABASE execution is
unchanged. See `WINDOWS_WORKER.md` and ADR-025.

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

TASK-011 implements this flow as a PostgreSQL-backed state machine plus a trusted
static TypeScript registry/executor contract. Claims use `FOR UPDATE SKIP LOCKED`,
leases, heartbeats and transaction locks for optional concurrency groups.
Worker-only lifecycle RPCs own progress, completion, retry, timeout and stale
recovery; browser roles receive SELECT-only organization-scoped access.

Execution classes keep placement explicit. Short deterministic DATABASE work may
run through Supabase Cron; bounded SERVERLESS and future EXTERNAL_WORKER handlers
share the public contract. TASK-011 implements only the harmless database-native
`core.test.echo`. Heavy media remains queued for TASK-012's outbound worker and
never runs in a long PostgreSQL transaction. See `docs/JOBS.md`.

---

# Marketing Plugin Boundary

TASK-013 keeps Marketing inside the modular monolith as a statically registered
business plugin. Pages use the Core plugin enablement guard; typed server-side
services derive the current organization and actor. Five plugin-owned tables
use RLS plus provenance triggers. The plugin may depend on public Core contracts,
while Core does not import Marketing business logic.

Ordinary Marketing CRUD is synchronous relational work. It does not invoke AI,
memory, jobs, workers, scraping, ingestion, or external network adapters.

---

# AI Boundary

All synchronous inference passes through the server-only `ModelGateway`:

```text
Core or enabled business plugin
  -> normalized Stylus AI request
  -> trusted organization/actor/plugin context resolution
  -> policy and budget-aware ModelRouter
  -> configured provider adapter
  -> model
```

The public contract contains normalized messages, logical tiers, structured
schemas and normalized results. It never exposes provider clients, credentials,
base URLs or raw responses. Provider modules and environment configuration are
marked server-only; architecture tests prevent client imports and direct plugin
adapter imports.

The initial logical tiers are `fast`, `balanced` and `reasoning`. A typed model
registry maps them deterministically to configured models and records explicit
structured-output/tool, local/remote and optional pricing metadata. Disabled
models are excluded. Local-only policy filters remote candidates before any
provider invocation; remote fallback is possible only under remote-allowed
policy and the configured allowlist/budget.

OpenAI-compatible HTTP is the normalized transport for both configured hosted
providers and the optional local Ollama endpoint. Provider availability is
checked only at explicit health/execution boundaries, never during application
startup or ordinary page rendering.

Every provider request has a bounded timeout and cancellation signal. Only
transient provider-unavailable/rate-limit/unknown failures receive one retry;
authentication, policy, budget, invalid structured output and cancellation are
not retried. Candidate fallback preserves every policy filter.

AI runs persist metadata-only traces through authenticated, organization-scoped
database functions. The application derives organization and actor, and plugin
requests additionally require static registration, current enablement and a
declared capability. Manifest memory domains are copied into trace context.
TASK-010 independently rechecks active membership, static plugin registration,
enablement, exact capability and each requested domain before retrieval.

The tool registry is an explicit trusted server registry with Zod input/output
schemas, owning plugin, required capability and side-effect classification.
Model-produced names are untrusted and do not execute code. Autonomous tool
loops, agents, workflows and persisted jobs are later concerns.

---

# Memory Boundary

Memory retrieval requires explicit:

- organization scope
- domain scope
- optional workspace scope

No unrestricted global semantic search is permitted.

TASK-010 distinguishes two sources:

- Company Knowledge is a typed, server-only composition of the canonical
  company, audience, brand, marketing and competitor tables.
- Company Memory is explicit durable context in `knowledge_memories`, scoped by
  organization, domain, kind, provenance and lifecycle.

The Core `/memory` UI and browser-readable RLS expose only `company` memory.
Browser mutation uses narrow RPCs that derive the actor and force `HUMAN`
provenance, `company` domain and no plugin identity. Plugin-private persistence
is not available through a generic browser RPC.

AI consumers must explicitly request domains through the server-only memory
context builder. Core capabilities can request only `company`; plugin requests
must match their static manifest, current organization enablement, exact
capability and declared domains. General retrieval is capped at 50 rows and AI
context retrieval at 20 rows with stable `updated_at, id` ordering. Retrieval
does not invoke a provider and memory is never automatically injected.

Embeddings, pgvector, chunking, semantic RAG, document ingestion and automatic
promotion are intentionally deferred.

---

# Deployment Principle

The initial architecture prioritizes:

- no mandatory VPS
- free-tier infrastructure where practical
- low idle cost
- portability
- future migration without application redesign

## TASK-014 Media Flow

```text
authenticated Marketing collaborator
  -> private organization/Reel Storage path
  -> persisted EXTERNAL_WORKER job
  -> paired outbound worker
  -> claimed-job broker validation
  -> 60-second signed source download
  -> fixed ffprobe/FFmpeg + configured/probed whisper.cpp CLI
  -> bounded broker result persistence
  -> plugin/policy re-check
  -> text-only ModelGateway structured interpretation
  -> versioned Marketing analysis + ai_runs trace
```

The worker never receives Supabase credentials, a user session, arbitrary
Storage paths, commands, or scripts. Temporary source/audio files are isolated
with the whisper.cpp JSON sidecar in one controlled OS temp directory and
removed on every exit path. Executable/model paths come only from worker-local
operator configuration, never jobs or browser input. The CLI is spawned without
a shell; native output and parsed transcript data are bounded before persistence.

## TASK-015 Creative Council Flow

```text
authenticated Creative Studio Server Action
  -> server-derived organization/actor + Marketing role
  -> bounded Reel Idea / canonical Company / explicit TASK-014 projection
  -> service-only idempotent council-run start
  -> Hook Strategist structured ModelGateway call
  -> immutable Hook stage
  -> Script Writer structured ModelGateway call
  -> immutable Script stage
  -> Creative Critic structured ModelGateway call
  -> immutable Critique stage + Reel Brief version
```

This is a synchronous Marketing service boundary, not a generic agent runtime.
It uses no job executor or worker because the V1 contract is exactly three
bounded text stages. Static agent and Zod contracts can later move behind a
persisted job without changing their semantics. V1 retrieves no durable
Marketing memory, registers no tools, and has no cancellation or recursive
execution.

## TASK-016 Strategic Review Flow

```text
authenticated Creative Studio Server Action
  -> server-derived organization/actor + Marketing role
  -> exact immutable Reel Brief version + bounded canonical Company projection
  -> service-only idempotent strategic-review start
  -> Audience Researcher (balanced) -> immutable stage
  -> Brand Director (balanced) -> immutable stage
  -> Content Strategist (reasoning) -> immutable candidate
  -> Challenge Reviewer (reasoning) -> immutable adversarial review
  -> Creative Judge (reasoning) -> immutable Strategic Council Review version
```

This remains a synchronous bounded Marketing workflow. It has five calls
maximum, a 60-second per-call timeout and a 285-second overall deadline. It has
no workflow retry, recursion, dynamic agent selection, tools, memory retrieval,
external research, job or worker. Partial successful stages remain auditable;
Challenge or Judge failure never fabricates a final artifact.

Agent definition, workflow orchestration and persistence remain separate. All
nine TASK-016 specialist contracts are code-owned and reusable, but Strategic
Review invokes only Audience, Brand, Content Strategy, Challenge and Judge.
Challenge receives only the source brief and bounded upstream conclusions;
Judge explicitly dispositions every challenged reference.

## Future Creative Council Interaction Modes

Creative Studio distinguishes reusable council infrastructure from its product
interactions:

```text
Create: structured source -> finite workflow -> persisted artifact
Ask:    team question -> bounded router -> selected finite workflow
        -> synthesized team-facing answer
```

Create and Ask Council must not be forced into one generic chat abstraction.
TASK-016 defines expanded specialist contracts and one bounded Strategic Review
Create workflow without coupling every specialist to Reel Brief generation.
TASK-020 owns the later conversational product and must begin with discovery
rather than inheriting Strategic Review persistence or UI as a chat contract.

Ask routing is server-authoritative and code-defined. It selects the smallest
approved specialist workflow, applies explicit call/context/cost/stopping
limits, and routes all inference through ModelGateway logical tiers. It never
spawns arbitrary agents, exposes raw chain-of-thought, or enables arbitrary
tools. TASK-017 research and TASK-018 performance evidence remain separate
authorized inputs, not implicit consequences of asking a question.

Future context access repeats organization membership, Marketing enablement,
RBAC, AI-policy, and memory-domain checks. Manifest declarations do not grant
retrieval, agency memory remains isolated, working records are not automatically
promoted, and no Ask Council workflow automatically writes memory.

## TASK-017 Hosted External Research Flow

```text
Marketing Research Server Action
  -> atomic run + SERVERLESS job enqueue
  -> hosted after() callback -> targeted atomic claim (immediate)
  -> authenticated daily Vercel Cron route -> generic atomic claim (recovery)
  -> static external-research handler
  -> fixed-host HN + pinned-DNS RSS/Atom adapters
  -> deterministic query matching
  -> matched HN native text + bounded comments + pinned-DNS linked article
  -> typed, hashed source + EVID-n persistence
  -> exact per-run EVID enum -> one maximum trusted ModelGateway structured synthesis
  -> reference validation -> immutable Research Report
```

The browser cannot choose tenant, actor, adapter implementation, provider,
model, prompt, retry or ceilings. The Windows laptop is not involved. Existing
TASK-015/TASK-016 workflows do not call research. A future workflow may consume
an explicit report ID plus selected evidence IDs only through the server-only
projection that repeats membership, role and organization checks.

TASK-017B keeps enrichment inside the Marketing adapter boundary. Initial HN
candidates are never article/comment crawled: fixed-host metadata is normalized
and query-matched first, then only two matched stories may be enriched. Article
fetching reuses the centralized pinned-DNS textual-fetch primitive and does not
execute JavaScript, inspect embedded links, recurse, invoke a browser or bypass
the registered job. `htmlparser2` supplies a lightweight deterministic DOM for
boilerplate removal and paragraph/section chunking.

Evidence is no longer an opaque story-sized blob. `HN_STORY`, `HN_TEXT`,
`HN_COMMENT` and `ARTICLE_CONTENT` rows each retain exact external URL, native
and parent identifiers, author/title, publication/retrieval times, content hash
and bounded safe metadata. Legacy `DISCUSSION`/`FEED_ITEM` rows remain readable.
Evidence-type/native-ID, canonical-URL/content and normalized-content hashes
deduplicate fragments before deterministic EVID assignment. The model receives
only the selected bounded immutable records; no new agent, tool, provider path,
memory path, Core dependency or Council invocation exists.

The synthesis schema narrows every supported evidence reference to the exact
identifiers included in that run's bounded context. Concise report cardinality
limits keep the strict response within the fixed output ceiling; application
post-validation repeats the same reference-set check before immutable report
persistence.

## TASK-017C Fashion Intelligence Flow

The browser submits only question, controlled intent, bounded terms and—only
for `FASHION_TECH`—an HN stream. The Server Action derives actor/organization,
rebuilds a static plan from Marketing registries and atomically persists that
snapshot with the existing SERVERLESS job. The handler recomputes and compares
the plan before retrieval, so a forged or stale snapshot cannot broaden sources.

```text
authorized Marketing request
  -> deterministic intent/source planner
  -> atomic run + durable SERVERLESS job
  -> bounded static adapter registry
     -> approved Reddit OAuth (optional)
     -> curated RSS + pinned-DNS article enrichment
     -> HN only for FASHION_TECH
  -> deterministic normalize/dedupe/EVID persistence
  -> zero or one ModelGateway structured synthesis
  -> deterministic coverage + immutable fashion report
```

Worst-path ceilings remain inside the 20-second retrieval phase of the existing
55-second job (35-second synthesis plus five-second completion reserve):

| Source family | Maximum network requests/run | Maximum retained evidence contribution | Timeout contribution |
| --- | ---: | ---: | ---: |
| Reddit | 1 OAuth + 4 search + 4 comment-thread requests | 4 posts + 8 comments | shared 20 s retrieval / 8 s request |
| Editorial | 2 feeds + 2 articles; optional provider call only for competitor intent | 2 feed items/source + article chunks, under global 20 | shared 20 s retrieval / 8 s request |
| Hacker News | existing fixed-host bounded stream/item/comment/article work | existing TASK-017B bounds | shared 20 s retrieval / 8 s request |

All families share concurrency three, a four-MiB byte budget, 20 immutable
evidence rows and 24,000 normalized characters. Concurrent hosted/cron execution
still relies on the same atomic job claim. No Windows worker, Redis, VPS or new
execution class is introduced.

## TASK-017D Social Intelligence Flow

```text
authorized Marketing research request
  -> server-derived intent plan + active organization competitor profiles
  -> existing atomic run + durable SERVERLESS job
  -> common SOCIAL adapter
     -> official configured transport, when policy permits
     -> otherwise safe source_unavailable observation
  -> deterministic relevance, normalization, hash/dedupe and typed EVID rows
  -> zero evidence: zero AI calls and safe failure
  -> usable evidence: one maximum trusted structured ModelGateway synthesis
  -> modality/exact-EVID validation -> immutable social-fashion report
```

Instagram, TikTok, YouTube and Pinterest are first-class capabilities, but V1
registers no production transport. This is deliberate policy, not a hidden
configuration error. An injected transport interface supports fixture testing
and a future approved official adapter without changing planning or the job
boundary. It cannot be selected by browser input.

Social evidence is platform-independent (`SOCIAL_POST`, `SOCIAL_VIDEO`,
`SOCIAL_CAPTION`, `SOCIAL_COMMENT`, `SOCIAL_METADATA`) with platform, native and
parent identity, public account context, timestamps, modality, bounded metrics,
hash and optional competitor provenance. Current V1 can normalize only official
transport records supplied through that boundary; it downloads no media and
therefore produces no visual evidence. TASK-014 remains an explicitly requested
separate EXTERNAL_WORKER workflow.

The planner selects `SOCIAL` only for relevant audience, trend and competitor
intents; `FASHION_TECH` remains HN/editorial/Reddit. Unselected platform
capabilities never affect run status. Source diversity separately counts
platforms, public accounts, independent content items and comment threads so
several comments on one item do not become several independent sources.

## TASK-017E Web & Consumer Evidence Flow

```text
authorized bounded research input
  -> deterministic server query planner (zero to three variants)
  -> fixed-host Tavily Search candidate metadata
  -> URL policy + metadata relevance + deterministic dedupe
  -> per-origin robots policy
  -> centralized pinned-DNS HTTPS page fetch + redirect revalidation
  -> htmlparser2 extraction + content relevance
  -> typed FULL_PAGE WEB_PAGE chunks with source class/provenance
  -> existing immutable EVID persistence
  -> zero evidence: zero AI calls / safe failure
  -> evidence: one maximum trusted ModelGateway synthesis
```

Search and content retrieval are separate trust boundaries. The provider cannot
select an adapter, organization, actor, model, prompt or bypass fetch policy.
Provider snippets and answers never enter evidence or synthesis. All adapters
share the existing request gate, byte budget, retrieval deadline, deterministic
dedupe and durable job claim.

Web-specific ceilings are three queries, eight results/query, twelve unique
candidates, six attempted page fetches, four retained pages, two chunks/page,
1,500 characters/chunk and eight retained web evidence rows. The global limits
remain concurrency three, four MiB, twenty evidence rows, 24,000 normalized
characters, twenty seconds retrieval, thirty-five seconds synthesis and
fifty-five seconds overall beneath the Vercel Hobby sixty-second limit.

## TASK-018 Performance Learning Flow

```text
authorized manual publication registration
  -> exact same-organization Reel Brief link + optional explicit TASK-017C type
  -> append-only manual metric snapshots
  -> deterministic explicit-denominator metrics
  -> deterministic observation horizon
  -> latest snapshot per content/horizon
  -> organization/platform/horizon median baseline
  -> minimum baseline/segment thresholds
  -> immutable versioned Performance Learning + exact evidence joins
```

The request is synchronous and bounded; it does not use the durable job system.
PostgreSQL is the final mutation boundary for role, plugin, tenant, evidence,
horizon and sample validation. Repeating an unchanged exact evidence set is
idempotent, while changed evidence creates a new historical learning. No AI,
Council, Strategic Review, research, memory or Ask Council edge exists.

## TASK-020 Ask Council Flow

```text
authorized bounded question + optional controlled selections
  -> deterministic intent/routing-v1
  -> explicit-first bounded same-organization context projection
  -> 1-3 static specialists through ModelGateway (V1: two, parallel)
  -> every specialist succeeds: exactly one ModelGateway synthesis
  -> dynamic safe-reference validation
  -> immutable assistant answer + exact relational provenance
```

Ask Council is synchronous and advisory. The hard limit is four calls and 55
seconds; it uses no job, worker, tool registry, network retriever, memory
retriever or autonomous agent runtime. Specialist failure stops before
synthesis. Synthesis failure terminalizes the turn without an assistant
message. Request idempotency and the one-pending-turn constraint prevent repeat
or concurrent answers for a conversation.

The server derives tenant and actor. Context selection sends structured Company
fields plus bounded projections of existing Research, Performance Learnings and
exact selected creative artifacts. Safe model references are mapped to separate
same-organization foreign keys; raw artifact UUIDs are not model-facing.
Messages and provenance are immutable, while conversations support only
history-preserving archival. OWNER/ADMIN/MEMBER execute and VIEWER reads.

The Create path remains TASK-015's exact Hook -> Script -> Critic artifact
workflow. Ask Council never creates a Reel Brief, invokes Strategic Review,
launches Research, derives performance, writes memory or crosses into TASK-019.
TASK-019 Web Agency Integration is deferred because the separate
`ai-web-agency` implementation is not yet mature enough for a stable contract.
