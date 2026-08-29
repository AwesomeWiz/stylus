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

Competitor Reel analysis is TASK-014. Creative Council V1, safe structured
Reasoning History, and Creative Studio are TASK-015. External research
automation remains TASK-017.

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
a fixed 0.4 threshold, and transcribes locally through an operator-configured
whisper.cpp CLI and model. It
persists no WAV or frame gallery. Strategic interpretation receives only a
bounded transcript, competitor identity, and deterministic media metrics through
ModelGateway. Results explicitly separate source/extraction from interpretation.
If interpretation fails, extraction remains persisted for audit, but the job
lifecycle controls retry and terminal failure state. A scheduled retry does not
prematurely mark the Reel or analysis failed. V1 retries the complete bounded
extraction/transcription pipeline rather than resuming at interpretation.
The strategic result retains its 2,000-character Zod summary limit. For Ollama,
the provider-facing JSON Schema omits that exact grammar-incompatible repetition
bound and Stylus validates the returned JSON against the full schema afterward.

Re-analysis preserves prior versions. V1's explicit “Re-extract & analyze”
control requests a fresh deterministic extraction and transcription; it never
silently replaces the source or prior results.
Archival is soft and retains source media, transcript, analyses, AI/job history,
and Storage consumption. Controlled hard cleanup is deferred. OCR, semantic
vision/branding, automatic Instagram acquisition, Creative Council generation,
and automatic Company Memory promotion are outside V1.

The worker accepts whisper.cpp's machine-readable JSON sidecar only from its
controlled temporary directory. It bounds and validates UTF-8 text, language,
segment count, deterministic order, and millisecond offsets against the probed
media duration before broker persistence. Python/faster-whisper/PyAV are not
used. If FFmpeg, ffprobe, whisper.cpp, its model, or native execution permission
is unavailable, the worker does not advertise this Marketing capability and the
job remains queued; unrelated worker diagnostics continue to function.

## TASK-015 Creative Council V1

Creative Studio lives at `/apps/marketing/creative-studio`. A run starts from
exactly one active Reel Idea selected by the user and executes three code-owned,
tool-free structured agents in a fixed order:

```text
Reel Idea -> Hook Strategist -> Script Writer -> Creative Critic -> Reel Brief
```

Hook Strategist returns a primary hook, concise rationale, at most two
alternates, audience tension, evidence summary, assumptions, and confidence.
Script Writer returns the chosen hook, spoken script, one-to-eight timed
sections, CTA, caption, and up to eight visual directions. Creative Critic
returns a verdict, strengths, weaknesses, risks, recommendations, audience,
brand and originality assessments, and confidence. Its verdict never triggers a
rewrite.

All three calls use `marketing.creative-council.execute` through ModelGateway.
Hook and Script use `balanced`; Critic uses `reasoning`; each has a 90-second
timeout. The successful path has exactly three model calls. There is no
application retry loop, tool, worker, queue, research adapter, agent recursion,
or mid-run cancellation.

### Context limits

- Reel Idea projection: 6,000 serialized characters maximum; notes are reduced
  to 1,000 characters.
- Canonical Company projection: 20,000 characters maximum, using only relevant
  identity, problem, product, audience, brand, positioning, and marketing
  fields. Arrays are capped at eight entries of 240 characters.
- Competitor evidence: zero-to-three explicitly selected completed TASK-014
  analyses, 12,000 serialized characters total and 8 KiB per stored projection.
  Only abstract hook explanation/type, pacing, bounded script-structure
  observations, reusable patterns, cautions, transcript-pattern observations,
  and deterministic scene metrics are included.

Competitor MP4/WAV media, transcript text, source/signed URLs, storage paths, raw
extraction artifacts, raw analysis JSON, primary-hook wording, CTA wording, key
messages, and source summaries are excluded. Unselected, archived, incomplete,
or cross-organization analyses are rejected. Competitor evidence informs
differentiation and never authorizes imitation.

### History, versioning, and failure

Every request creates an immutable run unless its idempotency key or an active
same-user/source run proves it is an accidental duplicate. Successful Hook and
Script output is persisted before the next stage. Hook failure calls no later
agent; Script failure preserves Hook; Critic failure preserves Hook and Script.
Only a validated Critic result transactionally creates a successful immutable
Reel Brief version. A later intentional run creates the next version and never
overwrites its Reel Idea or a human Creative Brief.

Reasoning History means these safe structured stage outputs, assumptions,
evidence references, recommendations, risks, confidence, timestamps, and AI-run
references. It never contains prompts, provider raw responses, chain-of-thought,
credentials, media, or transcripts. No durable memory is retrieved or written.

OWNER, ADMIN, and MEMBER may execute; VIEWER is read-only; removed members,
cross-organization access, and disabled Marketing are denied. Organization AI
policy, LOCAL_ONLY, REMOTE_ALLOWED, DISABLED, provider allowlists, remote budget,
and normal AI-run tracing are checked independently for each stage.

### Manual QA

1. Apply `20260825001500_creative_council_v1.sql` to the hosted project and run
   `creative_council_rls.test.sql`.
2. Enable Marketing; configure an organization AI policy and a ModelGateway
   provider reachable by the web server. For local QA, start Ollama through the
   existing server-only configuration. Create Company Profile context and one
   active Reel Idea. Optionally complete one TASK-014 analysis.
3. As OWNER, ADMIN, or MEMBER, open `/apps/marketing/creative-studio`, select the
   Reel Idea, leave competitor evidence empty, review the context summary, and
   run Creative Council. Observe Hook, Script, and Critique status; confirm a
   structured Reel Brief, `SUCCEEDED` run, exactly three linked successful
   `ai_runs`, and the same version after refresh.
4. Intentionally run the same Reel Idea again. Confirm a new run/version appears
   and version one remains unchanged. Double-click a single submission and
   confirm it creates only one run/version.
5. Run once with exactly one explicitly selected eligible TASK-014 analysis.
   Confirm only that reference is recorded. Run without selection and confirm no
   competitor evidence row exists. Verify no transcript, media path, URL, or raw
   analysis appears in history.
6. Sign in as VIEWER. Confirm prior briefs/history are readable but no execution
   control exists. Remove a MEMBER or disable Marketing and confirm execution is
   denied; re-enable Marketing and confirm historical rows remain.
7. Safely make the configured provider unavailable or set AI policy to DISABLED,
   then request a new run. Confirm failure is recorded at the attempted stage,
   later stages are absent, earlier successful stages (if any) remain, and no
   successful Reel Brief version is created.
8. Inspect `ai_runs` and the council tables. Confirm logical tiers are BALANCED,
   BALANCED, REASONING; prompt/provider bodies are absent; the source Reel Idea,
   human Creative Briefs, and `knowledge_memories` are unchanged.

## Approved Future Direction: Create and Ask Council

Creative Studio will eventually support two distinct interactions over reusable
Creative Council infrastructure:

```text
Create                                Ask Council
structured source                     team question
  -> bounded workflow                   -> bounded intent/workflow routing
  -> persisted artifact                 -> relevant approved specialists
                                          -> bounded synthesis
                                          -> team-facing answer
```

Create remains production-oriented, structured, auditable, and versioned where
appropriate. TASK-015 is its valid V1: exactly Hook Strategist, Script Writer,
and Creative Critic produce a Reel Brief in three successful calls. Ask Council
is a future advisory mode for questions about priorities, positioning, brand,
audience, campaigns, content strategy, and creative improvement. It is not
implemented by TASK-015 or TASK-016.

Ask Council must route a question to the smallest approved code-defined finite
workflow rather than invoke the whole council or spawn agents dynamically. For
example, a hook question may need Hook Strategist and Creative Critic, while an
on-brand question may eventually need Brand Director and Creative Critic. These
examples guide bounded routing and do not freeze exact mappings before TASK-020
discovery.

The result is one synthesized user-facing answer, not a transcript of internal
agent discussion or fake specialist chat bubbles. Safe answer concepts include
recommendations, concise audience/brand/creative perspectives, evidence,
assumptions, disagreements, risks, and confidence. Raw chain-of-thought is
never exposed or persisted.

Future context may include bounded authorized Company data and appropriate
Marketing records: Reel Ideas, Campaigns, Creative Briefs, Research,
Competitors, and completed competitor Reel analyses. Marketing memory requires
a future explicit authorization/retrieval design. Working records are not
automatically promoted, manifest memory domains grant no access, and Marketing
never retrieves agency memory. TASK-017 research may support an explicitly
research-enabled workflow, and TASK-018 performance learning may provide
authorized evidence; an ordinary Ask Council question enables neither by
default.
