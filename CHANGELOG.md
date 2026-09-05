# Stylus — Changelog

All notable user-facing changes to Stylus will be documented here.

## Unreleased

- Team-member last-sign-in timestamps now render after hydration in the current
  viewer's browser/system timezone, including daylight-saving and local date
  boundaries, while preserving the existing authorized server projection.

- Completed the Stylus production design refinement with an accessible darker
  primary-action surface, richer centralized light/dark editorial pastels,
  clearer page and navigation hierarchy, roomier forms, and readable bounded
  prose across core and Marketing workspaces.
- Replaced the foundation placeholder at Home with a permission-aware operating
  dashboard backed by existing task, activity, team, plugin and Marketing data,
  including priorities, quick actions, recent activity and an adaptive pulse.
- Expanded Whiteboard collaborator identity to a deterministic eight-family
  high-distinction palette. Active users resolve collisions centrally, retain
  stable colors through joins/leaves, and share one accessible color treatment
  across avatars, cursors and labels; duplicate sessions still count once.

- Established `#0D98BA` as the canonical Stylus brand color with accessible
  semantic light/dark tokens, integrated the approved logo across auth, shell
  and icon metadata, and added persisted hydration-safe Light/Dark/System
  appearance controls.
- Added a production Settings page with safe account/organization summaries,
  Team navigation and an OWNER-only typed-confirmation organization deletion
  flow that cleans exact tenant Storage objects without deleting auth users.
- Added OWNER/ADMIN-only server-projected team last-sign-in metadata without
  exposing the Supabase service role or Auth Admin records to browser code.
- Added organization-and-board-isolated ephemeral whiteboard cursors with
  authenticated presence identity, throttled flow coordinates, deterministic
  colors and transformed remote rendering.
- Repaired whiteboard collaboration so the people count explicitly includes
  the local authenticated member and deduplicates multiple sessions by user.
  Presence now carries only slow-changing session state; ephemeral cursor
  coordinates use the same private board channel's bounded Broadcast path.
- Added compact Figma-style collaborator avatars and centralized accessible
  semantic accent tones for task, activity and Marketing specialist/status
  treatments in both light and dark themes.
- Replaced shared Marketing inline add/edit forms with responsive accessible
  dialogs, added restrained semantic state color, and centralized professional
  Lucide identities/readable output styling across Creative Council, Strategic
  Review and Ask Council without changing their workflows or model calls.

- Fixed Ask Council automatic Research context selection so anaphoric
  follow-ups use bounded recent user concepts, generic Marketing/Research/Reel
  terms cannot admit unrelated reports, and report/evidence identity is
  deterministically deduplicated. Explicit report attachments remain allowed.
- Added TASK-020 Ask Council, a bounded conversational Marketing advisor with
  deterministic intent routing, a one-to-three specialist ceiling, exactly one
  synthesis on full success and a four-ModelGateway-call maximum.
- Added organization-scoped immutable Council conversations, messages, turn
  versions, specialist/AI-run provenance and typed same-organization context
  references for existing research, Performance Learnings, Reel Briefs and
  Strategic Reviews.
- Added the responsive `/apps/marketing/council` workspace with explicit
  Create-versus-Ask separation, controlled context attachments, visible
  specialists/provenance, safe failures, bounded suggested actions and
  read-only Viewer access.
- Ask Council has no tools, live research, performance derivation, memory
  writes, automatic Reel creation, Strategic Review execution, durable jobs or
  Web Agency/TASK-019 access. TASK-019 remains deferred because the separate
  `ai-web-agency` implementation does not yet have a stable integration
  contract.

- Added TASK-018 manual Instagram Reel publication records, append-only
  performance snapshots, deterministic derived metrics and immutable,
  evidence-linked organization-local Performance Learnings.
- Performance comparisons use explicit observation horizons, latest eligible
  snapshots, median save rate by reach, minimum sample safeguards and the
  versioned `marketing-performance-learning-v1` algorithm. Missing metrics and
  missing creative classification remain unavailable rather than becoming
  zero or a synthetic category.
- Added the Marketing Performance workspace with exact Reel Brief-version
  linkage, raw/derived history, explicit TASK-017C opportunity classification,
  read-only Viewer behavior and inspectable learning provenance. The feature
  performs no AI, Council, Strategic Review, research, memory or Ask Council
  execution.

- Corrected the still-unapplied TASK-017E enqueue migration to compute its
  fashion/legacy source-count limit in a typed PL/pgSQL variable, then applied
  `20260825001750_fashion_web_consumer_evidence.sql` successfully to the linked
  hosted database without changing validation or authorization behavior.
- Added TASK-017E bounded fashion web discovery with deterministic intent-aware
  queries, fixed-host Tavily candidate discovery and independently fetched
  `WEB_PAGE` evidence with source-class and full-page provenance.
- Search snippets, answers and raw provider content are not evidence or stored.
  Every retained page passes HTTPS/URL policy, robots policy, pinned-DNS and
  redirect validation, byte/type/time limits, deterministic extraction and
  fashion relevance before immutable persistence.
- Fixed the shared research persistence priority list to retain independently
  validated `WEB_PAGE` drafts. The first hosted acceptance had recorded three
  successfully fetched, extracted and relevant pages as sources but discarded
  their evidence before synthesis.
- Constrained External Research structured generation to the capabilities of
  its exact current-run evidence. Text-only evidence cannot request visual
  patterns, and evidence without configured competitor provenance cannot
  request competitor signals; defensive post-gateway validation remains.
  This fixes the second hosted run's failure after five web evidence rows and
  one otherwise successful ModelGateway call.
- Web enrichment remains in the existing durable SERVERLESS research job and
  zero/one ModelGateway synthesis lifecycle; it adds no generic crawler,
  browser automation, Windows worker, Council, memory, TASK-018 or TASK-020
  behavior. Hosted acceptance remains pending.

- Added TASK-017D Fashion Social Intelligence with deterministic social-source
  planning, first-class Instagram/TikTok/YouTube/Pinterest capability states,
  organization-scoped competitor social identities, typed platform/modality
  provenance, and evidence-backed content/competitor/visual pattern contracts.
- Social retrieval now fails closed when official approval, intended-use or
  retention requirements are unmet. V1 activates no platform transport and has
  no scraping, browser automation, private-API, consumer-session or posting
  fallback.
- Added deterministic social source-diversity counts so comments from one item
  remain one discussion thread rather than masquerading as independent market
  evidence. Caption/comment/metadata evidence cannot support a visual claim.
- Completed TASK-017D hosted acceptance through the deployed durable SERVERLESS
  path. A deterministic Reddit + YouTube social plan failed closed when both
  official transports were policy-denied, persisting zero evidence and reports,
  making zero AI calls and producing no unsupported social claims or downstream
  Council, memory, TASK-018 or TASK-020 side effects.

- Added TASK-017C Fashion Marketing Intelligence with deterministic intent-based
  source planning, opt-in approved Reddit OAuth, curated fashion/editorial
  feeds and articles, typed Reddit evidence, fashion signals, and immutable
  evidence-backed content opportunity candidates.
- Hacker News is now conditional on fashion-technology research in the new UI;
  browser users cannot submit source domains, communities, provider settings,
  organization provenance, or credentials.
- Fixed fashion-editorial relevance so a registered source or generic words
  such as `fashion` cannot make an unrelated feed/article candidate eligible.
  Explicit topic concepts now gate feed metadata before article fetch and gate
  extracted article content again before evidence persistence.
- Completed TASK-017C hosted acceptance: a deliberate sustainable-fashion
  `TREND_SIGNAL` run rejected all 40 unrelated editorial candidates, retained
  zero evidence, made no AI call, and safely produced no unsupported report
  while Reddit remained unavailable by policy.

- Fixed TASK-017B pinned article retrieval on Node runtimes that request the
  custom DNS lookup result with `all: true`; the same validated address remains
  pinned and transport-contract failures now receive a safe specific diagnostic.
- Fixed enriched External Research synthesis by constraining structured
  evidence references to the exact per-run EVID set, bounding report breadth,
  and using 35 seconds of the existing 55-second workflow budget. Evidence now
  displays in numeric EVID order.
- Tightened the enriched research report's hard structured-output cardinality
  and text bounds after hosted evidence showed the prior concise schema could
  still exhaust its 1,600-token ceiling. All retained input evidence and exact
  EVID provenance checks remain unchanged.
- Added bounded structural paths to invalid OpenAI-compatible provider-envelope
  diagnostics after two independent hosted responses failed at that boundary;
  provider bodies, values, generated content, and credentials remain discarded.
- OpenRouter structured-output requests now require routed providers to honor
  every requested parameter instead of allowing unsupported schema parameters
  to be ignored.

### Added

- Initial product and architecture specification.
- Codex continuity documentation.
- Initial design-system specification.
- Marketing Creative Studio with the bounded Hook Strategist, Script Writer,
  and Creative Critic workflow.
- Immutable versioned Reel Briefs and safe structured Reasoning History.
- Explicit bounded TASK-014 competitor-evidence selection for Creative Council.
- Provenance-preserving External Research enrichment for matched Hacker News
  native text, bounded discussion and safely extracted linked articles.

### Changed

None.

### Fixed

- External Research no longer mislabels a successful Hacker News retrieval with
  zero literal-phrase matches as a source failure; multi-word query inputs use
  deterministic keyword matching and source history exposes safe diagnostic
  outcomes.
