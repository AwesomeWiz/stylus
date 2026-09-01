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

---

## ADR-021 — Trusted Static Plugin Composition

Status: ACCEPTED

Stylus plugins are trusted repository modules registered explicitly at build
time. A validated manifest declares metadata, capabilities, permissions,
navigation, event subscriptions, memory domains and future tool metadata. The
registry rejects duplicate identities and exclusive capability ownership.

Organization enablement is persistent, RLS-isolated availability state rather
than installation of executable code. Disabling hides navigation and denies
guarded workflows without deleting plugin data or history. Plugin handlers run
synchronously in process with structured failure isolation. Core exposes a
public plugin contract and never imports business-plugin private internals.

This decision deliberately excludes marketplaces, runtime filesystem discovery,
remote packages, `eval`, MCP, AI execution, secrets configuration and Marketing
or Web Agency implementation.

---

## ADR-022 — Provider-Neutral, Policy-Gated AI Execution

Status: ACCEPTED

Stylus AI consumers use one server-only ModelGateway with normalized messages,
logical tiers and validated results. Deployment-configured adapters and models
remain implementation details. The initial OpenAI-compatible transport supports
both optional hosted endpoints and local Ollama without requiring either at
startup or in automated tests.

Routing is deterministic and filters organization execution mode, provider
allowlist, required capabilities and estimated-cost budget before invocation.
LOCAL_ONLY can never fall back remotely. Plugin calls additionally require
static registration, organization enablement and a declared capability; manifest
memory domains are trace context, not retrieval authority.

AI runs persist safe operational metadata rather than complete prompts,
responses or chain-of-thought. Provider errors, usage and estimated cost are
normalized. Every request has bounded timeout/cancellation and narrowly bounded
transient retry behavior. Model-produced tool names remain untrusted and can only
resolve through a future authorization-aware trusted tool executor.

This decision excludes agents, memory/RAG, embeddings, autonomous tool loops,
long-running workflows, custom secret vaults and remote laptop networking.

---

## ADR-023 — Canonical Company Knowledge and Explicit Relational Memory

Status: ACCEPTED

Company Knowledge is a typed server-side view of the existing company,
audience, brand, marketing and competitor tables. Those canonical profile rows
are not duplicated into memory merely to simplify AI consumption.

Durable memory uses provenance-aware relational rows scoped by organization and
the controlled company, marketing or agency domain. Human browser operations
can create only company-domain memory through narrow actor-deriving functions;
ordinary deletion and privileged provenance forgery are unavailable. Working
tasks, comments, boards, uploads and AI drafts require a future explicit
promotion workflow and never become memory automatically.

Retrieval is deterministic, indexed and hard-bounded. Core AI may explicitly
request company context only. Plugin requests independently require static
registration, organization enablement, an exact declared capability and a
requested-domain subset of the manifest. Generic Core/browser access cannot
read plugin-private domains.

This decision deliberately defers embeddings, pgvector, chunking, semantic RAG,
document ingestion, web research and autonomous memory writes.

---

## ADR-024 — PostgreSQL-Leased Durable Jobs with Replaceable Executors

Status: ACCEPTED

Stylus uses one organization-scoped PostgreSQL job state machine rather than
Redis or an always-on queue service. Atomic `SKIP LOCKED` claims, leases,
heartbeats, bounded retries, stale recovery, cancellation and narrow lifecycle
functions protect invariants under concurrent executors. A trusted static
TypeScript registry owns executable job types, schemas, provenance and placement.

Short deterministic DATABASE work may run through hosted Supabase Cron; TASK-011
implements only a harmless verification handler. SERVERLESS and EXTERNAL_WORKER
remain replaceable execution classes. Heavy media must not run in PostgreSQL or
be falsely treated as solved by a constrained Edge runtime. TASK-012 will add a
narrow authenticated outbound Windows worker without making the laptop the
production application server.

Jobs do not replace AI runs or memory. Future job handlers use existing trusted
AI/memory APIs, preserving their independent authorization and audit boundaries.

---

## ADR-025 — Brokered, Credential-Scoped Optional Workers

Status: ACCEPTED

Windows workers connect outbound through a narrow hosted Next.js broker. The
worker holds one organization/worker-scoped random credential whose SHA-256
digest is stored; it never receives Supabase service-role or human credentials.
The broker keeps the service key server-only and delegates authorization,
atomic claims and lifecycle transitions to pinned-search-path PostgreSQL RPCs.

This is preferred over anonymous direct RPC access because it centralizes body
limits, rate controls, error normalization and future audit policy without
granting worker functions to public database roles. TASK-011 remains the state
machine. Static handlers prevent remote-shell behavior, and offline workers
leave external jobs durably queued while DATABASE Cron remains independent.

---

## ADR-026 — Marketing Begins as Manual Plugin-Owned Canonical Data

Status: ACCEPTED

TASK-013 introduces five organization-scoped Marketing tables rather than
reusing the Core onboarding competitor table or prematurely creating media,
analysis, agent, or performance schemas. A Marketing competitor may reference a
same-organization Core competitor, but remains a distinct plugin workspace.

All major records use soft archival. Campaign relationships are nullable and
preserve historical references when a campaign is archived. Plugin enablement
gates navigation, routes, reads, and writes without destroying data. CRUD emits
bounded lifecycle activity but never automatically creates memory, AI runs, or
jobs. This provides stable inputs for later tasks without implementing their
automation early.

## 2026-08-27 — Competitor Reel Analysis V1 uses bounded local extraction

Competitor Reels are plugin-owned observations under existing Marketing
competitors and never reuse `marketing_reel_ideas`. V1 accepts manual MP4 upload
only; an optional source/Instagram URL is non-fetching metadata. Private media,
transcripts, and analyses are retained through soft archival, while re-analysis
creates immutable historical versions.

One registered EXTERNAL_WORKER job performs deterministic ffprobe/FFmpeg and
local whisper.cpp work. The credential-free worker obtains only a short-lived
signed URL and persists a bounded schema through claimed-job broker RPCs. Native
commands are fixed repository code with no shell or job-selected
executable/model. Operator-owned executable/model paths are configured locally,
probed before capability advertisement, and never accepted from a job.

AI interpretation remains text-only and goes through ModelGateway after fresh
plugin, membership, and organization-policy checks. OCR, semantic vision,
Instagram acquisition, automatic memory promotion, and Creative Council
generation remain deferred, preserving the TASK-015 boundary.

## 2026-08-27 — TASK-014 transcription respects Windows application control

Manual QA confirmed Windows Smart App Control/Code Integrity blocked PyAV
18.1.0's `av/video/frame.pyd`, preventing faster-whisper from loading. This was
not a download-zone issue. TASK-014 therefore uses one documented local backend:
the official whisper.cpp CLI with machine-readable JSON output. The Python
adapter and Python/faster-whisper/PyAV/CTranslate2 prerequisites were removed.

Stylus never weakens application control. The worker probes the configured CLI
and readable model before advertising the Marketing capability. A missing,
incompatible, or blocked CLI leaves Marketing media jobs queued while Core
worker diagnostics continue. Native binaries/models remain explicit operator
installations outside Git; the repository controls arguments, temp paths,
timeouts, cancellation, output bounds, parsing, and cleanup.

## 2026-08-28 — Reel domain failure follows terminal job state

TASK-014 interpretation continues through the trusted ModelGateway after the
worker persists bounded extraction. Provider failures are normalized and
reported through the existing worker/job lifecycle. Reel and analysis records
are not marked failed while a retry is scheduled; the existing database trigger
owns synchronization when the job becomes terminal. This keeps retry state and
domain state consistent without a schema change. V1 retries the complete native
pipeline, and resumable interpretation is intentionally deferred.

## 2026-08-28 — Ollama receives a compatible projection of structured schemas

llama.cpp rejects JSON Schema string repetitions at 2,000 even though Stylus's
Reel summary bound is valid JSON Schema. Only the Ollama adapter removes
`maxLength` values at that grammar threshold before provider invocation. The
application's original Zod schema remains unchanged and validates the returned
JSON, remote compatible providers receive the original schema, and every call
still uses ModelGateway policy, routing, budget, and run tracing.

---

## ADR-027 — Creative Council V1 is a synchronous bounded workflow

Status: ACCEPTED

TASK-015 uses a Marketing-owned synchronous orchestration service rather than a
new queue, SERVERLESS executor, Windows worker, autonomous agent runtime, or
chat. One active Reel Idea passes through exactly three static tool-free logical
agents in order: Hook Strategist, Script Writer, Creative Critic. A successful
path therefore has exactly three structured ModelGateway calls. The gateway's
existing policy-filtered provider behavior remains authoritative; application
code adds no retry or loop. Every stage has a 90-second timeout.

The workflow snapshots a deterministic bounded projection once: Reel Idea up to
6,000 serialized characters, canonical Company context up to 20,000 characters,
and zero-to-three explicitly selected completed TASK-014 projections totaling
up to 12,000 characters. Competitor projection excludes media, transcripts,
URLs, extraction artifacts, exact primary hooks, CTAs, key messages, and raw
analysis JSON. Durable Marketing memory is neither retrieved nor written.

Runs and successful/failed stages remain immutable structured Reasoning History.
Only all three validated stages create an immutable Reel Brief version. A
service-role-only transition boundary revalidates actor membership, Marketing
enablement, organization references, stage order, requested tier, and AI-run
provenance for start and successful advancement. Failure finalization is also
service-only and can only terminalize the matching creator's RUNNING stage, so a
membership removal during a provider call cannot strand an active run. An
idempotency key plus one-active-run advisory lock blocks accidental
replay/concurrency without preventing a later intentional version. Mid-run user
cancellation and migration to persisted jobs are deferred.

---

## ADR-028 — Creative Council has distinct Create and Ask modes

Status: ACCEPTED

Creative Studio will eventually expose two interaction modes over reusable
Creative Council infrastructure. Create is the bounded production mode proven
by TASK-015: a structured source enters a finite workflow and produces an
auditable persisted artifact, versioned where appropriate. Ask Council is a
future advisory mode: an authorized team question enters bounded intent and
workflow selection, invokes only the relevant approved specialists, and returns
one synthesized team-facing answer.

These modes must not be collapsed into a generic agent-chat abstraction. Ask
Council routes each question to the smallest code-defined finite workflow able
to answer it. It never dynamically spawns arbitrary agents until satisfied,
invokes every specialist by default, or turns internal specialists into fake
human chat participants. Optional specialist contributions, if shown, are
concise structured conclusions. The synthesized answer may include a
recommendation, audience, brand and creative perspectives, evidence,
assumptions, disagreements, risks, and confidence; raw chain-of-thought is never
exposed or persisted.

Future Ask Council context is explicit, authorized, and bounded. It may use
canonical Company context and appropriate Marketing records such as Reel Ideas,
Campaigns, Creative Briefs, Research, Competitors, and completed competitor Reel
analyses. Future Marketing memory requires its own authorized retrieval path.
Manifest `memoryDomains` remains metadata rather than authority, agency memory
remains inaccessible, working data is not promoted automatically, and Ask
Council performs no automatic memory write.

All model execution continues through ModelGateway and logical tiers. Routing
must bound calls, context, cost, latency, and stopping conditions, particularly
for local models and remote budgets. TASK-017 research and TASK-018 performance
learning may later provide evidence through explicit authorized workflows, but
asking a question does not inherently enable external research. TASK-016 should
make specialist contracts reusable by Create and Ask modes; TASK-020 owns the
future Ask Creative Council product and must begin with discovery before its
persistence or UI contract is fixed.

---

## ADR-029 — Strategic Review is a separate five-stage immutable workflow

Status: ACCEPTED

TASK-016 does not expand TASK-015's Hook -> Script -> Critic state machine.
Instead, one exact immutable Reel Brief version enters a separate synchronous
workflow: Audience Researcher, Brand Director, Content Strategist, Challenge
Reviewer and Creative Judge. The maximum is five sequential ModelGateway calls,
with 60 seconds per call and a 285-second overall deadline. There is no
application retry, recursive debate, dynamic agent selection, job or worker.

All nine TASK-016 specialists are static code-owned contracts separated from
workflow and persistence. Trend Researcher, Competitor Analyst, Retention Editor
and Visual Director are registered but unused in Strategic Review V1. Trend and
Competitor may only interpret evidence explicitly supplied by a future
authorized workflow; registration grants no research, media, memory or tool
access.

The workflow distinguishes evidence, inference and assumption and uses bounded
recommendation references. Challenge performs one adversarial pass, never
treats missing support as proof of falsity, and may require external
verification. Judge performs one final pass and must disposition every
challenged reference. These layers reduce unsupported reasoning and surface
uncertainty; they neither expose chain-of-thought nor guarantee hallucination
elimination.

Runs and successful partial stages are immutable and reference ordinary
`ai_runs`. Only Judge success creates a versioned Strategic Council Review tied
to its exact source brief. Database transitions are service-only, RLS-isolated,
same-organization, idempotent and sequential. The browser supplies neither
tenant/actor provenance nor context/model authority. V1 uses bounded canonical
Company context but no durable memory, competitor evidence, external research,
tools or automatic memory writes.

This artifact remains a Create-mode review. It does not define TASK-020's Ask
Council conversation, routing, persistence or UI contract. TASK-017 research
and TASK-018 performance evidence may be supplied only through future explicit
authorized workflows.

## ADR-030 — External research is a bounded durable evidence workflow

TASK-017 uses one exact Marketing SERVERLESS job rather than browser-held work,
the Windows worker, a crawler, or a general agent runtime. After a hosted
enqueue, stable Next.js `after()` execution invokes the shared registry-backed
executor with the trusted persisted job ID. A Vercel Hobby-compatible daily
Cron calls one Node route with `CRON_SECRET` for recovery; each invocation
claims and processes at most one statically registered SERVERLESS job through
the same lease lifecycle.

The immediate and recovery paths never call Marketing handler internals. A
service-only targeted claim uses the same `SKIP LOCKED`, attempt, lease and
concurrency-group invariants as the generic claim. Therefore overlapping
post-response and Cron invocations cannot execute one persisted job twice.

Hacker News retrieval is confined to its code-owned API host. Browser-supplied
RSS/Atom URLs cross one pinned-DNS HTTPS safe-fetch boundary that rejects
non-public resolution and revalidates redirects. Deterministic code owns
normalization, bounds, hashing, deduplication and EVID identifiers. Untrusted
source text has no instruction or tool authority.

Multi-word query inputs use deterministic normalized keyword tokens rather than
requiring a contiguous phrase. Source adapters distinguish successful retrieval
with zero candidates or zero matches from DNS, address-policy, connection, TLS,
HTTP, content-type, size and payload failures. The distinction is stored in the
existing bounded source metadata contract, so no schema change is required and
no sensitive transport detail is retained.

Only retained evidence reaches one maximum trusted ModelGateway structured
synthesis. Reports are immutable and every supported statement must reference
persisted evidence from that run. Research is Marketing working data: it does
not automatically execute either Council workflow or write durable memory.

## ADR-031 — Enrich only matched research sources into typed immutable evidence

TASK-017B deepens the existing HN adapter after deterministic matching instead
of adding a search engine or crawler. At most two matched stories receive native
text, a bounded first-five top-level plus first-listed one-level reply sample,
and at most two unique linked-article fetches. Linked articles reuse the
pinned-DNS HTTPS boundary; a pinned `htmlparser2` dependency performs
deterministic non-browser extraction and paragraph-based chunking. No embedded
link is followed and no JavaScript or extra model call is used.

Separate `HN_STORY`, `HN_TEXT`, `HN_COMMENT` and `ARTICLE_CONTENT` evidence rows
preserve the semantic source of each claim and establish an extensible
provenance contract for future research types. Deterministic native-ID,
canonical-URL and content-hash deduplication precedes EVID assignment. Enriched
evidence is immutable, organization-scoped and linked to the existing durable
run/source record; legacy evidence remains valid.

Retrieval is bounded to 20 seconds and synthesis to 35 seconds inside a
55-second workflow with a five-second completion reserve. The synthesis schema
uses the exact per-run EVID set and hard response cardinality/text limits sized
for the fixed 1,600-token ceiling while retaining defense-in-depth reference
validation. These output limits do not discard or reduce the persisted evidence
provided as synthesis input. Partial enrichment
failures retain useful story/article/comment evidence. One trusted ModelGateway
synthesis remains the maximum and treats every external field as untrusted
quoted data with no tool, memory or autonomous-retrieval authority. TASK-017C,
not this decision, owns future Reddit and bounded web/fashion-editorial source
expansion; social-platform intelligence remains separate.

## ADR-032 — Require parameter-capable OpenRouter routes for structured output

OpenAI-compatible syntax alone does not prove that every routed provider honors
strict JSON Schema. OpenRouter's default provider routing may pass a request to
a provider that ignores unsupported parameters, while `openrouter/free`
randomly selects from a changing free-model pool. Stylus therefore sends
`provider.require_parameters=true` only for structured requests to the exact
OpenRouter host. Generic compatible endpoints and text generation are not given
OpenRouter-specific fields.

The gateway continues to reject malformed JSON and schema-invalid content. It
does not repair JSON, strip fences, retry, weaken Zod/EVID validation or persist
provider content. Production structured workflows should configure a concrete
model that advertises both `response_format` and `structured_outputs`; the model
registry's capability flag is an operator declaration rather than runtime
provider discovery.

## ADR-033 — Fashion intelligence uses deterministic source planning

Status: ACCEPTED

TASK-017C preserves one durable Marketing research workflow and separates
retrieval from intelligence and future creative generation. One controlled
fashion-marketing intent maps in code to at most three source families with
controlled reason codes. HN is conditional on fashion technology. Reddit and
editorial communities/domains are registry-owned; browser input cannot broaden
them.

Reddit transport is default-disabled and uses only approved application-only
OAuth on fixed official hosts. No scraping fallback exists. Curated feed and
article retrieval reuses the pinned-DNS HTTPS boundary; optional general search
is only a narrow provider interface and is not mandatory. This trades source
breadth for terms compliance, SSRF safety, predictable cost and the Vercel Hobby
execution window.

The intelligence layer makes zero or one structured ModelGateway call and
persists one immutable `marketing-fashion-research-report-v1` artifact. Signals
and strategic Content Opportunity Candidates cite exact current-run evidence.
They are not hooks, scripts or Reel Briefs and trigger no Council, memory,
performance-learning or social-platform workflow. TASK-017D owns future
Instagram/TikTok/YouTube/Pinterest discovery.

Source allowlisting and topical relevance are separate controls. Editorial
candidate relevance is deterministic and lexical: low-information domain and
request words never satisfy the gate by themselves, meaningful explicit-term
concepts take precedence, and meaningful question concepts are only a fallback
for generic-only explicit terms. Metadata is gated before article fetch and
extracted article text is gated again. This avoids both irrelevant evidence and
an extra model/embedding call while preserving the existing safe-fetch limits.

## ADR-034 — Social intelligence is official-only and fail-closed

Status: ACCEPTED

TASK-017D extends the existing durable Marketing research job with one common
`SOCIAL` adapter and explicit Instagram, TikTok, YouTube and Pinterest
capabilities. It does not scrape platform HTML, automate consumer accounts,
reuse cookies, evade anti-bot controls, or call reverse-engineered APIs. A
platform without a compliant configured transport returns a bounded unavailable
observation; no fallback transport exists.

| Platform | Official capability relevant to Stylus | V1 status | Reason |
| --- | --- | --- | --- |
| Instagram | Professional-account API with approved permissions; public/hashtag access is review-gated | `APPROVAL_REQUIRED` | No approved Meta app, professional-account OAuth lifecycle or public-content authorization is configured |
| TikTok | Research Tools expose public research data to qualifying researchers | `UNSUPPORTED_FOR_DISCOVERY` | TikTok states commercial users are not eligible for Research Tools |
| YouTube | Data API supports public search, video metadata and comments | `POLICY_DENIED` | Non-authorized API data must be refreshed or deleted under the 30-day policy; immutable Stylus evidence has no compliant lifecycle yet |
| Pinterest | Approved business OAuth and account-scoped API | `APPROVAL_REQUIRED` | No approved arbitrary public-listening/discovery path is configured |

Primary references reviewed on 2026-08-31 were Meta's official
[Instagram API collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api),
TikTok's [Research API overview](https://developers.tiktok.com/docs/en/about-research-api)
and [eligibility FAQ](https://developers.tiktok.com/docs/en/research-api-faq),
YouTube's [search](https://developers.google.com/youtube/v3/docs/search/list),
[videos](https://developers.google.com/youtube/v3/docs/videos/list) and
[developer policies](https://developers.google.com/youtube/terms/developer-policies),
and Pinterest's [access tiers](https://developers.pinterest.com/docs/key-concepts/access-tiers/)
and [authentication](https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/).

The browser supplies only controlled intent, question and terms. The server
derives platform and organization-scoped competitor identities, and the
service-only enqueue validates the persisted plan against active profiles.
Social records retain only bounded public provenance; comment authors are not
stored. Modality validation prevents caption/comment/metadata evidence from
supporting visual claims, and competitor observations require a configured
competitor association.

Ordinary research remains deterministic through evidence persistence and makes
exactly zero or one trusted ModelGateway synthesis call. Media acquisition is
disabled; TASK-014 is not invoked implicitly. No social write permission,
Council workflow, Reel Brief, memory write, TASK-018 or TASK-020 path is added.

## ADR-035 — Separate web discovery from evidence retrieval

Status: ACCEPTED

TASK-017E uses Tavily Search as a fixed-host, server-only candidate-discovery
provider. The choice was reviewed against current official materials on
2026-09-01. Tavily supports a direct Search API, basic search costs one credit,
and the published free tier includes 1,000 credits per month. Its terms permit
API integration with customer applications for internal business purposes.
Google Custom Search is closed to new customers and ends for existing users on
2027-01-01. Brave is technically suitable, but its standard terms restrict
search-result storage unless the selected plan grants explicit storage rights.

References: [Tavily Search API](https://docs.tavily.com/documentation/api-reference/endpoint/search),
[Tavily credits](https://docs.tavily.com/documentation/api-credits),
[Tavily terms](https://www.tavily.com/terms),
[Brave Search API](https://brave.com/search/api/), and
[Google Custom Search status](https://developers.google.com/custom-search/v1/overview).

Provider ranking content, snippets, answers and raw content are never persisted
or accepted as evidence. Stylus requests no answer/raw content and retains only
transient title/URL/publication metadata long enough to perform deterministic
candidate relevance and URL policy checks. A selected URL then becomes a new,
independent request through the centralized pinned-DNS HTTPS fetch boundary.
Publisher robots policy, response type/size/time, redirects, extraction and
fashion relevance all fail closed. This design avoids treating a search vendor
as a content license or SSRF authority.

Only public, non-sensitive concepts derived from the bounded research question
and terms are sent to search. Operators must re-review Tavily terms and obtain
an appropriate agreement before exposing this provider in a customer-facing
commercial deployment beyond the documented internal use. A provider change
must preserve the same fixed-host interface, no-snippet-evidence rule and
independent page-fetch boundary.

## ADR-036 — Performance learning is deterministic, local and append-only

Status: ACCEPTED

TASK-018 records manual Instagram Reel publications separately from immutable
observations. Missing metrics remain NULL and supplied zero remains zero.
Derived values are calculated from unrounded raw observations with explicit
denominators; zero or unavailable denominators produce no rate. Observation age
is classified as EARLY [0,24h), SHORT_TERM [24h,72h), SEVEN_DAY [72h,8d), or
MATURE [8d,+∞), and only same-organization, same-platform, same-horizon values
are comparable.

V1 uses the latest eligible snapshot per content/horizon and the organization
median `SAVE_RATE_BY_REACH`. A baseline needs five content items and a segment
needs three. Segment evidence strength is WEAK for 3–4, MODERATE for 5–9, and
STRONG for 10 or more; these labels are descriptive, not statistical
significance. Derivation is capped at 100 content rows, 500 snapshots and 20
new immutable learning artifacts.

The segment dimension is the existing TASK-017C Content Opportunity taxonomy,
selected explicitly on publication registration. It is never inferred from
free text, research or a model; an absent value stays unclassified. Exact Reel
Brief version linkage remains independent and relational. Learning history
stores the exact supporting content/snapshot/brief references and algorithm
`marketing-performance-learning-v1`; identical evidence is idempotent and new
evidence creates a new artifact.

No AI call or automatic Council, Strategic Review, research, memory or Ask
Council side effect occurs. An official future platform adapter may submit only
a normalized snapshot draft through the same validation/persistence boundary.
Future Council work must deliberately retrieve selected learnings through a
separate authorized bounded projection.
