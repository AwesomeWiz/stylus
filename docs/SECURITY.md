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

---

# AI Memory

Memory queries require:

- organization scope
- domain scope
- optional workspace scope

Marketing must not retrieve Agency memory.

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
