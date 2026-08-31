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

## TASK-016 Strategic Council Review V1

Creative Studio adds a separate action on an existing immutable Reel Brief
version:

```text
exact Reel Brief version
  -> Audience Researcher
  -> Brand Director
  -> Content Strategist
  -> Challenge Reviewer
  -> Creative Judge
  -> immutable Strategic Council Review v1
```

The successful path makes exactly five ModelGateway structured calls. Audience
and Brand use `balanced`; Strategy, Challenge and Judge use `reasoning`. Calls
have a 60-second timeout and the synchronous workflow has a 285-second overall
deadline. There is no Marketing retry loop, recursive debate, agent spawning,
tool, job or worker.

All nine TASK-016 specialists are statically registered with typed input/output
contracts. Trend Researcher, Competitor Analyst, Retention Editor and Visual
Director are not invoked by this workflow. Trend and Competitor may only reason
over explicitly supplied authorized evidence in a future workflow and never
claim independent search, media access or current verification.

Audience and Brand distinguish evidence, inference and assumption. Content
Strategist creates bounded `REC-N` recommendations. Challenge Reviewer performs
one adversarial pass and classifies claims as supported, weakly supported,
unsupported by supplied evidence, contradicted by supplied evidence or requiring
external verification. Unsupported is not treated as proven false. Creative
Judge must disposition every challenged reference as accepted, partially
accepted or rejected and preserve unresolved verification needs.

The Judge schema is bound per invocation to the exact Challenge reference IDs
and requires the same number of dispositions. This guides constrained local
generation while preserving dynamic Zod validation and the final exact-set
check; a valid generic string cannot silently identify a different claim.

The exact Reel Brief projection and bounded canonical Company context are loaded
server-side. The browser cannot supply organization, actor, provider, model,
prompt or arbitrary context. No durable memory, competitor evidence, raw media,
transcript, URL or external research enters V1. Every successful stage and its
AI-run provenance is immutable; failures stop immediately and preserve prior
successes. Only Judge success creates a versioned Strategic Council Review.

OWNER, ADMIN and MEMBER execute/read; VIEWER reads only. Service-only database
transitions, Marketing RLS, same-organization foreign keys, idempotency and a
one-active-source/actor guard protect the lifecycle. A completed review permits
an intentional later immutable version. TASK-015 remains exactly Hook -> Script
-> Critic -> Reel Brief.

### Manual QA

1. Apply `20260825001600_creative_council_expansion.sql` and run
   `strategic_review_rls.test.sql` in the hosted project.
2. Enable Marketing and organization AI policy, then generate or select a
   successful TASK-015 Reel Brief in Creative Studio.
3. As OWNER, ADMIN or MEMBER, select the exact brief version and click **Run
   strategic review** once. Observe Audience, Brand, Strategy, Challenge and
   Judge; confirm one final review and exactly five linked successful `ai_runs`.
4. Refresh and confirm the review remains attached to the same source version.
   Double-submit one invocation and confirm one run/final; intentionally submit
   again after completion and confirm review version two without mutation.
5. Use a brief that claims “Our audience definitely prefers 60-second Reels”
   without evidence. Confirm Challenge marks it unsupported/requiring external
   verification rather than true or false, and Judge records a disposition.
6. Use an obvious canonical brand conflict and confirm Brand identifies it and
   Challenge/Judge preserve the issue.
7. Safely make the provider unavailable before Challenge. Confirm Judge does
   not execute, no final review exists, and earlier successful stages remain.
8. Confirm VIEWER sees history without the execution action; removed,
   cross-organization and Marketing-disabled users are denied.
9. Generate another ordinary TASK-015 Reel Brief and confirm Hook -> Script ->
   Critic still performs exactly three calls.

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

## External Research V1 and TASK-017B enrichment

The Research area keeps TASK-013 Manual Notes separate from durable External
Research. A bounded request selects one HN stream and/or up to two explicit
RSS/Atom feeds. Hosted execution persists source status, EVID-n excerpts,
dedupe/failure counts and an immutable structured report. Findings navigate to
evidence and safe source URLs; publication time remains distinct from fetched
time, and missing publication time remains unknown.

Query-term filtering is deterministic and token based: multi-word entries are
treated as bounded keyword groups rather than exact contiguous phrases. A
healthy source request with candidates but no matching keyword is persisted as
a successful source observation with `zero_matching_candidates`; it is not
reported as a transport failure. Zero retained evidence still prevents model
synthesis and fails the overall run safely. Source observations retain only
bounded diagnostic categories and counts, never response bodies or network
internals.

TASK-017B enriches only the first two matched HN stories, never the initial
candidate set. Native submission text becomes `HN_TEXT`; story identity and
score/comment metadata become `HN_STORY`; at most five top-level comments per
story plus the first listed reply when usable at one nested level become
`HN_COMMENT`, capped at ten comments per run. At most two unique linked HTTPS
articles are fetched and converted into `ARTICLE_CONTENT` by deterministic DOM
extraction. Every kind remains a separate immutable evidence row so users and
synthesis can distinguish an article author's statement, submitter text and an
individual HN comment.

Article responses are limited to 512 KiB and 8 seconds per attempt. Extraction
keeps title, headings, paragraphs and lists, removes deterministic boilerplate,
and retains at most 4,500 characters in three coherent 1,500-character chunks.
Runs retain at most 20 evidence items/24,000 persisted evidence characters.
Synthesis deterministically shares 18,000 excerpt characters across those
records inside a 40,000-character serialized context. The strict synthesis
schema permits only the exact EVID identifiers in that context and bounds report
breadth for the unchanged 1,600-token output ceiling: at most four findings,
two patterns, two recommendations, one disagreement and two inferences, with
short bounded statements and at most three EVID references per supported
statement. These response limits do not remove any retained evidence from the
synthesis input. Retrieval gets 20 seconds, synthesis at most 35 seconds, and
the 55-second application workflow reserves five seconds for completion under
the Hobby 60-second function ceiling. Each retained comment is limited to 1,500
characters; enrichment concurrency is two inside the existing three-request
gate; redirects are limited to three; and the run-wide fetched body budget
remains 4 MiB. Article or comment failure records a safe diagnostic and
preserves usable HN evidence.

TASK-017B still has no Reddit, general web discovery, recursive crawling,
social scraping, automatic Council execution or memory promotion. TASK-017C is
future fashion-oriented source expansion expected to prioritize Reddit plus
bounded web/fashion-editorial discovery. Instagram/TikTok/Pinterest/YouTube
intelligence remains separate because it requires richer media and platform
handling. A future authorized workflow can request an explicit report plus
selected evidence through a server-only bounded projection; no existing Council
path consumes it automatically.

## TASK-017C Fashion Marketing Intelligence

TASK-017C keeps External Research inside the Marketing Research workspace and
turns evidence into bounded strategic opportunity candidates. Each request has
exactly one controlled intent: `AUDIENCE_PAIN`, `AUDIENCE_DESIRE`,
`AUDIENCE_LANGUAGE`, `PURCHASE_OBJECTION`, `QUESTION_DEMAND`,
`BELIEF_OR_MISCONCEPTION`, `CONTROVERSY_OR_DEBATE`, `TREND_SIGNAL`,
`COMPETITOR_SIGNAL` or `FASHION_TECH`.

A deterministic planner, never a model, selects `REDDIT`, `EDITORIAL` and/or
`HACKER_NEWS` with controlled reason codes. HN is used only for
`FASHION_TECH`. Source IDs, domains, communities, search-provider identity and
credentials are server-owned and cannot be supplied by the browser. The UI
previews the selected families and configured source labels.

The code-owned V1 registry includes bounded fashion advice, fashion, durability,
ethical-fashion and streetwear communities plus Vogue and Retail Dive editorial
feeds. Community priority varies by intent and selects at most two. Reddit is
disabled unless the operator explicitly enables an approved OAuth use case.
Editorial article candidates must match the registry domain and pass the shared
pinned-DNS safe fetcher. Optional search discovery is an interface only; known
feeds work without a paid provider.

The `marketing-fashion-research-report-v1` artifact contains a concise summary,
audience, language and trend signals, objections, debates, deterministic source
coverage/diversity and at most four Content Opportunity Candidates. Signal
types are `PAIN`, `DESIRE`, `QUESTION`, `OBJECTION`, `LANGUAGE`,
`MISCONCEPTION`, `DEBATE`, `TREND`, `COMPETITOR` and `TECH`. Opportunity types
are `RELATABLE_PAIN`, `EDUCATIONAL`, `MYTH_BUSTING`, `DEBATE`,
`TREND_EXPLAINER`, `BUYING_OBJECTION`, `IDENTITY_ASPIRATION`,
`QUESTION_ANSWER`, `BRAND_TRUST` and `PRODUCT_CONTEXT`.

Opportunities are evidence-backed strategic angles, not completed creative.
They contain no finished hook, script, shot list, storyboard, CTA, caption,
visual treatment or Council judgment. Every signal and opportunity cites one to
three exact current-run EVID identifiers. TASK-017C invokes no Council workflow,
writes no memory and implements no performance learning. Instagram, TikTok,
YouTube and Pinterest remain TASK-017D discovery.
