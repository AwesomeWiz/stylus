# Stylus — Changelog

All notable user-facing changes to Stylus will be documented here.

## Unreleased

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
