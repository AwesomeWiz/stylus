# Stylus — Project State

Last Updated: 2026-08-25

## Overall Status

TASK-004 TASK MANAGEMENT / READY FOR MANUAL QA AGAIN

The verified authentication, organization and company-onboarding foundation now
includes lightweight collaborative task management. The implementation is ready
for authenticated role, responsive and migration QA before merge.

---

## Current Phase

Phase 3 — Tasks

Status: READY FOR MANUAL QA AGAIN

---

## Current Objective

TASK-004 includes the resolved overdue-deadline manual-QA defect on
`codex/task-004-task-management` and is ready for manual QA again. TASK-005 is
documented as next but has not started.

---

# Phase 0 Implementation

- npm workspace structure with `apps/web` and shared TypeScript config
- Next.js App Router application with strict TypeScript
- Tailwind CSS design tokens with light and dark theme variables
- shadcn/ui-compatible component conventions and aliases
- Lucide icon system
- responsive desktop sidebar and accessible mobile navigation drawer
- topbar with global search, notifications and account placeholders
- placeholder Home page with no business functionality
- Zod-backed environment validation and `.env.example`
- ESLint, Prettier and Vitest configuration
- focused navigation and Home placeholder tests

---

# Phase 0 Verification

Verified on 2026-08-25:

- `npm install`: passed; 0 audit vulnerabilities
- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 3 files and 4 tests
- `npm run build`: passed; `/` prerendered as static content
- development server: started successfully; `/` returned HTTP 200

---

# Phase 1 Implementation

- browser-safe and server-only Supabase clients using `@supabase/ssr`
- Next.js Proxy session refresh using verified Supabase claims
- signup, email-confirmation, login and logout flows
- protected application and organization-setup routes
- server-side identity and organization-membership helpers
- organization setup boundary before entering the Stylus shell
- shell account identity, organization name, role and logout menu
- Zod validation for required public environment configuration and forms
- generic authentication errors that do not expose credentials or account state

---

# Phase 1 Database

Migration: `supabase/migrations/20260825000100_auth_organizations.sql`

Introduced:

- `public.organization_role`: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`
- `public.organizations`
- `public.memberships` with `(organization_id, user_id)` primary key
- private membership/role authorization functions with pinned search paths
- atomic `public.create_organization(text)` RPC
- restricted table/function grants
- RLS policies for organization reads, organization updates and membership reads
- pgTAP policy suite at `supabase/tests/database/organizations_rls.test.sql`

---

# Phase 1 Verification

Verified on 2026-08-25 with browser-safe test configuration:

- dependency installation: passed; 0 audit vulnerabilities
- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 10 files and 27 tests
- `npm run build`: passed; 7 application routes plus Proxy compiled
- development server: passed
- `/login` and `/signup`: HTTP 200 with expected labeled forms
- `/` and `/organization/new` while unauthenticated: HTTP 307 to `/login`
- browser bundle scan: no service-role environment names or secret-key prefixes
- source scan: no credential/token logging or service-role client

---

# Phase 2 Implementation

- focused eight-step onboarding: Company; Problem & Idea; Product; Audience;
  Positioning & Brand; Marketing; Competitors; Review & Finish
- per-step validation, field errors, pending states, Back and Save/Continue
- bounded add/remove list controls and zero-or-more competitor editor
- durable server-side progress saved between steps
- completion timestamp and workspace routing that does not repeat onboarding
- Company Profile review/edit page after completion
- pre-product-friendly optional website, social, brand and competitor fields
- no AI provider, memory, embedding, RAG, scraping or Marketing plugin code

---

# Phase 2 Database and Security

Migration: `supabase/migrations/20260825000200_company_onboarding.sql`

Introduced:

- controlled company, product, brand, marketing and competitor enums
- `company_profiles`
- `audience_profiles`
- `brand_profiles`
- `marketing_profiles`
- `competitors` with archival removal
- `onboarding_progress`
- member read policies and OWNER/ADMIN insert/update policies on every table
- immutable organization ownership, creator/starter provenance and authenticated
  updater enforcement
- pgTAP policy suite at
  `supabase/tests/database/company_onboarding_rls.test.sql`

Server Actions independently derive the current organization from the validated
membership context and map accepted fields explicitly. MEMBER and VIEWER roles
cannot mutate onboarding data.

---

# Phase 2 Verification

Verified on 2026-08-25:

- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 16 files and 49 tests
- `npm run build`: passed; onboarding and Company Profile routes compiled
- linked `supabase db push --dry-run --skip-vault`: passed; exactly the new Phase
  2 migration is pending and no remote changes were made
- unauthenticated `/onboarding/company` and `/company/profile`: HTTP 307 to
  `/login`
- source security scan: no service-role use, secret logging, AI calls or memory
  implementation

## Manual-QA Navigation Fix

Resolved on 2026-08-25:

- removed broad root-layout revalidation before onboarding redirects
- replaced the separate progress read/upsert with
  `advance_onboarding_progress(uuid, smallint)` on the same authenticated client
- progress advancement now targets the absolute completed step, making duplicate
  requests idempotent rather than incrementing twice
- regression coverage verifies first-submit persistence/redirect, validation and
  persistence failures, duplicate requests, disabled pending submission and
  refresh/login recovery
- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 18 files and 59 tests
- `npm run build`: passed
- linked migration dry run: passed; only
  `20260825000300_fix_onboarding_progress_advance.sql` is pending

---

# Phase 3 Implementation

- protected `/tasks` workspace integrated with the responsive Stylus shell
- fast create/edit dialog with title, description, one optional assignee,
  priority, status, scheduled time and due time
- compact task rows with accessible completion/reopen controls and overdue state
- My Tasks, All Tasks, Upcoming, Overdue, Completed, Archive and Calendar views
- composing title, assignee, status and priority filters
- deterministic actionable ordering and UTC date handling
- 14-day recent-completion window with older history retained in Archive
- lightweight task comments for working collaboration context
- view-specific empty states plus loading, error and pending states
- no reminder delivery, notifications, workers, AI or later-task infrastructure

---

# Phase 3 Database and Security

Migration: `supabase/migrations/20260825000400_task_management.sql`

Introduced:

- `task_status` and `task_priority` enums
- `tasks` with one nullable same-organization assignee
- `task_comments`
- organization/status, assignee, due and completion-history indexes
- composite organization/member and organization/task foreign keys
- database-managed, idempotent `completed_at` lifecycle
- immutable organization/creator provenance and authenticated updater enforcement
- column-level grants that exclude IDs, ownership and managed timestamps
- organization member reads; OWNER/ADMIN/MEMBER writes; VIEWER read-only RLS
- authenticated `list_organization_task_members(uuid)` directory RPC exposing
  only member IDs, display names and roles
- 19-assertion pgTAP suite at
  `supabase/tests/database/task_management_rls.test.sql`

---

# Phase 3 Verification

Verified on 2026-08-25:

- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 25 files and 92 tests
- `npm run build`: passed; protected `/tasks` route compiled
- linked `supabase db push --dry-run --skip-vault`: passed; exactly
  `20260825000400_task_management.sql` is pending and no remote change was made
- migration/security contract coverage verifies RLS roles, organization isolation,
  same-organization assignment, restricted grants and lifecycle invariants
- component coverage verifies compact task display, collaborator dialogs,
  VIEWER read-only behavior and view-specific empty states

## Manual-QA Overdue Deadline Fix

Resolved on 2026-08-25:

- local date/time inputs now convert through the browser timezone to UTC
  instants before persistence, and stored instants display in local time
- overdue uses the inclusive `due_at <= now` boundary for active tasks only
- the open workspace schedules one refresh at the nearest future active
  deadline, with timer cleanup and no polling when no deadline can change state
- deterministic coverage verifies timezone conversion, active/inactive status
  behavior, the deadline boundary, refresh-time filtering and the existing
  14-day completion split
- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 26 files and 97 tests
- `npm run build`: passed; protected `/tasks` route compiled

---

# Manual Verification Still Required

The current machine does not have Docker or an available in-app browser surface.
The linked Supabase project was available for a non-mutating migration dry run.
Before merge/deployment:

1. Run `npm run db:start`, `npm run db:reset`, `npm run db:lint` and
   `npm run test:db` in a Docker-enabled environment.
2. Apply `20260825000400_task_management.sql` with
   `npm exec supabase -- db push --linked --skip-vault` after review.
3. Run authenticated OWNER, ADMIN, MEMBER and VIEWER task/RLS checks using
   separate organizations, including rejected cross-organization assignment.
4. Configure the Site URL, allowed redirect URL and confirmation email template
   to use `/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
5. Manually verify signup, confirmation, login, session refresh, organization
   creation, cross-user isolation and logout with real accounts.
6. Perform Tasks visual QA at desktop, tablet and narrow mobile widths, including
   create/edit, filters, completion/reopen, comments and long-content wrapping.

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

TASK-004 task management is ready for manual QA again on
`codex/task-004-task-management`. TASK-005 has not started.

---

# Known Issues

No known unresolved TASK-004 implementation defect after the overdue-deadline
manual-QA fix and automated suite.

Docker is unavailable, so the new pgTAP suite has not run locally. The in-app
browser runtime reported no available browser surface, so authenticated visual,
responsive and interaction QA remains required. The linked migration dry run
passed without changing the hosted database.

---

# Next Recommended Action

Review and apply `20260825000400_task_management.sql`, execute pgTAP in a
Docker-enabled environment, and run TASK-004 manual QA with separate OWNER,
ADMIN, MEMBER and VIEWER accounts. Do not begin TASK-005 during QA.

---

# Next Session Handoff

Read:

1. AGENTS.md
2. PROJECT_STATE.md
3. CODEX_TASKS.md
4. docs/ROADMAP.md
5. docs/DECISIONS.md

TASK-004 is complete and ready for manual QA on
`codex/task-004-task-management`.

Apply the pending task migration and verify task creation, editing, assignment,
filters, completion/reopen, comments, the 14-day Completed/Archive boundary,
cross-organization isolation and VIEWER read-only behavior. TASK-005 is the exact
next documented task; do not begin it until TASK-004 is accepted and merged.
