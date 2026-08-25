# Stylus — Project State

Last Updated: 2026-08-25

## Overall Status

PLANNING / BOOTSTRAP

Application implementation has not started.

---

## Current Phase

Phase 0 — Repository Foundation

Status: NOT STARTED

---

## Current Objective

Establish the Stylus repository, documentation, engineering rules,
development tooling, architectural boundaries and application skeleton.

Phase 0 must NOT implement business functionality.

---

# Product Direction

Stylus is a collaborative startup operating system.

Initial major capabilities:

- team accounts
- organizations
- tasks
- deadlines and reminders
- comments
- notifications
- activity
- whiteboards/moodboards
- company knowledge
- plugin infrastructure
- AI infrastructure

The first major business plugin will be Marketing.

Marketing initially focuses on pre-product Instagram Reel strategy and
creative intelligence.

---

# Completed Planning

The following decisions have been made:

- Stylus will use a modular architecture.
- Core collaboration features are separate from business plugins.
- Marketing is the first business plugin.
- Marketing initially focuses on Instagram Reels.
- Marketing uses multi-agent creative reasoning.
- Competitor Reel analysis is required.
- Reel analysis includes hooks, scripts, visuals, branding and pacing.
- Company and Marketing memory are isolated from Web Agency memory.
- Working content is not automatically permanent AI memory.
- Team task management is required.
- Task reminders are required.
- Completed tasks remain visible for approximately 14 days before being
  moved to an archive.
- Archived tasks are not automatically deleted.
- Collaborative whiteboards/moodboards are required.
- Whiteboards support images, text, sticky notes and comments.
- Stylus must use a professional SaaS UI.
- UI icons use Lucide rather than emojis.
- Initial hosting should avoid mandatory VPS costs.
- The production application must not depend on the developer laptop.
- The Windows laptop may act as an optional heavy AI/media worker.
- Codex sessions use repository documentation for continuity.

---

# Current Technology Direction

Frontend:
- Next.js
- TypeScript

UI:
- Tailwind CSS
- shadcn/ui
- Lucide React

Authentication:
- Supabase Auth

Database:
- Supabase PostgreSQL

Realtime:
- Supabase Realtime where useful

Vector search:
- pgvector

File storage:
- Supabase Storage initially

Queue/cache:
- Upstash and/or persisted PostgreSQL job infrastructure depending on
  workload

Local AI:
- Ollama

Heavy worker:
- Python
- Windows-compatible

Media:
- FFmpeg
- OpenCV

Transcription:
- faster-whisper or equivalent local implementation

---

# Hosting Constraint

Initial production infrastructure should have no mandatory paid VPS.

The developer's laptop is NOT a production application server.

Stylus must remain available to teammates while the laptop is powered
off.

Heavy jobs may remain queued until an eligible worker becomes available.

---

# Current Work

Documentation bootstrap.

---

# Known Issues

None.

Implementation has not started.

---

# Next Recommended Action

Execute TASK-001 from CODEX_TASKS.md.

---

# Next Session Handoff

Read:

1. AGENTS.md
2. PROJECT_STATE.md
3. CODEX_TASKS.md
4. docs/ROADMAP.md
5. docs/DECISIONS.md

Continue the current task only.

Do not begin business functionality until Phase 0 has been successfully
verified.