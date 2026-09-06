# Stylus

![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)
![Node.js 20.9+](https://img.shields.io/badge/Node.js-%3E%3D20.9-339933.svg)

Stylus is an open-source, collaborative, AI-enabled operating system for startup teams. It
combines everyday company operations—tasks, team coordination, whiteboards,
knowledge, decisions, and activity—with bounded AI workflows and a modular
business-plugin architecture.

The first production business plugin is Marketing. It supports a pre-product
team planning Instagram Reels, researching audience and market signals,
developing creative briefs, reviewing ideas with specialized AI roles, and
learning from manually recorded performance.

Stylus is designed to remain useful when AI providers, external data sources,
or the optional Windows worker are unavailable. Human collaboration and the
database remain the source of truth.

Start with [Getting started](#getting-started). Contributions are welcome under
[Apache-2.0](LICENSE); see [Contributing](CONTRIBUTING.md),
[Security](.github/SECURITY.md), and [Support](SUPPORT.md).

## Contents

- [Product capabilities](#product-capabilities)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Database and migrations](#database-and-migrations)
- [AI execution](#ai-execution)
- [Durable jobs and the Windows worker](#durable-jobs-and-the-windows-worker)
- [Marketing intelligence](#marketing-intelligence)
- [Security model](#security-model)
- [Testing and quality gates](#testing-and-quality-gates)
- [Deployment](#deployment)
- [Project documentation](#project-documentation)
- [Contributing](#contributing)
- [License and project identity](#license-and-project-identity)
- [Current limitations](#current-limitations)

## Product capabilities

### Core workspace

- **Authentication and organizations** — Supabase Auth sessions, organization
  membership, OWNER/ADMIN/MEMBER/VIEWER roles, secure organization selection,
  and resumable company onboarding.
- **Team management** — one-time hashed invitation links, role management,
  soft member removal, and manager-only last-sign-in visibility. Last-sign-in
  timestamps are displayed in the current viewer's browser timezone.
- **Home dashboard** — an organization-scoped operational summary of tasks,
  activity, team state, enabled apps, and Marketing work.
- **Tasks** — assignments, priorities, start and due times, status transitions,
  comments, mentions, overdue/upcoming views, recent completion, and archival.
- **Notifications and activity** — recipient-private notifications,
  organization-visible activity, and idempotent task reminders at the
  approximately 24-hour, one-hour, and deadline boundaries.
- **Whiteboards** — React Flow boards with text, sticky notes, images, shapes,
  arrows, undo/redo, comments, mentions, private Realtime collaboration,
  collaborator presence, and ephemeral cursors.
- **Company Knowledge and Memory** — structured company profile data plus
  explicitly approved, organization-scoped durable memories. Working content
  is never promoted automatically.
- **Apps** — trusted, statically registered plugins that managers can enable or
  disable without deleting historical plugin data.
- **AI administration** — organization policy, provider-neutral logical model
  tiers, safe run metadata, budgets, and an authenticated connection test.
- **Jobs and workers** — a durable queue with scheduling, retries, leases,
  cancellation, stale-claim recovery, and an optional outbound Windows worker.
- **Settings and appearance** — account and organization settings,
  Light/Dark/System themes, and OWNER-only organization deletion.

### Marketing plugin

- Manual competitors, Reel ideas, campaigns, research notes, and creative
  briefs.
- Permission-controlled competitor Reel upload and analysis through the
  optional Windows media worker.
- Creative Studio's bounded Hook Strategist → Script Writer → Creative Critic
  workflow and immutable, versioned Reel Briefs.
- A five-stage Strategic Review with Audience Researcher, Brand Director,
  Content Strategist, Challenge Reviewer, and Creative Judge.
- Durable External Research with deterministic source planning, immutable
  evidence, explicit provenance, partial-source behavior, and at most one
  synthesis call per run.
- Fashion editorial, Hacker News, optional approved Reddit access, official-only
  social capability planning, and optional Tavily web discovery followed by
  independent safe page retrieval.
- Deterministic Performance Learning over manually registered publications and
  append-only metric snapshots. This workflow uses no AI.
- Ask Council, a bounded advisory workflow that selects a small deterministic
  specialist set, reads only authorized existing context, and returns one
  provenance-backed answer.

## Architecture

Stylus is a modular monolith. Core owns reusable platform capabilities;
business plugins own their domain behavior and may depend only on documented
Core interfaces.

```text
Browser
  |
  v
Next.js web application
  |-- Server Components / Server Actions / Route Handlers
  |-- Core modules
  |-- Trusted plugin registry
  |-- ModelGateway
  |-- Durable job executors
  |
  +--> Supabase
  |      |-- Auth
  |      |-- PostgreSQL + RLS
  |      |-- Realtime
  |      |-- private Storage
  |      `-- pg_cron database jobs
  |
  +--> Optional hosted AI provider
  +--> Approved external research APIs and public sources
  `--> Worker broker <---- outbound optional Windows worker
                              |-- FFmpeg / ffprobe
                              `-- whisper.cpp
```

Important architectural boundaries:

- The web application and Marketing plugin never call an AI provider directly;
  all model access passes through `ModelGateway`.
- Organization and actor identity are derived from the authenticated server
  context. Browser-supplied tenant or provider authority is not trusted.
- Long-running work is represented by durable PostgreSQL jobs rather than
  in-memory promises or browser-held requests.
- The Windows laptop is optional compute, never the production server. It opens
  outbound broker connections and never receives the Supabase service-role key.
- Company, Marketing, and future Agency memory domains are isolated in code and
  database contracts.
- Research, AI drafts, task comments, and whiteboard content do not become
  permanent company memory without an explicit approval action.

## Technology stack

| Area | Technology |
|---|---|
| Web application | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind CSS 4, shared semantic tokens, Radix Dialog, Lucide icons |
| Canvas | React Flow (`@xyflow/react`) |
| Backend | Next.js Server Components, Server Actions, and Route Handlers |
| Data platform | Supabase Auth, PostgreSQL 17, RLS, Realtime, Storage, Cron |
| Validation | Zod |
| AI | Stylus ModelGateway with Ollama and OpenAI-compatible adapters |
| Research parsing | `fast-xml-parser`, `htmlparser2`, centralized safe fetch |
| Worker | Node.js/TypeScript, optional FFmpeg/ffprobe and whisper.cpp |
| Tests | Vitest, Testing Library, pgTAP SQL suites |
| Hosting | Vercel-compatible web/serverless deployment plus Supabase |

The repository requires Node.js `>=20.9.0`. The current lockfile should be used
with npm for reproducible installs.

## Repository layout

```text
apps/
  web/                 Next.js application, Core modules, UI, and plugins
  worker/              Optional outbound Windows worker and CLI
packages/
  typescript-config/   Shared strict TypeScript configuration
supabase/
  migrations/          Forward-only PostgreSQL migrations
  tests/database/      pgTAP security and contract tests
docs/                  Product, architecture, security, and operations docs
assets/                Source brand assets
AGENTS.md              Repository engineering and safety instructions
PROJECT_STATE.md       Current implementation and verification state
CODEX_TASKS.md         Task history and roadmap contracts
CHANGELOG.md           User-facing changes
vercel.json            Hosted serverless recovery schedule
```

Within `apps/web/src`, reusable platform domains live under `modules` and
`core`; Marketing implementation remains under its plugin/domain boundary.
Database-generated/application database types are kept alongside the web
Supabase integration.

## Getting started

### Prerequisites

- Node.js 20.9 or newer
- npm
- Supabase CLI
- Docker-compatible local containers if running the full local Supabase stack

Optional prerequisites:

- Ollama and a local model for local-only AI development
- FFmpeg, ffprobe, and an approved whisper.cpp build for competitor Reel media
  analysis on Windows

### Install dependencies

```bash
git clone https://github.com/AwesomeWiz/stylus.git
cd stylus
npm ci
```

### Start local Supabase

```bash
npx supabase start
npx supabase db reset
```

`db reset` recreates the local database and applies every repository migration.
Use the URL and browser-safe publishable key reported by `supabase status`.

### Configure the web application

Copy the example to the web application's local environment file:

```powershell
Copy-Item .env.example apps/web/.env.local
```

On macOS or Linux:

```bash
cp .env.example apps/web/.env.local
```

Replace the example Supabase values with the local values. Leave optional AI,
worker-broker, Reddit, and web-discovery variables empty or disabled until the
corresponding capability is deliberately configured.

Never commit `.env.local`.

### Run Stylus

```bash
npm run dev
```

Open <http://localhost:3000>, create an account, create an organization, and
complete the resumable company onboarding flow.

## Configuration

The committed `.env.example` is the canonical variable template.

### Required browser-safe values

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project/API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase publishable key |
| `NEXT_PUBLIC_SITE_URL` | Canonical application origin used for auth links |

The `NEXT_PUBLIC_` prefix is appropriate only for these intentionally public
values. It must never be added to server credentials.

### Optional server-only AI values

| Variable | Purpose |
|---|---|
| `STYLUS_AI_OLLAMA_BASE_URL` | Local Ollama origin, normally loopback in local development |
| `STYLUS_AI_OLLAMA_MODEL` | Installed Ollama model name |
| `STYLUS_AI_OPENAI_COMPATIBLE_BASE_URL` | Deployment-controlled compatible API base URL |
| `STYLUS_AI_OPENAI_COMPATIBLE_MODEL` | Concrete configured remote model |
| `STYLUS_AI_OPENAI_COMPATIBLE_API_KEY` | Remote provider credential |
| `STYLUS_AI_REMOTE_INPUT_USD_PER_MILLION` | Optional input-cost estimate |
| `STYLUS_AI_REMOTE_OUTPUT_USD_PER_MILLION` | Optional output-cost estimate |

### Optional hosted infrastructure values

| Variable | Purpose |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only worker broker and trusted hosted job access |
| `CRON_SECRET` | Authenticates the bounded Vercel Cron executor route |
| `STYLUS_REDDIT_API_ENABLED` | Explicit opt-in for an approved Reddit API use case |
| `STYLUS_REDDIT_CLIENT_ID` | Approved confidential Reddit client ID |
| `STYLUS_REDDIT_CLIENT_SECRET` | Approved Reddit client secret |
| `STYLUS_REDDIT_USER_AGENT` | Approved descriptive Reddit user agent |
| `STYLUS_REDDIT_COMMUNITY_IDS` | Optional subset of code-owned community IDs |
| `STYLUS_WEB_DISCOVERY_TAVILY_API_KEY` | Server-only Tavily discovery credential |

Reddit and social integrations must not be enabled merely to make an acceptance
test return evidence. Use them only after the applicable platform approval,
retention, deletion, attribution, and commercial-use requirements are satisfied.

### Optional Windows worker values

The worker can additionally use:

- `STYLUS_WORKER_WHISPER_CPP_PATH`
- `STYLUS_WORKER_WHISPER_MODEL_PATH`
- `STYLUS_WORKER_FFMPEG`
- `STYLUS_WORKER_FFPROBE`

These point to operator-installed local tools. Stylus does not download native
binaries or model weights during install, build, or startup.

## Database and migrations

All schema changes are forward-only files under `supabase/migrations`. Never
rewrite a migration that may already be applied to a shared or hosted project.

Useful local commands:

```bash
npx supabase start
npx supabase db reset
npm run db:lint
npm run test:db
```

Before applying hosted changes, inspect the linked plan:

```bash
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

Only after reviewing the exact pending migration set should an operator apply
it:

```bash
npx supabase db push --linked
```

Migrations define more than tables. They enforce tenant isolation, role checks,
immutable histories, composite same-organization references, job leases,
idempotency, and narrow RPC privileges. Application checks complement these
database controls; they do not replace them.

## AI execution

Organizations choose one of three policy modes:

- `DISABLED` — AI execution is denied.
- `LOCAL_ONLY` — only an available configured local provider may execute; there
  is no remote fallback.
- `REMOTE_ALLOWED` — policy-approved remote routing is allowed within the
  configured cost ceiling.

Application workflows request logical capabilities such as fast, balanced,
reasoning, vision, embedding, or transcription. Provider/model selection,
timeouts, normalized errors, budgets, and run traces belong to AI
infrastructure.

AI runs store safe operational metadata and provenance, not raw secrets,
provider responses, prompts, or hidden chain-of-thought. Structured workflows
validate both the provider envelope and the domain output before creating an
immutable artifact.

An Ollama URL such as `127.0.0.1` is local to the process running Stylus. It
works for local development but cannot make a developer laptop available to a
hosted Vercel function. Do not expose Ollama through an unauthenticated tunnel.

## Durable jobs and the Windows worker

Jobs use three execution classes:

- `DATABASE` — short deterministic PostgreSQL work, such as the Core echo test.
- `SERVERLESS` — bounded network/CPU workflows executed through the trusted web
  executor, including External Research.
- `EXTERNAL_WORKER` — machine-specific or heavy work handled by an authenticated
  outbound worker.

Every registered job has a static definition, input/output schemas, timeout,
retry policy, execution class, capability, and concurrency group. PostgreSQL
owns scheduling, atomic claim, lease, progress, retry, cancellation, stale
recovery, and terminal state.

To pair the Windows worker:

1. As OWNER or ADMIN, open `/workers` and generate a one-time pairing code.
2. On the Windows machine, run:

   ```powershell
   npm.cmd run worker:pair
   npm.cmd run worker:status
   npm.cmd run worker:start
   ```

3. Enter the hosted Stylus origin and the one-time code when prompted.

Only a digest of the pairing code and durable worker credential is stored in
PostgreSQL. The worker credential is stored in the current Windows user's local
application-data directory, never in the repository. Revocation immediately
removes broker access; interrupted work returns through lease recovery.

See [Windows Worker](docs/WINDOWS_WORKER.md) and [Jobs](docs/JOBS.md) for setup,
capability, and lifecycle details.

## Marketing intelligence

Stylus deliberately separates evidence gathering, creative generation,
strategic review, advice, and performance analysis.

```text
External Research --> immutable evidence + Research Report
                                      |
Reel Idea --> Creative Studio --> versioned Reel Brief
                                      |
                                      `--> Strategic Review

Existing authorized context -----------> Ask Council answer

Published Content + snapshots ----------> deterministic learnings
```

- External Research cannot silently invoke Creative Studio or Council.
- Council workflows do not launch live research or derive performance data.
- Performance Learning uses deterministic metrics and zero model calls.
- Research and creative artifacts do not automatically write memory.
- Evidence citations use exact current-run identifiers backed by durable
  organization-scoped provenance.
- Unsupported or irrelevant evidence produces a safe partial/failed result
  rather than fabricated findings.

Source retrieval is intentionally bounded. URL validation, public-address DNS
checks, pinned connections, TLS hostname verification, redirect revalidation,
content-type limits, byte/time limits, extraction, relevance checks, and
deterministic deduplication occur before evidence is retained. External content
is always treated as untrusted data, never as application instructions.

## Security model

Stylus uses defense in depth:

- **Authenticated server context** — mutations derive the current actor and
  organization from the session rather than trusting browser identifiers.
- **RBAC** — OWNER, ADMIN, MEMBER, and VIEWER permissions are enforced in server
  code and repeated in database contracts where appropriate.
- **RLS** — organization-owned tables use row-level policies and
  same-organization relationship constraints.
- **Server-only credentials** — provider secrets, the service-role key, Cron
  secret, and worker broker operations stay outside client bundles.
- **Immutable provenance** — AI outputs, research evidence, performance
  snapshots/learnings, and major creative artifacts have append-only or
  immutable database protections.
- **Private collaboration** — board images use private Storage and signed URLs;
  private Realtime topics validate current organization/board access.
- **Narrow worker broker** — human-session redirect bypass applies only to the
  worker API namespace; pairing or durable worker authentication is still
  mandatory, and every response is normalized JSON.
- **Memory isolation** — company, Marketing, and future Agency domains are
  explicit. Prompt text is never relied upon as an authorization control.
- **Bounded external input** — forms, payloads, files, prompts, network
  responses, and model outputs are schema- and size-validated.

Read [Security Requirements](docs/SECURITY.md) before modifying authorization,
RLS, Realtime, Storage, provider, research, or worker boundaries.

## Testing and quality gates

Run the complete repository verification:

```bash
npm run verify
```

The root scripts provide individual gates:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm audit
```

Useful scoped commands:

```bash
npm run test --workspace @stylus/web
npm run test --workspace @stylus/worker
npm run typecheck --workspace @stylus/web
npm run typecheck --workspace @stylus/worker
npm run build --workspace @stylus/web
npm run build --workspace @stylus/worker
```

Database tests require a compatible local Supabase/PostgreSQL environment:

```bash
npm run db:lint
npm run test:db
```

Critical permanent coverage includes organization isolation, RBAC, invitation
security, task lifecycle, reminder idempotency, whiteboard collaboration,
memory-domain separation, plugin boundaries, AI schemas, job claims/recovery,
worker credentials, research provenance, performance immutability, and Council
context selection.

Do not remove, skip, or weaken tests to make a gate pass.

## Deployment

The intended initial hosted topology is:

- Next.js on Vercel or a compatible Node/serverless platform
- Supabase for Auth, PostgreSQL, RLS, Realtime, Storage, and database Cron
- Optional hosted OpenAI-compatible model provider
- Optional Tavily and approved Reddit API integrations
- Optional outbound Windows worker for heavy media processing

The committed Vercel schedule calls `/api/cron/serverless-jobs` daily at
`0 3 * * *`. Normal External Research submissions do not wait for that Cron:
after a successful durable enqueue, a Next.js `after()` callback attempts the
same registered executor path immediately. Daily Cron is recovery/drain
infrastructure and claims at most one eligible serverless job per invocation.

Supabase database Cron is configured separately in the hosted dashboard:

- `select public.process_task_reminders();` every five minutes
- `select public.process_database_jobs(10);` every minute

Vercel Hobby's 60-second function limit constrains hosted research. Stylus uses
bounded retrieval and synthesis budgets below that limit, while the durable job
remains authoritative if a serverless invocation is interrupted.

Before deploying, review [Deployment Strategy](docs/DEPLOYMENT.md), apply only
the inspected pending migrations, configure secrets separately for each target
environment, and complete the relevant hosted manual QA procedures.

## Project documentation

- [Product specification](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database direction](docs/DATABASE.md)
- [Security requirements](docs/SECURITY.md)
- [AI architecture](docs/AI.md)
- [Plugin architecture](docs/PLUGINS.md)
- [Job architecture](docs/JOBS.md)
- [Marketing specification](docs/MARKETING.md)
- [Windows worker](docs/WINDOWS_WORKER.md)
- [Deployment strategy](docs/DEPLOYMENT.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [UI patterns](docs/UI_PATTERNS.md)
- [Architecture decisions](docs/DECISIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [Current project state](PROJECT_STATE.md)
- [Task queue and history](CODEX_TASKS.md)
- [Changelog](CHANGELOG.md)

When documents disagree, the repository implementation, current migrations,
tests, and `PROJECT_STATE.md` should be inspected together rather than relying
on an old task narrative.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) before making
changes. In particular:

1. Inspect the current branch, working tree, implementation, tests, and relevant
   source-of-truth documents.
2. Use a focused task branch for substantial implementation work.
3. Keep Core independent from business plugins.
4. Preserve organization and memory-domain isolation.
5. Add permanent tests for important behavior and security boundaries.
6. Use a new forward-only migration for every schema correction.
7. Run applicable tests, lint, typecheck, formatting, and production builds.
8. Review staged changes for secrets, environment files, generated artifacts,
   and unrelated line-ending noise.
9. Do not push or merge unless the active task explicitly authorizes it.

Use the issue templates for non-security bugs and feature requests. Report
vulnerabilities only through the private process in
[.github/SECURITY.md](.github/SECURITY.md). Support scope is documented in
[SUPPORT.md](SUPPORT.md).

## License and project identity

Stylus source code is licensed under the [Apache License 2.0](LICENSE).
Dependencies remain under their respective licenses. See
[TRADEMARKS.md](TRADEMARKS.md) for use of the Stylus name and project logos, and
[the release guide](docs/OPEN_SOURCE_RELEASE.md) for the public-release audit and
checklist.

## Current limitations

- Invitation delivery is manual link sharing; transactional email is not
  configured.
- Hosted local-only Ollama cannot reach a developer laptop. Use local
  development or a deployment-reachable approved provider.
- Instagram, TikTok, YouTube, and Pinterest evidence transports remain
  deliberately unavailable until official access and retention/deletion
  requirements fit the immutable evidence model.
- Reddit research is disabled unless the exact deployed use case is approved
  and explicitly configured.
- Tavily is optional and used for discovery metadata only; every retained page
  still passes independent fetch, policy, and relevance checks.
- The Windows worker supports only compiled capabilities and requires explicit
  pairing and operator-installed media tools. Heavy work remains queued while
  it is offline.
- Free/serverless availability, Supabase project pausing, provider quotas, and
  Vercel execution limits remain operational constraints.
