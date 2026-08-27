# Stylus Marketing — Product & AI Specification

## TASK-013 Manual Foundation

The current implementation is intentionally manual and organization-scoped:

- Overview
- Competitors
- Reel Ideas
- Campaigns
- Research notes
- Creative Briefs

OWNER, ADMIN, and MEMBER can create, edit, archive, and restore records. VIEWER
is read-only. Disabling Marketing removes navigation and blocks direct access;
records return unchanged when it is re-enabled. No page scrapes or fetches a
source URL, invokes AI, promotes records to memory, or enqueues a job.

### Manual QA

1. Enable Marketing in `/apps` and confirm all six navigation entries appear.
2. Open Overview; add one competitor and one campaign.
3. Add three Reel Ideas and assign at least one to the campaign.
4. Add one Research note with an HTTPS source and one campaign-linked Creative Brief.
5. Edit each kind, refresh, and confirm persistence.
6. Archive and restore one of each kind; verify Overview excludes archived records.
7. Confirm meaningful lifecycle events appear in Activity without record content.
8. Disable Marketing; confirm navigation disappears and direct routes are denied.
9. Re-enable it and confirm all records return unchanged.
10. Verify MEMBER can mutate, VIEWER has no mutation controls, a removed member is denied, and another organization cannot read or mutate the records.
11. Confirm ordinary CRUD creates no `ai_runs`, `jobs`, or `knowledge_memories` rows.

Competitor Reel analysis is TASK-014. External research automation is TASK-017.
Creative Council, Reasoning History, and Creative Studio remain later work.

## Stage

Initial marketing stage:

PRE-PRODUCT

Primary objective:

- recognition
- trust
- authority
- audience
- future demand

Primary platform:

Instagram

Primary content format:

Reels

---

# Marketing Inputs

Stylus should understand:

- startup idea
- problem
- future product
- target audience
- brand
- founder perspective
- desired public perception
- marketing objectives
- competitors

These are provided during onboarding and updated later.

---

# Competitor Reel Intelligence

Stylus should analyze permitted competitor Reel content.

Analysis dimensions include:

## Hook

- spoken hook
- visual hook
- on-screen text
- hook category
- hook duration

## Script

- opening
- setup
- tension
- value
- payoff
- CTA
- narrative structure

## Visual

- talking head
- camera framing
- cuts
- B-roll
- screen recordings
- motion
- transitions
- scene duration

## Design

- typography
- caption placement
- visual hierarchy
- colors
- graphics
- icons
- composition

## Branding

- logo usage
- recurring colors
- recurring visual motifs
- personality
- tone
- positioning

## Engagement

Store observable metrics where legitimately available.

---

# Reel Processing

Conceptual pipeline:

Media
-> audio extraction
-> transcription
-> scene detection
-> representative frames
-> text overlay extraction
-> visual analysis
-> structured creative analysis

Do not analyze every video frame with an LLM.

Use deterministic preprocessing first.

---

# Creative Council

Planned agents:

Audience Researcher
Trend Researcher
Competitor Analyst
Content Strategist
Hook Strategist
Script Writer
Retention Editor
Visual Director
Brand Director
Creative Critic
Creative Judge

---

# Creative Principles

Competitor intelligence informs strategy.

Do not directly reproduce competitor scripts or creative expression.

Stylus should identify patterns, opportunities and gaps, then generate
original creative direction consistent with the startup brand.

---

# Reel Brief

Final output should be production-ready.

Include:

- objective
- target audience
- evidence
- topic
- concept
- hook
- script
- timing
- shot list
- B-roll
- on-screen text
- transitions
- typography
- colors
- visual direction
- music/audio direction
- CTA
- caption
- keywords/hashtags where appropriate
- brand rationale
- risks
- critic feedback
- confidence

---

# Learning Loop

Future workflow:

Research
-> Strategy
-> Reel
-> Publish
-> Performance
-> Analysis
-> Marketing Knowledge
-> Future Strategy

The system should eventually learn from the startup's own performance
rather than relying primarily on competitors.

## TASK-014 V1 Implementation

From a Marketing competitor detail, OWNER/ADMIN/MEMBER can upload one manual
MP4 (100 MiB maximum), optionally attach a credential-free HTTP(S) source URL as
metadata, and request analysis. Stylus never fetches that URL. VIEWER is
read-only. A different source file requires a new competitor Reel record.

Each request creates a versioned analysis and one durable external-worker job.
The worker verifies the real container and 180-second limit with ffprobe,
extracts mono 16 kHz temporary audio, detects at most 20 scene timestamps with
a fixed 0.4 threshold, and transcribes locally through faster-whisper. It
persists no WAV or frame gallery. Strategic interpretation receives only a
bounded transcript, competitor identity, and deterministic media metrics through
ModelGateway. Results explicitly separate source/extraction from interpretation.

Re-analysis preserves prior versions. V1's explicit “Re-extract & analyze”
control requests a fresh deterministic extraction and transcription; it never
silently replaces the source or prior results.
Archival is soft and retains source media, transcript, analyses, AI/job history,
and Storage consumption. Controlled hard cleanup is deferred. OCR, semantic
vision/branding, automatic Instagram acquisition, Creative Council generation,
and automatic Company Memory promotion are outside V1.
