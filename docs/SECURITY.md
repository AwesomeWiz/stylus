# Stylus — Security Requirements

## Organization Isolation

Users must only access organizations they belong to.

Enforce authorization server-side.

Use Supabase RLS where appropriate.

---

# Permissions

Sensitive actions require explicit permissions.

Do not rely solely on hidden UI elements.

Backend authorization remains mandatory.

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