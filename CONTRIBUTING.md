# Contributing to Stylus

Thank you for helping improve Stylus, an open-source operating system for startup
teams. Focused bug fixes, tests, accessibility improvements, documentation, and
well-scoped product or infrastructure changes are welcome.

## Before contributing

Read [README.md](README.md), search existing issues and pull requests, and open
an issue before investing in a large or architectural change. Changes involving
authorization, RLS, AI, jobs, workers, external research, or plugins also require
the relevant documents under `docs/`, especially
[Architecture](docs/ARCHITECTURE.md) and [Security](docs/SECURITY.md).

## Development setup

Prerequisites are Node.js 20.9 or newer, npm, the Supabase CLI, and a
Docker-compatible runtime for the full local database stack.

```bash
git clone https://github.com/AwesomeWiz/stylus.git
cd stylus
npm ci
npx supabase start
npx supabase db reset
cp .env.example apps/web/.env.local
npm run dev
```

On PowerShell, copy the environment file with:

```powershell
Copy-Item .env.example apps/web/.env.local
```

Replace only the browser-safe Supabase placeholders with values reported by the
local Supabase stack. AI, research, and Windows-worker integrations are optional.
Never commit `.env.local` or use `NEXT_PUBLIC_*` for a secret.

## Branches and scope

Branch from the latest `main` and keep the branch focused. Names such as
`feat/short-description`, `fix/short-description`, and
`docs/short-description` are appropriate. External contributors do not need to
use the repository's internal Codex task naming convention.

Avoid unrelated refactors and unnecessary dependencies. Do not commit generated
build output, coverage, local worker configuration, native binaries, model
weights, temporary media, transcripts, or secrets.

## Code and architecture expectations

- Use strict TypeScript, explicit validation, predictable errors, accessible UI,
  and tests for important behavior.
- Keep Stylus a modular monolith. Core must not depend on plugin internals;
  plugins use documented public Core interfaces.
- Derive organization and actor authority server-side. Preserve RLS and permanent
  organization-isolation tests.
- Preserve `company`, `marketing`, and `agency` memory-domain isolation. Working
  data becomes permanent knowledge only through explicit approval.
- Route every model call through `ModelGateway`; application modules must not
  call providers directly.
- Use persisted jobs with bounded retries and stopping conditions for long work.

## Database changes

Create a new forward-only migration for every schema change. Never rewrite an
applied migration. Review grants, RLS, same-organization constraints, and
security-definer search paths, then add or update database security tests.

## Verification

Run the complete deterministic application gate:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

When database behavior changes, also run the local Supabase stack and:

```bash
npm run db:reset
npm run db:lint
npm run test:db
```

## Pull requests

Explain the problem, solution, tests, and security/privacy implications. Include
screenshots made with fictional data for meaningful UI changes, and call out any
migration, AI/provider, plugin, job, or memory-boundary impact. A pull request
should contain no unrelated formatting or refactoring churn.

Do not report vulnerabilities in public issues or pull requests. Follow the
private process in [.github/SECURITY.md](.github/SECURITY.md).

## AI-assisted contributions

AI-assisted contributions are welcome, but contributors remain responsible for
understanding the submission and for its correctness, licensing, security, and
tests. Do not submit confidential prompts, private data, secrets, or material you
do not have the right to license. Private chain-of-thought disclosure is neither
requested nor required.

## Contribution license

By intentionally submitting a contribution for inclusion in Stylus, you agree
that it is licensed under Apache-2.0, consistent with section 5 of the project
license. No copyright transfer or mandatory DCO sign-off is imposed at this
time. A CLA may be considered later only if a future dual-licensing or formal
commercial-licensing model requires it.
