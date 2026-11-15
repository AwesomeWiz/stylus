# Reporting a vulnerability

Report suspected credential exposure, cross-tenant access or other vulnerabilities
privately. Use [GitHub private vulnerability reporting](https://github.com/AwesomeWiz/stylus/security/advisories/new)
when enabled. Enabling this feature is a maintainer release prerequisite; this
file does not claim the repository setting is already enabled.

If private reporting is unavailable, open a minimal issue asking for a private
security contact, **without** credentials, exploit details, affected customer data
or private URLs. Wait for a confirmed private channel before sharing details.

Include the affected commit, deployment type, minimal fictional reproduction,
impact and any suggested mitigation. Do not test against someone else's deployment
or real tenant data without permission. There is no bounty or guaranteed response
deadline. Coordinate disclosure with the maintainer.

## Supported versions

The latest beta release is the supported security baseline. Pre-release commits
and older betas may require upgrading; no long-term support window is promised.

## Model and limits

Stylus uses server-derived identity, organization membership, role checks and
Supabase RLS. Google connections are user-private; GitHub is organization-scoped.
Provider refresh credentials use server-only versioned authenticated encryption.
AI goes through ModelGateway; memory domains are enforced in code and database,
not by prompts. Working content is not automatically promoted into Company Memory.

These controls are tested safeguards, not a guarantee or certification. Operators
are responsible for secrets, TLS, backups, provider applications, database updates
and configuration. Read [security architecture](docs/SECURITY.md),
[privacy](docs/PRIVACY.md) and the [release audit](docs/RELEASE_AUDIT.md).
