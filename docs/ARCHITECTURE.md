# Stylus — Architecture

## Architectural Style

Stylus begins as a modular monolith with external managed infrastructure.

Avoid premature microservices.

---

# Repository Layout

The repository uses npm workspaces:

- `apps/web` contains the Next.js application and its local UI foundation.
- `packages/typescript-config` contains shared strict TypeScript defaults.

Future packages should be added only when code has a real cross-application
or cross-module consumer. Core and plugin business modules have not been
introduced during Phase 0.

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
  |       +-- pgvector
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

---

# Core Modules

Planned Core modules:

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

# Plugin Modules

Initial:

- marketing

Future:

- web-agency
- additional business capabilities

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

---

# AI Boundary

All AI access passes through:

ModelGateway

Logical capabilities:

- fast
- general
- reasoning
- vision
- embedding
- transcription

Providers are implementation details.

---

# Memory Boundary

Memory retrieval requires explicit:

- organization scope
- domain scope
- optional workspace scope

No unrestricted global semantic search is permitted.

---

# Deployment Principle

The initial architecture prioritizes:

- no mandatory VPS
- free-tier infrastructure where practical
- low idle cost
- portability
- future migration without application redesign
