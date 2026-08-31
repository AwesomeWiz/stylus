# Stylus — Changelog

All notable user-facing changes to Stylus will be documented here.

## Unreleased

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
