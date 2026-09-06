# Stylus — Product Specification

## Vision

Stylus is an operating system for startup teams.

It provides one collaborative environment where a team can organize work,
maintain company knowledge, collaborate visually and use specialized AI
systems to support startup operations.

Stylus is not intended to be a single autonomous AI that runs a company.

It is a human-controlled operating environment containing specialized,
auditable AI capabilities.

---

# Initial Users

Stylus initially targets a small startup team.

Users may include:

- founder
- co-founders
- developers
- marketers
- designers
- content creators
- other collaborators

---

# Core Product Areas

## Team

Owners and administrators can invite teammates as MEMBER or VIEWER, share a
secure expiring link, revoke or regenerate pending invitations, change non-owner
roles and remove non-owner access. Acceptance joins the authenticated email to
the organization used by tasks, mentions, whiteboards and Presence.

Initial delivery is manual link sharing. Stylus does not claim invitation email
delivery until a transactional-email provider is configured.

## Home

Provides a concise operational overview:

- tasks due today
- upcoming deadlines
- overdue work
- notifications
- team activity
- marketing work requiring attention
- recent AI results

---

## Tasks

Team task management.

Users can:

- create tasks
- assign tasks
- set dates and times
- set priorities
- change status
- comment
- view personal tasks
- view team tasks
- view upcoming work
- view overdue work
- view completed work
- view archived work
- use calendar views

Completed tasks remain in the normal completed view for approximately
14 days.

After that they move to Archive.

They are not automatically deleted.

The initial task system uses one clear assignee, or no assignee, and separates a
scheduled start from a due deadline. My Tasks focuses on active assignments;
team, upcoming, overdue, recent completion, archive and compact calendar views
share one filterable workspace. OWNER, ADMIN and MEMBER collaborate normally,
while VIEWER is read-only. Lightweight comments hold working context and are not
automatically promoted to Company Knowledge.

---

## Notifications

Stylus provides a central notification system.

Initial notifications include:

- task assigned
- deadline approaching
- task overdue
- user mentioned
- board comment
- AI workflow complete
- Reel analysis complete
- content requiring approval

Future delivery adapters may include:

- email
- browser push
- WhatsApp
- Slack
- other integrations

The initial notification center is in-app only. Assigned active tasks receive
idempotent reminders approximately 24 hours before, one hour before and at the
deadline. Notifications are private to their recipient, while the separate
Activity page shows organization-visible task and comment history.

---

## Whiteboards

Collaborative visual workspaces for:

- moodboards
- brainstorming
- product thinking
- brand references
- Reel storyboards
- visual planning

Initial elements:

- text
- sticky notes
- images
- shapes
- arrows
- controlled rectangle/ellipse shapes

The first whiteboard foundation uses a large pan/zoom canvas and persists each
element independently. Creation saves immediately; movement and resize save at
interaction end; text/sticky edits save on commit. Board images are private and
served through short-lived signed URLs. OWNER, ADMIN and MEMBER edit while
VIEWER is read-only.

Board and element comments, structural mentions, private Realtime collaboration,
presence, and ephemeral cursors are implemented as later layers over that
foundation.

Whiteboard content does not automatically become permanent Company
Knowledge.

---

## Company Knowledge

Structured information describing the startup.

Initial categories:

- company identity
- startup idea
- problem
- product
- mission
- vision
- audience
- positioning
- brand
- marketing objectives
- research
- decisions
- experiments

Company Knowledge provides controlled context for AI agents.

Initial company onboarding establishes the authoritative structured source for
company identity, problem, product concept, primary audience, positioning,
brand direction, marketing objectives and known competitors. Founders can save
between steps, resume later and update the profile after completion. Optional
fields support pre-product companies without websites, customers, revenue or a
finished brand.

Company Memory is distinct from Company Knowledge. It contains only explicitly
approved durable facts, decisions, insights, preferences and notes with source
and creator provenance. OWNER, ADMIN and MEMBER may manage ordinary company
memory; VIEWER is read-only. Working tasks, comments, boards, uploads and AI
drafts are never promoted automatically.

The Memory workspace searches and filters active or archived company-domain
memory. Structured Company Knowledge is composed live from Company Profile, so
profile edits are immediately reflected without duplicate synchronization.
Initial retrieval is deterministic and bounded; semantic search, embeddings,
document ingestion and web research are not part of this phase.

---

# Apps and Business Plugins

Stylus organizations have an internal Apps page listing trusted business modules
compiled with the application. OWNER and ADMIN may enable or disable a registered
module; MEMBER and VIEWER may inspect state but cannot change it.

Enabled plugins may contribute validated navigation and capabilities. Disabled
plugins disappear from normal navigation and their guarded routes reject direct
access, while their persistent state, data and historical activity remain intact.
This is module management, not a marketplace, remote-code loader or credential
store.

---

# AI Platform

Stylus provides organization-controlled AI execution through one server-side
ModelGateway. Business plugins request logical tiers rather than vendor models,
and cannot access provider clients or credentials directly.

OWNER and ADMIN manage whether AI is disabled, local-only or remote-allowed,
choose a default logical tier and optionally set a monthly estimated remote-cost
ceiling. MEMBER can use future explicitly authorized Core/plugin AI operations;
VIEWER is read-only and cannot execute AI. All members may inspect safe run
metadata for their organization.

Run diagnostics include status, selected model/provider, timing, token usage,
estimated cost and normalized errors. Complete prompts and model responses are
not persisted or displayed. AI being disabled or a provider being offline does
not make Core collaboration unavailable.

TASK-009 established the execution infrastructure. Later bounded Marketing
workflows and explicit memory retrieval use that boundary; embeddings and
autonomous tool loops remain unimplemented.

---

## Background Jobs

Stylus provides an organization-scoped durable queue for work that should not
hold a browser request open. Members can inspect safe lifecycle metadata on
`/jobs`; OWNER, ADMIN and MEMBER may enqueue registered ordinary work, VIEWER is
read-only, and cancellation/retry follow explicit role and ownership rules.

Job types come only from trusted static Core/plugin definitions with schemas,
timeouts, retry policy and an execution class. The harmless Core test can run
through hosted Supabase Cron, bounded External Research uses the SERVERLESS
executor, and competitor-Reel extraction can use an authenticated compatible
worker. Unsupported heavy work remains queued; the product does not depend on
the developer laptop being online.

Job rows do not expose raw inputs or sensitive results in the normal UI, do not
replace AI run traces, and never automatically create Company Memory.

Owners and administrators can pair and revoke optional Windows workers from the
Workers workspace. External diagnostics wait safely while workers are offline;
the laptop never becomes the production server and receives no Supabase
service-role credential.

---

# Marketing

Marketing is the first major Stylus plugin.

TASK-013 establishes its manual operating foundation: Overview, Competitors,
Reel Ideas, Campaigns, Research, and Creative Briefs. These are collaborative
planning records, not claims of automated collection or AI-generated strategy.
TASK-015 adds Creative Studio's bounded three-stage Create workflow, safe
structured Reasoning History, and versioned Reel Briefs. TASK-020 adds the
separate bounded Ask Council advisory product.

Initial focus:

Pre-product Instagram Reel marketing.

Primary objectives:

- public recognition
- trust
- authority
- audience building
- community awareness
- future product demand

The system is not initially optimized for paid advertising or ROAS.

---

# Marketing Creative Intelligence

Stylus helps the team reason about:

- Reel topics
- audience relevance
- hooks
- scripts
- storytelling
- pacing
- retention
- shot choices
- B-roll
- typography
- captions
- visual hierarchy
- colors
- branding
- tone
- CTA
- originality

AI recommendations must be grounded where possible in:

- company knowledge
- brand knowledge
- audience research
- competitor research
- previous marketing decisions
- historical content performance

---

# Competitor Intelligence

Stylus can maintain competitor profiles and analyze permitted competitor
Reel content.

Analysis may include:

- hook type
- spoken hook
- on-screen hook
- narrative structure
- transcript
- pacing
- scene changes
- visual style
- camera style
- B-roll
- typography
- caption placement
- colors
- recurring brand motifs
- tone
- CTA
- positioning
- observable performance information

Competitor intelligence informs strategy.

Stylus should not simply copy competitor creative work.

---

# Creative Council

Marketing uses multiple specialized logical agents.

Council roles include:

- Audience Researcher
- Trend Researcher
- Competitor Analyst
- Content Strategist
- Hook Strategist
- Script Writer
- Retention Editor
- Visual Director
- Brand Director
- Creative Critic
- Creative Judge
- Challenge Reviewer

Agents participate in bounded workflows.

TASK-016 adds Strategic Review as a second Create workflow over an exact
immutable Reel Brief version. Audience Researcher, Brand Director, Content
Strategist, Challenge Reviewer and Creative Judge produce one immutable
Strategic Council Review in five calls maximum. It is an auditable review
artifact, not an internal chat transcript and not a rewrite of the source Reel
Brief. The other TASK-016 specialists are reusable static contracts for later
finite workflows but do not execute in Strategic Review V1.

Creative Studio and Ask Council provide two distinct interaction modes:

- **Create** turns a structured source into a bounded, auditable Marketing
  artifact. TASK-015 establishes the first version with a Reel Idea and
  versioned Reel Brief.
- **Ask Council** lets authorized teammates ask Marketing advisory
  questions. A bounded router selects the smallest appropriate approved
  specialist workflow and returns one synthesized answer.

Ask Council is implemented as a bounded advisor, not a generic chatbot. It does
not invoke every agent by default, dynamically spawn arbitrary agents,
show fake internal-agent conversations, use unrestricted tools or research, or
expose raw chain-of-thought. Context and costs remain bounded, organization and
plugin authorization remain server-enforced, and model execution remains behind
ModelGateway.

---

# Reel Brief

A successful creative workflow produces a production-ready Reel Brief.

It may contain:

- objective
- target viewer
- audience insight
- concept
- hook
- script
- timeline
- shot list
- B-roll
- on-screen text
- transitions
- typography
- color direction
- caption style
- music/audio direction
- CTA
- Instagram caption
- keyword/hashtag guidance
- brand rationale
- evidence
- risks
- critic feedback

---

# AI Web Agency

The AI Web Agency is a separate business system.

It is not conceptually part of the startup's product/marketing knowledge.

Stylus may integrate it later through a plugin.

Agency data and memory remain isolated by default.

---

# Product Principle

Stylus should remain useful even when AI functionality is unavailable.

Core collaboration functionality must not depend on AI services.

## Competitor Reel Analysis V1

Marketing collaborators may attach a permitted MP4 to an existing Marketing
competitor and review deterministic media metrics, a local transcript, and a
versioned strategic interpretation. Files are limited to 100 MiB and analysis
to 180 seconds. Optional Instagram/source URLs are metadata only: Stylus does
not download, scrape, authenticate to, or automate Instagram.

V1 supports transcript-derived hooks, script structure, content angle, CTA,
pacing, reusable patterns, and deterministic resolution/frame-rate/cut metrics.
It does not provide OCR or semantic visual/branding understanding and does not
promote results to Company Memory. Creative generation belongs to TASK-015.
