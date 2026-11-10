# Startup growth and learning

REDESIGN-006 · 2026-11-10 · PASS; target-environment limits below.

## Existing-domain audit and implementation plan

The inspected baseline is `82d854afca2f2a91162c70a5b6bf37694c0f857a`.
Existing data stays canonical. Marketing remains a trusted plugin; Core owns
Tasks, memory and the public native entity contract.

| Existing concept | Actual domain | Mutability and authority | Reuse |
| --- | --- | --- | --- |
| Research report | `marketing_external_research_reports.structured_report` | Immutable exact run; Marketing member reads | Reports and indexed opportunity citations |
| Research Evidence | `marketing_external_research_evidence` | Immutable UUID/run/EVID; Marketing member reads | Exact evidence links; no copied bodies |
| Manual Research Note | `marketing_research` | Editor CRUD/archive, VIEWER reads | Human evidence context |
| Content Opportunity | `contentOpportunities` array in an immutable fashion research report | Report candidate, not accepted belief or experiment | Exact report UUID + zero-based candidate index; retain candidate semantics |
| Reel Idea | `marketing_reel_ideas` | Editor CRUD/archive | Explicit creative execution link; remains Reel-specific |
| Campaign | `marketing_campaigns` | Editor CRUD/archive | Execution link; no second campaign model |
| Human Creative Brief | `marketing_creative_briefs` | Editor CRUD/archive | Execution link; distinct from generated versions |
| Reel Brief | `marketing_reel_brief_versions` | Immutable version; existing Council authority | Exact execution link, no new generation/context |
| Performance Snapshot | `marketing_performance_snapshots` | Immutable manual observation; existing publication/horizon semantics | Exact result reference, no metric copy or automatic conclusion |
| Performance Learning | `marketing_performance_learnings` and evidence joins | Immutable deterministic algorithm artifact | Exact result reference; never broaden into a team-accepted conclusion |
| Company Memory | Core `knowledge_memories`, narrow human company-domain RPCs | Explicit editor mutation; company-only browser access | Reviewed promotion through public Core service, idempotent creation |
| Task | Core `tasks` and public entity provider | Existing lifecycle, role and tenant checks | Execution link; no copied Task fields |

No existing entity represents a testable belief, its deliberate test, or a
human-accepted conclusion with experiment provenance. Add focused Marketing-owned
Hypothesis, Experiment and Learning records. Evaluation stays on the Experiment;
completed evaluation and its source links are frozen to protect Learning history.
No new analytics/Result engine is needed. Qualitative criteria/results are valid.

Implementation order: additive constrained SQL and domain validation; bounded
server reads/mutations and permanent adversarial tests; workflow navigation and
compact workspaces; native providers/conversion integration through the existing
public registry; explicit reviewed memory promotion; focused QA, then one full
web suite and final checks. Generic Board mechanics and AI workflows stay frozen.

## Product contract

Evidence → Hypothesis → Experiment → execution → result → Learning. Only an
explicit reviewed confirmation adds Company Memory. Evidence is context for
testing a belief, never proof. Supported / Not supported / Inconclusive outcomes
express bounded conclusions. No automatic Hypothesis or memory update occurs.

## Delivered workflow

The primary destinations are Overview, Research, Experiments, Create, Campaigns
and Learn. Research separates Reports, exact Evidence, manual Notes, Content
Opportunity candidates and Competitors. Existing URLs remain canonical; Ideas,
Council, human briefs and Performance stay discoverable through contextual links.

Hypotheses contain a statement, owner, optional confidence and Draft / Ready to
test / Testing / Supported / Not supported / Inconclusive status. Their source
joins reference exact Evidence UUID/run/EVID, a live human Note, or immutable
report UUID plus zero-based candidate index. Evidence bodies are never copied.

An Experiment requires one canonical Hypothesis. It contains a test plan,
qualitative or quantitative criteria, owner and optional dates. Draft and Planned
can lack criteria; Running requires them. Running, Evaluating, Complete and
Cancelled are explicit transitions. Complete freezes result, outcome, evaluator,
time, evaluated Hypothesis statement and exact source identities. Cancelled work
cannot restart through an edit. Later source changes do not rewrite evaluation.

Typed links reuse Core Tasks, Campaigns, Ideas, human Creative Briefs, exact Reel
Brief versions, immutable Performance Snapshots and deterministic Performance
Learnings. Closed execution links are frozen. Tasks are created in Tasks. There
is no parallel task model, title-matched relation, copied metric or Result engine.
Snapshot zero remains distinct from unavailable data.

Evaluation explicitly records Supported, Not supported or Inconclusive and what
happened. It can atomically create one reviewed team Learning and, only when
selected, update the Hypothesis status. A Learning is a human conclusion with
title, confidence and exact completed Experiment provenance. It is neither a
deterministic Performance Learning nor permanent Company Knowledge.

Adding Company Memory requires a separate preview, editable title/text/type and
confirmation. Marketing checks current plugin/editor/source authority, then calls
the public Core company-memory contract. HUMAN-origin company-domain memory
records exact Learning/Experiment source IDs. A scoped creation key reuses the
same Memory on retries, including after archival, and never overwrites content.
Opening a page, creating a Learning or converting Board content never promotes it.

Task detail, a selected Studio Idea and Campaign detail show authorized
"Why are we doing this?" backlinks from actual Experiment links. Studio remains
the creation surface. Existing Create/Strategic Review/Council inputs, versions
and bounded model execution are unchanged. No Experiment context silently enters
a model request. No StyBay-specific assumptions were found in changed UI copy.

## Persistence, loading and native integration

Four forward migrations add five focused Marketing tables and RPCs, public
company-memory create-once behavior and existing Board receipt integration.
New tables are authenticated SELECT-only under current-membership and enabled-
plugin RLS. Actor-deriving editor RPCs validate tenant relations, active owners,
revision timestamps and source/link bounds. A stale write preserves form text and
asks the user to reload rather than overwrite another change.

Lists use UUID keyset pages of 25 with title/status/archive filters and summary
projections excluding statement/plan/result bodies. Detail resolves a selected
authorized ID independently of list membership. Hypothesis counts use one bounded
RPC; Overview uses six bounded projections. Detail resolution groups source and
execution reads by type and skips empty queries. Choice search is bounded;
Opportunity lookup pages exact reports and explains pages without matches.
Next search forms keep the persistent shell. No per-row subscriptions or
unscoped private cache is added.

All four reviewed migrations are applied to the authorized development project;
all 46 local/remote versions match. New tables have RLS and no authenticated
direct writes. New RPCs and retained Boards V2 columns/functions were verified;
applied source hashes remain unchanged. No reset, DROP, TRUNCATE or unrelated
hosted record changes occurred.

Hypothesis, Experiment and Learning have live native providers through the public
Core registry. Cards store references only and resolve current authorized state
in batches of at most 50. Plugin disablement or member revocation purges stale
titles/openers. Reviewed plain text/Sticky selections or one exact Evidence card
can create a Hypothesis; one Hypothesis card can create a Draft Experiment.
Learning creation stays in Experiment review.

Conversions reuse the existing own-creator durable receipt, atomic canonical
creation and separate Board link. Failure/reload resumes original target/card
IDs. Old plaintext Task/Idea/Note guards remain intact. Generic Board selection,
geometry, Group/Section, voting, presentation, visual design and collaboration
mechanics stay frozen. No new AI execution or memory-domain authority is added.

## Verification

Permanent coverage tests schemas, lifecycle, exact citations, criteria, frozen
evaluation, optional atomic Learning/status update, Memory idempotency, roles,
revocation, foreign relations and conversion recovery. The new growth pgTAP
suite has 102 assertions; thirteen related suites pass 527 assertions against
all actual migrations in isolated PGlite with minimal Supabase bootstrap.
Existing fixture corrections fix namespace/type/actor/zero-row expectations;
no authorization assertion was weakened. Real hosted RLS/RPC checks run separately.

Production-built browser QA uses isolated synthetic accounts and organizations
against the authorized development backend. No model/worker run, public scraping
or private asset upload occurs. Final responsive/performance/full-suite results
and exact fixture cleanup are recorded in PROJECT_STATE. Manual
Windows NVDA and other browser engines remain explicit target-environment checks.

Browser coverage includes the real Evidence → Hypothesis → Experiment → Supported
evaluation → Learning → edited Memory confirmation, exact Snapshot/Opportunity
openers, canonical Task/Campaign/Studio backlinks, all three new native insertion
types, Evidence/Hypothesis conversions, deliberate link failure and reload
recovery, VIEWER, foreign detail, plugin disablement and soft membership removal.
The three new card types also pass existing Shift selection, Group/ungroup and
locking paths without editor changes.

The responsive matrix covers nine surfaces at 320/390/430/768/1024/1200/1440/1920
pixels in both themes (144 cases). A further 64 affected-layout cases verify the
mobile search-row correction, labels, dialog bounds/traps/opener restoration and
direct-create close behavior. Headless Chrome is the tested engine; this is not
an NVDA, physical-device or cross-engine certification.

Three production samples per fixture used the same isolated account, unthrottled
local Next server and actual remote Supabase. Data included 100 Hypotheses,
110 Experiments, 100 Learnings and a 500-object Board with 50 distinct references.
Observed list readiness ranges: Hypotheses 1,052–1,123 ms; Experiments 837–885 ms;
Learnings 829–1,007 ms. Overview was 1,023–1,164 ms, filtered search 1,020–1,153 ms
and Experiment detail 1,810–2,142 ms. Each list rendered a 25-record page.

The mixed Board became usable in 1,399–1,460 ms. All 50 private native projections
resolved in one batch at 4,757–4,895 ms; selection took 31.7–41.7 ms. Initial list
documents were about 10.7–12.0 KB compressed; the mixed Board document was 52.6 KB.
Lists produced no observed Long Tasks; Board loading produced 3–4 per sample,
with maximum durations 161–207 ms. Type-grouped resolution remains a deferred
native-metadata cost. These are three warm-server document-navigation samples,
not cold/warm distributions, p95, an SLA or a controlled before/after speedup.
Generic Board performance architecture remains unchanged; larger profiling stays
in REDESIGN-009.

The full web suite ran once: 236 files / 1,330 tests, with 1,328 passing and two
stale route/navigation expectations. Both expectations were updated to preserve
all old routes/capabilities while recognizing the approved additions. The final
focused rerun passes nine tests, including direct-create focus; all observed
failures are resolved. Lint, worker/web typecheck and the final production build
pass. No suite was skipped or repeated in full.
Scoped Markdown/TypeScript formatting and link/secret/artifact checks pass.
One default staged-diff formatting warning is retained: an extra EOF blank line
in applied migration `20261109000110`. Preserving its exact reviewed/applied hash
takes precedence over editing it for whitespace. Other files pass default
whitespace checks; that file passes with only `blank-at-eof` disabled.

Exact guarded cleanup verifies four test accounts (Auth 404), two organizations,
three Boards/521 objects, all synthetic domain/source data, four receipts and two
explicitly promoted memories are absent. Four immutable-history triggers were
restored within the same locked cleanup transaction and remain enabled. No
unrelated data, reset, DROP/TRUNCATE or private asset deletion occurred. Task-local
helpers are stopped and ignored test passwords removed. Nothing starts 007.
