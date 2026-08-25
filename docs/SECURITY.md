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
