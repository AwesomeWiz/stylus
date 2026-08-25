# Stylus — Codex Engineering Instructions

## Product

Stylus is a collaborative, AI-enabled startup operating system.

It gives startup teams a shared environment for:

- team collaboration
- tasks and deadlines
- reminders and notifications
- whiteboards and moodboards
- company knowledge
- decisions and activity
- AI agents and workflows
- modular business features through plugins

The first major business plugin is Marketing.

The initial Marketing system focuses on pre-product startup marketing
through Instagram Reels.

A separate AI Web Agency application may later be integrated with Stylus
through the plugin architecture.

The Web Agency is NOT part of the startup's marketing/company domain and
its operational memory must remain isolated.

---

# Source of Truth

The repository is the source of truth.

Do not depend on previous Codex conversations or chat history.

Before beginning work, inspect the repository and read the required
project documentation.

Never assume that a previous task succeeded simply because documentation
claims that it did. Inspect implementation and verification state where
necessary.

---

# Mandatory Session Start Protocol

Before modifying code:

1. Read AGENTS.md.
2. Read PROJECT_STATE.md.
3. Read CODEX_TASKS.md.
4. Read docs/ROADMAP.md.
5. Read docs/DECISIONS.md.
6. Read documentation relevant to the current feature.
7. Inspect the existing implementation.
8. Inspect relevant tests.
9. Check git status and preserve unrelated user changes.
10. Determine the current task and its acceptance criteria.
11. Form an implementation plan consistent with the existing architecture.

Do not redo completed work.

Do not start future roadmap tasks unless explicitly requested.

---

# Mandatory Session End Protocol

Before declaring a task complete:

1. Run relevant tests.
2. Run lint.
3. Run type checking.
4. Run the production build when applicable.
5. Review the diff for unintended changes.
6. Verify authorization/security implications.
7. Verify that acceptance criteria are satisfied.
8. Update PROJECT_STATE.md.
9. Update CODEX_TASKS.md.
10. Update docs/ROADMAP.md if milestone state changed.
11. Update architecture/database documentation if implementation changed it.
12. Record important architectural decisions in docs/DECISIONS.md.
13. Record unresolved issues in PROJECT_STATE.md.
14. Never mark work complete when required verification is failing.

---

# Architecture

Stylus begins as a modular monolith.

Do NOT introduce microservices unless there is a demonstrated technical
need.

Core infrastructure must not depend on business plugins.

Plugins may depend only on documented public core interfaces.

Shared collaboration functionality belongs in Core.

Business-specific functionality belongs in plugins.

---

# Core Stylus Domains

Core functionality includes:

- authentication
- organizations
- team membership
- roles and permissions
- tasks
- reminders
- notifications
- activity
- comments
- whiteboards
- company knowledge
- events
- plugin infrastructure
- AI infrastructure
- job infrastructure

Marketing is a plugin.

Web Agency is a future external plugin/integration.

---

# Organization Isolation — Critical

Data belonging to one organization must never be accessible by another
organization.

Authorization must be enforced server-side and, where appropriate,
through Supabase Row Level Security.

Never trust organization IDs supplied by frontend clients without
validating membership and permissions.

Organization isolation requires permanent automated tests.

---

# AI Memory Isolation — Critical

Every AI-accessible memory record must be scoped.

Memory records must contain:

- organization_id
- workspace_id where applicable
- domain_id

Initial domains:

- company
- marketing
- agency

Marketing agents may access:

- company
- marketing

Agency agents may access:

- agency

Marketing agents must NEVER retrieve agency memory.

Agency memory must NOT automatically retrieve company or marketing
memory.

Any future cross-domain access must be explicit, permission-controlled
and auditable.

These restrictions must be enforced in application/database code.

Prompt instructions are NOT a security mechanism.

Permanent tests must verify memory-domain isolation.

---

# Working Data Is Not Permanent Company Knowledge

Do not automatically promote:

- tasks
- comments
- whiteboard notes
- brainstorming
- uploads
- AI drafts
- Reel drafts
- temporary research

into permanent Company Knowledge.

Working information should become permanent AI/company knowledge only
through an explicit promotion/approval action such as:

"Add to Company Knowledge"

---

# AI Architecture

Application modules must NEVER communicate directly with:

- Ollama
- OpenAI
- OpenRouter
- Cloudflare Workers AI
- another AI provider

All model access must go through Stylus ModelGateway.

Application modules request logical capabilities such as:

- fast
- general
- reasoning
- vision
- embedding
- transcription

Provider and model selection belong to AI infrastructure/configuration.

Agents are logical roles.

Multiple agents may use the same underlying model.

---

# Agent Architecture

Every agent must define:

- identity
- purpose
- instructions
- allowed tools
- allowed memory domains
- model profile
- input schema
- output schema

Prefer bounded workflows over unlimited agent conversations.

Every workflow must have explicit:

- stages
- inputs
- outputs
- retry rules
- stopping conditions

Reasoning sessions must be auditable.

---

# Heavy Compute Architecture

The Stylus production web application must remain usable while the
developer's Windows laptop is offline.

The Windows laptop may operate as an OPTIONAL heavy compute worker.

Heavy tasks may include:

- video processing
- audio extraction
- transcription
- computer vision
- local multimodal inference
- local reasoning inference

When the worker is unavailable, heavy jobs remain queued.

The worker must initiate outbound connections.

Never expose local Ollama directly to the public internet.

---

# Job Architecture

Long-running work must use persisted jobs.

Jobs must support:

- status
- progress
- priority
- retry count
- failure information
- worker claim
- worker heartbeat where applicable
- stale claim recovery
- cancellation where appropriate

Do not keep browser/API requests open waiting for long-running Reel
analysis.

---

# Database Rules

All schema changes must use migrations.

Never rewrite an already-applied migration.

Never silently perform destructive schema changes.

Prefer archival/soft deletion where business history matters.

Database constraints should protect important invariants whenever
possible.

---

# UI / UX

Stylus must look like a professional modern SaaS productivity system.

Use Lucide icons consistently throughout the application.

Do NOT use emojis as interface icons.

Avoid stereotypical AI-generated UI including:

- excessive gradients
- glassmorphism everywhere
- glowing elements
- excessive rounded cards
- giant dashboard headings
- random colors
- excessive shadows
- decorative badges everywhere
- unnecessary animations
- every section being placed inside a card

Prefer:

- restrained hierarchy
- neutral application surfaces
- clear typography
- subtle borders
- consistent spacing
- one primary accent
- semantic status colors
- accessible contrast
- responsive layouts
- efficient information density

Reuse design-system components.

Do not independently invent styling for every page.

---

# Code Quality

Prefer:

- strict typing
- focused modules
- reusable public interfaces
- schema validation
- predictable naming
- testable business logic
- explicit error handling

Avoid:

- giant components
- giant service classes
- duplicated business logic
- hidden global state
- unnecessary abstraction
- premature optimization
- speculative infrastructure

---

# Testing

Important behavior requires automated tests.

Permanent critical test categories include:

- organization isolation
- authorization
- marketing/agency memory isolation
- plugin boundaries
- task lifecycle
- reminder idempotency
- completed-task archival
- comment permissions
- worker claim/recovery
- AI workflow schemas

Never remove, skip or weaken tests merely to make a build pass.

---

# Scope Discipline

Implement only the current approved task unless a prerequisite is
strictly necessary.

Do not opportunistically implement later roadmap features.

If unrelated technical debt is discovered, document it rather than
silently expanding scope.

---

# Git Workflow

The `main` branch represents the latest verified stable version of Stylus.

Do not perform substantial feature development directly on `main`.

For each CODEX_TASKS.md implementation task, use a dedicated branch.

Branch naming:

codex/task-<number>-<short-name>

Examples:

codex/task-001-foundation
codex/task-002-auth
codex/task-004-tasks

Before implementation:

1. Check git status.
2. Identify the current branch.
3. Preserve unrelated user changes.
4. Ensure the task branch is based on the latest intended `main`.

During implementation:

- Make focused changes related to the current task.
- Do not rewrite unrelated history.
- Do not force push.
- Do not delete branches without explicit instruction.
- Do not commit secrets or local environment files.

Before considering a task ready for merge:

1. Run lint.
2. Run typecheck.
3. Run tests.
4. Run the production build where applicable.
5. Review the diff.
6. Update PROJECT_STATE.md.
7. Update CODEX_TASKS.md.
8. Update docs/ROADMAP.md where appropriate.

A task may only be considered merge-ready when its required verification
passes.

Do not automatically merge into `main` unless explicitly instructed.

Do not automatically push to a remote unless the current task explicitly
authorizes it.
