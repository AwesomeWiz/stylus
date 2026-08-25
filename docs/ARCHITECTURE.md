# Stylus — Architecture

## Architectural Style

Stylus begins as a modular monolith with external managed infrastructure.

Avoid premature microservices.

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