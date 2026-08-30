# Stylus — Security Requirements

## Organization Isolation

Users must only access organizations they belong to.

Enforce authorization server-side.

Use Supabase RLS where appropriate.

Phase 1 enforcement:

- authenticated server helpers verify users with Supabase Auth
- organization IDs are validated and membership-checked before use
- organization reads require membership through RLS
- organization name updates require an `OWNER` or `ADMIN` membership
- users can read only their own membership records
- clients have no direct membership insert, update or delete grants
- initial organization and `OWNER` membership creation is atomic

---

# Permissions

Sensitive actions require explicit permissions.

Do not rely solely on hidden UI elements.

Backend authorization remains mandatory.

Phase 2 company-profile behavior:

- organization members may read their organization's onboarding source data
- only `OWNER` and `ADMIN` may insert or update it
- Server Actions derive organization and audit identities from authenticated
  server context rather than trusting hidden/browser fields
- every new organization-owned table has RLS select/insert/update policies
- no delete grant is provided; competitor removal uses archival
- triggers prohibit organization reassignment, creator reassignment and forged
  updater identities
- completion is accepted only after all required structured sections exist
- progress advancement is an authenticated, role-checked security-invoker RPC;
  organization scope is still derived and validated server-side

---

# AI Memory

Memory queries require:

- organization scope
- domain scope
- optional workspace scope

Marketing must not retrieve Agency memory.

---

# Task Management

- every task and comment carries an explicit organization boundary
- Server Actions derive organization, creator and updater identities from the
  authenticated organization context
- assignees must satisfy a composite foreign key to membership in the same
  organization and are also validated before mutation
- OWNER, ADMIN and MEMBER may perform normal task collaboration; VIEWER has
  read-only access
- RLS blocks cross-organization reads and mutations and anonymous access
- column-level grants prevent clients from setting IDs, timestamps,
  `completed_at`, organization ownership or creator provenance
- lifecycle triggers set/clear `completed_at` and preserve its first completion
  value across duplicate completion requests
- the member selector uses a membership-checked, pinned-search-path function and
  exposes only IDs, display names and roles
- tasks and comments have no delete grant in Phase 3

---

# Notifications, Reminders and Activity

- notification reads require both the authenticated recipient identity and
  current organization membership through RLS
- read timestamps are set with database time through organization/recipient
  checked functions; browsers cannot update notification rows directly
- notification rows contain controlled entity references and never arbitrary
  redirect URLs
- activity is immutable, organization-readable audit history created by
  security-definer triggers after authorized task/comment writes
- authenticated/anonymous roles receive no notification insert, activity write
  or reminder-delivery access
- the reminder processor is revoked from browser roles, joins current
  membership, and rechecks current assignee, active status and exact deadline
- the service-role credential remains server-side; hosted database Cron invokes
  the processor without exposing credentials to application clients

---

# Whiteboards and Board Images

- protected pages and every mutation derive the current organization from the
  authenticated membership context
- board and element RLS allows member reads; only OWNER, ADMIN and MEMBER mutate
- restricted grants and triggers prevent organization, board, creator and
  creation-time reassignment, including forged creator identities
- composite foreign keys prevent elements from referencing another organization
- browsers receive no hard-delete grant; board and element removal is archival
- text is rendered as ordinary React text, never through `dangerouslySetInnerHTML`
- uploads accept only PNG, JPEG and WebP up to 10 MB with server-side validation
- `board-images` is private; path-derived organization policies protect reads,
  writes and removal, and rendering uses expiring signed URLs
- storage service-role credentials are not used or exposed
- board comments inherit board/organization scope through composite foreign keys;
  browser roles receive SELECT only and use permission-checking RPCs for writes
- mentions store validated member UUIDs rather than trusting display text, and
  notification recipients are derived inside the same database transaction
- private Presence topics require current board membership; displayed identity
  and role are resolved from the member directory, not client metadata
- Realtime Postgres Changes remain protected by table RLS and board filters;
  cleanup prevents subscriptions surviving navigation to another board

---

# Team Invitations

- links contain 256-bit random URL-safe tokens; PostgreSQL stores only SHA-256
  hashes and never exposes them through team/list RPCs
- anonymous users cannot query invitation rows; a strong token permits only a
  minimal organization/role preview
- acceptance accepts no organization, role or invitee identifier; the locked
  invitation and authenticated Supabase email determine them
- OWNER/ADMIN RPCs repeat authorization; MEMBER and VIEWER receive no direct
  invitation or membership mutation grants
- invites grant only MEMBER or VIEWER; OWNER cannot be removed or changed, and
  ADMIN cannot manage another ADMIN
- revoked, expired, wrong-email and cross-organization attempts fail atomically
- removed memberships retain provenance but are excluded by authorization/RLS
  helpers and collaboration directories

---

# Plugin Platform

- only statically imported repository modules execute; remote code, dynamic URLs,
  uploaded JavaScript and `eval` are unsupported
- manifests validate stable IDs, owned permissions/tools, routes, memory-domain
  names and controlled Lucide icon identifiers at module load
- the application registry rejects duplicate IDs and exclusive capabilities
- organization plugin rows are RLS isolated; direct writes are revoked
- OWNER/ADMIN mutation repeats authorization in PostgreSQL and derives actor
  provenance; MEMBER/VIEWER cannot escalate enablement
- application actions accept only registered IDs and derive organization scope;
  unknown well-formed database rows remain inert
- disabled plugins have no navigation, available capabilities, event dispatch or
  guarded route access, but disablement does not delete data or history
- memory domains and AI tools are metadata only and create no retrieval,
  credential or execution authority
- the import-boundary test prevents Core from importing plugin private internals
  and limits plugin implementations to the documented public Core contract

---

# AI Platform

- provider adapters, configured base URLs and credentials are server-only; no
  provider secret or URL is accepted by browser execution requests
- plugins use the normalized Stylus AI boundary and cannot import provider
  implementations; raw provider clients/responses are never public contracts
- organization and actor IDs plus run IDs are derived server-side; inactive
  memberships and VIEWER execution are denied before provider setup
- plugin-originated execution requires static registration, current organization
  enablement and an exactly declared capability
- manifest memory domains are copied into safe trace context only; they grant no
  memory retrieval and cannot cross the Marketing/Agency policy
- `LOCAL_ONLY` routing removes every remote candidate before invocation and may
  never fall back remotely
- provider allowlists contain validated registered IDs, not arbitrary URLs;
  configured endpoints reject credentials, non-HTTP schemes, queries and fragments
- paid remote routing is denied before invocation when the configured estimated
  monthly ceiling is reached; free/local models remain eligible under policy
- every request has a bounded timeout/cancellation signal and at most one retry
  for narrowly transient categories, limiting retry-driven cost amplification
- Zod validates structured output; malformed JSON/schema output is a failed run
  and never reaches application logic as typed data
- model tool names and arguments are untrusted; only explicit registered tools,
  capabilities, plugin enablement and validated schemas can become executable
- run tables store safe metadata, token counts and estimated costs, not provider
  keys, complete prompts, responses or chain-of-thought
- OWNER/ADMIN manage policy, MEMBER may use future authorized operations, VIEWER
  is read-only, and database RLS isolates policy/run reads by active membership

---

# Company Knowledge and Memory

- canonical Company Knowledge is composed server-side from existing profile
  tables and is never synchronized into opaque memory copies
- every durable memory row carries organization, controlled domain/kind,
  provenance, lifecycle and creator/system-origin fields
- authenticated table access is SELECT-only and RLS exposes only company-domain
  rows belonging to an active organization membership
- browser lifecycle RPCs derive `auth.uid()`, require OWNER/ADMIN/MEMBER and
  force human/company provenance; VIEWER and removed members cannot mutate
- organization ownership, privileged provenance and plugin identity are not
  accepted by Server Actions
- Core AI capabilities can request only company context and receive nothing
  unless they explicitly request it
- plugin retrieval requires static registration, current enablement, an exact
  declared capability and requested domains contained by the manifest
- generic Core/browser paths cannot read Marketing or Agency-private domains,
  and no generic browser-callable plugin write function exists
- retrieval is deterministic, excludes archived rows by default and enforces
  hard 50-row general and 20-row AI-context limits
- memory retrieval never invokes an AI provider and `ai_runs` remains
  metadata-only rather than acting as memory
- ordinary deletion, automatic promotion, embeddings, pgvector and ingestion
  are not enabled

---

# Secrets

Never expose:

- Supabase service-role credentials
- model provider secrets
- worker secrets
- third-party API secrets

to browser code.

Use environment variables and server-side secret handling.

The web application uses only Supabase's browser-safe publishable key. No
service-role client or environment variable is present in the TASK-002 runtime.

Required public configuration is schema-validated at startup. Secret-key names
and prefixes are checked against production browser chunks during verification.

---

# Sessions

Supabase SSR stores sessions in cookies and rotates refresh tokens through the
Next.js Proxy boundary. Proxy uses verified claims rather than trusting the
unvalidated session user object. Server Actions and protected pages independently
validate the authenticated user before accessing organization data.

Authentication errors are intentionally generic. Passwords, access tokens and
refresh tokens are never logged by application code.

---

# Files

Validate uploads.

Restrict file types and sizes.

Use signed/private URLs where confidential data is involved.

---

# Worker

Workers require authentication.

Worker claims must be scoped and auditable.

Never expose local Ollama directly to the internet.

TASK-011 grants authenticated browser roles no job table mutation and no worker
lifecycle function execution. Enqueue derives actor and organization, requires a
registered server-side definition, validates input, rejects VIEWER, and repeats
enabled-plugin checks. The database constrains Core/plugin namespace provenance,
metadata size and recursively forbidden secret/raw-content keys.

Enqueue persistence failures log only the operation stage, validated SQLSTATE
and a normalized authorization/validation/constraint/database-contract category
on the server. Job input, database messages/details, tokens and result payloads
are not logged or returned to the browser.

Claims use row locks, skip-locked semantics, leases and a concurrency-group
transaction lock. Every worker transition requires the current claimant and an
unexpired lease. Stale leases are recoverable, retries are bounded, and queued
cancellation cannot forge terminal success. Service-role credentials remain in
trusted hosted infrastructure and must never be shipped to a browser or future
Windows worker; TASK-012 must add a narrow authenticated worker adapter.

TASK-012 workers call bounded hosted broker routes. The Supabase service-role
credential exists only in the Next.js server environment and is never returned
to the worker. Worker and pairing bearer values are 256-bit random tokens stored
only as SHA-256 digests. Every service-only RPC revalidates active registration,
organization, authorized capability and claim ownership. Revocation immediately
denies new calls and lets any running lease expire for stale recovery. Broker
requests are size-limited, rate-limited and normalized; CORS/User-Agent is not
authentication. No arbitrary executable, shell or dynamic job handler exists.

---

# Marketing Data Security

Marketing table reads require an active organization membership and enabled
`marketing` plugin. Writes additionally require OWNER, ADMIN, or MEMBER; VIEWER
is read-only. Server actions derive organization and actor, RLS independently
rechecks both, and database triggers overwrite actor provenance and reject
immutable ownership changes. Composite foreign keys reject cross-organization
campaign and Core competitor references. Authenticated clients receive no hard
delete grant, and plugin disablement retains data while denying access.

Activity metadata contains only record type and a bounded title. Marketing CRUD
does not expose the service-role credential or create AI runs, jobs, or memory.

---

# AI Tools

AI agents operate with least privilege.

Tools must enforce authorization independently of model instructions.

Never assume an AI model is trusted.

---

# Logging

Do not log:

- passwords
- access tokens
- secret keys
- unnecessary confidential content

Maintain useful audit events for sensitive operations.

---

# Destructive Actions

Require deliberate user actions for destructive operations.

Prefer archive/soft-delete where historical information matters.

---

# External Content

Treat scraped/retrieved external text as untrusted data.

Do not allow external content to override system instructions, tool
permissions or authorization rules.

---

# Testing

Maintain security tests for:

- cross-organization access
- unauthorized mutations
- memory-domain isolation
- plugin permissions
- file access
- worker authentication

## Competitor Reel Security

- Upload preparation derives actor and organization from the authenticated
  session; OWNER, ADMIN, and MEMBER may mutate while VIEWER is read-only.
- Storage is private, organization-scoped, MIME/size bounded, and protected by
  Marketing enablement plus membership RLS.
- A source URL permits only bounded credential-free HTTP(S) metadata and is
  never fetched by CRUD or the worker.
- The service-role key remains hosted-server-only. The worker receives a
  60-second signed URL only after credential, organization, active claim, lease,
  job type, Reel, and storage path are derived and verified by PostgreSQL.
- Worker results are schema/size bounded and cannot select a table or path.
- FFmpeg and Python use repository-selected executables/scripts and argument
  arrays with `shell: false`; job input cannot supply commands or filesystem
  paths.
- Activity excludes source URLs, transcript, prompt, provider response, and
  full analysis. No automatic `knowledge_memories` write occurs.

## Creative Council Security

- The browser submits only one Reel Idea ID, up to three analysis IDs, and a
  request idempotency UUID. Organization, actor, plugin, provider, model, and
  memory authority are server-derived.
- New workflow tables are read-only to authenticated clients through Marketing
  RLS. Only service-role transition functions may mutate them. Start and
  successful advancement revalidate active role, plugin enablement,
  organization references, stage order, logical model tier, and AI-run
  provenance. Failure finalization can only close the matching creator's active
  stage, even if membership changes during provider execution.
- The ModelGateway remains the only provider boundary. LOCAL_ONLY cannot fall
  back remotely; DISABLED, allowlist, and budget denial stop the current stage.
- Competitor evidence is explicit, same-organization, completed, bounded, and
  allowlisted. It excludes media, transcript, URLs, Storage paths, raw JSON, and
  wording selected for imitation.
- Persisted history contains structured user-facing output and normalized
  failure metadata only. It contains no prompt, hidden reasoning, provider raw
  response, credential, or automatic memory promotion.
- TASK-016 Strategic Review accepts only an idempotency UUID and exact Reel
  Brief version UUID from the browser. The server loads and snapshots the
  same-organization immutable brief plus bounded canonical Company context;
  organization, actor, provider, model, prompts and context records cannot be
  supplied by the client.
- Strategic Review tables are authenticated SELECT-only behind Marketing RLS.
  Service-only pinned-search-path transitions enforce active execution role,
  plugin enablement, exact-source relational integrity, sequential stage,
  logical tier and `ai_runs` provenance. Advisory locks plus database uniqueness
  block accidental duplicate active/final records.
- Challenge receives no company-wide context, memory, competitor records, media
  or research. No TASK-016 specialist has a tool or memory domain. Evidence
  status and Judge dispositions reduce unsupported reasoning without treating
  prompt instructions as authorization or claiming hallucination elimination.
- Only Judge success after the other four successful stages creates a final
  review. Failure preserves safe prior output, stores normalized metadata and
  never persists prompts, provider responses, chain-of-thought, secrets or an
  automatic memory write.

## External Research Security

- Only OWNER, ADMIN and MEMBER may enqueue; VIEWER and removed members remain
  read-only/denied. Organization and actor come from fresh server context, and
  service-only SQL revalidates membership plus Marketing enablement.
- RSS/Atom permits only public HTTPS on port 443. DNS results are checked before
  a custom HTTPS connection pins the selected public address while TLS retains
  the original hostname. Every redirect is re-resolved and revalidated.
- Source bodies, auth data and provider internals are neither logged nor stored.
  Rendered excerpts are escaped text; displayed external links are HTTPS-only.
- Untrusted content cannot select prompts, tools, providers, models, URLs,
  memory, tenants or limits. No agency-memory or automatic-memory access exists.
- Immediate hosted execution receives only the trusted job UUID returned by the
  service-only enqueue. The browser cannot select a job, executor, tenant or
  handler. Immediate and daily recovery execution share atomic database claims,
  leases, attempt limits, concurrency locking and the static job registry.
