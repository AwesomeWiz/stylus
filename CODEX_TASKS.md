# Stylus — Codex Task Queue

# Current

## TASK-003 — Company Onboarding

Status: READY

Phase: 2

Planned scope:

- company identity
- startup idea
- problem
- product concept
- stage
- audience
- brand profile
- marketing objectives
- initial competitor records

Do not proceed to TASK-004 during TASK-003.

---

# Completed

## TASK-002 — Authentication and Organizations

Status: COMPLETE

Phase: 1

Implemented scope:

- Supabase SSR integration with cookie-based sessions
- signup, email confirmation, login and logout
- protected route redirects and authenticated session detection
- organization and membership schema with role foundation
- atomic initial organization creation with OWNER membership
- validated server-side organization context helpers
- restricted grants and row-level security policies
- application shell account and organization context
- authorization, session, migration-contract and UI tests

Real Supabase flow and pgTAP verification remain documented deployment checks
because local Docker and project credentials were unavailable during TASK-002.

---

## TASK-001 — Repository Foundation

Status: COMPLETE

Phase: 0

### Objective

Create the initial Stylus repository foundation.

Do not implement business functionality.

### Requirements

Establish:

- monorepo structure
- Next.js web application skeleton
- TypeScript
- Tailwind CSS
- shadcn/ui foundation
- Lucide React
- shared package structure
- linting
- formatting
- testing
- environment validation
- .env.example
- design tokens
- application shell foundation
- module boundaries
- placeholder public interfaces only where justified

Create an initial professional application shell containing:

- sidebar
- top navigation area
- main content region
- responsive navigation behavior

The shell should establish the Stylus visual direction without
implementing real business pages.

### UI Requirements

- professional SaaS appearance
- Lucide icons
- no emojis as interface icons
- restrained styling
- neutral surfaces
- accessible contrast
- responsive
- no excessive gradients
- no glassmorphism-heavy design
- no glowing UI
- no unnecessary animations

### Do NOT Implement

- real authentication flows
- task management
- reminders
- notifications
- whiteboard functionality
- marketing functionality
- Reel analysis
- AI agents
- AI model calls
- Web Agency integration

### Acceptance Criteria

- dependencies install successfully
- development server starts
- application shell renders
- lint passes
- typecheck passes
- tests pass
- production build passes
- repository follows documented architecture
- no business functionality has been prematurely implemented
- documentation matches implementation

### Completion Procedure

After verification:

1. Mark TASK-001 COMPLETE.
2. Update PROJECT_STATE.md.
3. Update docs/ROADMAP.md.
4. Move TASK-002 to Current.
5. Record unresolved issues if any.

---

# Planned Queue

## TASK-004 — Task Management

Planned scope:

- create task
- edit task
- assignment
- priority
- status
- due date/time
- comments
- subtasks if approved
- My Tasks
- Team Tasks
- upcoming
- overdue
- completed
- archive
- calendar

---

## TASK-005 — Reminders, Notifications and Activity

Planned scope:

- task reminder infrastructure
- 24-hour reminder
- 1-hour reminder
- deadline notification
- overdue notification
- notification center
- activity feed
- mentions
- idempotent notification creation

---

## TASK-006 — Whiteboard Foundation

Planned scope:

- boards
- infinite/canvas workspace
- pan
- zoom
- text
- sticky notes
- images
- shapes
- arrows
- drag
- resize
- layering

---

## TASK-007 — Whiteboard Collaboration

Planned scope:

- comments
- element comments
- @mentions
- realtime updates
- board activity
- permissions

---

## TASK-008 — Plugin Framework

Planned scope:

- plugin manifest
- registry
- capability registration
- permissions
- navigation contributions
- event handlers
- plugin isolation
- example test plugin

---

## TASK-009 — AI Foundation

Planned scope:

- ModelGateway
- ModelProvider
- logical model profiles
- agent interface
- tool interface
- workflow interface
- fake provider for testing
- provider abstraction

No real marketing agents yet.

---

## TASK-010 — Company Knowledge and Memory

Planned scope:

- company knowledge
- explicit knowledge promotion
- embeddings
- retrieval
- domain isolation
- pgvector
- marketing/agency isolation tests

---

## TASK-011 — Heavy Job Infrastructure

Planned scope:

- persisted jobs
- worker claims
- progress
- retries
- heartbeat
- stale job recovery
- failure handling

---

## TASK-012 — Windows Worker

Planned scope:

- worker authentication
- job claiming
- Ollama detection
- FFmpeg detection
- transcription dependency detection
- heartbeat
- result upload
- dummy end-to-end heavy job

---

## TASK-013 — Marketing Plugin Foundation

Planned scope:

- Marketing plugin
- navigation
- competitors
- Reels
- campaigns
- research
- creative briefs

No full agent council yet.

---

## TASK-014 — Competitor Reel Analysis

Planned scope:

- manual Reel/video ingestion
- media job
- audio extraction
- transcription
- scene detection
- representative frames
- OCR where appropriate
- structured creative analysis

---

## TASK-015 — Creative Council V1

Initial agents:

- Hook Strategist
- Script Writer
- Creative Critic

---

## TASK-016 — Creative Council Expansion

Add:

- Audience Researcher
- Trend Researcher
- Competitor Analyst
- Content Strategist
- Retention Editor
- Visual Director
- Brand Director
- Creative Judge

---

## TASK-017 — Marketing Research

Planned scope:

- source adapter interface
- permitted web sources
- Reddit-compatible source strategy
- Hacker News
- RSS
- web research
- normalization
- deduplication
- clustering
- evidence storage

---

## TASK-018 — Marketing Performance Learning

Planned scope:

- published Reel records
- performance snapshots
- experiments
- learnings
- feedback into future Creative Council workflows

---

## TASK-019 — Web Agency Integration

Future only.

Integrate the separate AI Web Agency through Stylus plugin interfaces.

Agency memory must remain isolated.
