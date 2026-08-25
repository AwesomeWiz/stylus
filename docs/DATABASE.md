# Stylus — Database Direction

This document defines the initial conceptual data model.

Exact schemas are introduced through migrations during implementation.

---

# Identity

users
organizations
memberships
roles
permissions

---

# Tasks

tasks
task_assignees if multiple assignees are supported
task_comments
task_reminders

Tasks support:

- status
- priority
- due_at
- completed_at
- archived_at

Completed tasks should not be hard-deleted automatically.

---

# Notifications

notifications

Possible fields:

- organization_id
- user_id
- type
- title
- body
- entity_type
- entity_id
- read_at
- created_at

---

# Activity

activity_events

Used for auditable team activity.

---

# Whiteboards

boards
board_elements
board_comments
board_members where needed

Board elements contain:

- type
- x
- y
- width
- height
- rotation
- z-index
- content
- style
- metadata

---

# Company Knowledge

company_profiles
audience_profiles
brand_profiles
company_knowledge
decisions
experiments

Exact decomposition may evolve during implementation.

---

# AI Memory

ai_memories

Required scoping:

- organization_id
- workspace_id where applicable
- domain_id

Additional conceptual fields:

- memory_type
- content
- embedding
- metadata
- source_type
- source_id
- created_by
- created_at

---

# AI Runs

reasoning_sessions
reasoning_steps

Record enough information to understand:

- workflow
- participating agents
- models
- inputs
- outputs
- timing
- status

Do not expose hidden model chain-of-thought.

Store explicit agent outputs, decisions and rationale designed for the
application.

---

# Jobs

jobs

Conceptual fields:

- organization_id
- domain_id
- type
- payload
- status
- priority
- claimed_by
- claimed_at
- heartbeat_at
- progress
- retry_count
- max_retries
- result
- error
- created_at
- completed_at

---

# Marketing

competitors
social_accounts
reels
reel_transcripts
reel_scenes
reel_analysis
campaigns
creative_briefs
content_performance
research_items
research_clusters

Exact tables should be introduced incrementally.

---

# Isolation

All organization-owned data must contain or inherit an enforceable
organization boundary.

AI memory additionally requires domain isolation.

Use RLS where appropriate.