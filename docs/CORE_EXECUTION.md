# Core execution and startup essentials

REDESIGN-007 · 2026-11-10 · PASS; local and hosted verification complete with limits below.

Baseline: `6afe70c7ffa07b61187ebc8eefd304318de02fba`; branch
`codex/redesign-007-core-execution`. Main agent only; sequential runners.

## Existing-domain audit and decisions

| Current feature | Current limitation | Startup need | Decision |
| --- | --- | --- | --- |
| Home | Six prioritized Tasks and old Marketing counts/notes; Core imports private Marketing data | Know daily personal/team work, evaluation and recent learning | Replace private imports with bounded public attention projections; use actionable rows |
| Tasks | Complete summary list in 1,000-row transport pages; compact views and URL detail | Keep current fast filtering, calendar, comments and 14-day Archive | Preserve; no initial discussion bodies or per-row related reads |
| Task relationships | No dependency table/RPC or derived blocked state | Identify prerequisites without a new status or DAG UI | Add bounded same-tenant edges with serialized cycle checks; never auto-complete work |
| Delivery checkpoint | No suitable Core entity | Track a small delivery commitment across optional Tasks | Add minimal Milestone, one optional association per Task, explicit lifecycle and real progress |
| Objectives | Company near-term objective, Campaign objective, Experiment criteria; Milestones cover delivery | Avoid overlapping planning systems | **GOALS: DEFERRED**; no clear need for a separate measured-goal/OKR entity in this scope |
| Marketing Research Note | Marketing-specific working research | General meeting/spec/retrospective material | Do not repurpose |
| Human Creative Brief | Marketing production intent | General working material | Do not repurpose |
| Company Profile | Structured canonical organization context | General working material | Do not repurpose |
| Memory | Explicit durable company-domain knowledge | Working drafts, not automatic Knowledge | Keep distinct; reuse reviewed create-once promotion |
| Board text | Canvas-owned geometry/plain text | Independently addressable, searchable working notes | Do not repurpose |
| Core Note/editor | No general Note entity or rich-text editor dependency exists | Simple bounded text editing and safe readable Markdown | Add focused Core Note; no editor framework, hierarchy, widgets or universal graph |
| Onboarding | Eight canonical steps, server validation and monotonic progress already exist; explicit submit advances; rail is not navigable | Recover unfinished fields, visible save/retry, predictable navigation and review | Preserve tables/fields and roles; add bounded manager-only step drafts and atomic canonical commit |
| Onboarding validation | Error descriptions are on wrappers, not controls | Accessible inline errors and useful focus | Connect labels/descriptions/errors to actual fields; no native validation bubbles |
| Invitations | Completed setup already bypasses onboarding; incomplete organization has a manager waiting state | Members do not repeat company setup | Preserve and test these distinct states |
| Notifications | Assignment/reminder/mention workflows and topbar inbox exist | Useful attention without spam or another inbox | Retain existing events; add no notification merely because a dependency or Milestone exists |
| Global search | Intentionally absent after V2 | Honest discovery | Retain domain search; no inert global input |

Notes live under member-readable Settings/Knowledge with contextual Home/Tasks
links, not a sixth global destination. Milestones belong to Tasks and Home.
Notes initially link canonical Core Tasks/Milestones with explicit tenant FKs;
new Marketing relationships are optional future public-contract work, not a reason
to introduce Core/private imports or a polymorphic graph. A native Note adapter
uses the existing public Board contract; generic Board mechanics stay frozen.

Onboarding drafts are temporary form state, not a replacement Company model or
AI context. Canonical rows change only on explicit step commit. An incomplete
draft must survive leaving/resuming without weakening canonical required-field
constraints. Saves are bounded, debounced and revision-checked; navigation waits
for confirmation and failures retain local text. Review editing returns to Review.

## Implementation plan

1. Add forward-only Core execution/Note and onboarding draft/commit contracts,
   with RLS, tenant FKs, bounded input, cycle/concurrency and permanent SQL tests.
2. Add typed public attention/provenance and Core services; batch Task related
   state and expose the existing Growth workflow through a trusted plugin host.
3. Deliver compact Home attention, Task dependencies/Milestones, bounded Notes,
   reviewed Memory promotion and the native Note provider.
4. Polish onboarding stepper/forms/review, recoverable autosave and navigation,
   retaining setup/invitation/role boundaries and existing canonical content.
5. Run focused tests, review/apply/verify development migrations, isolated real
   authenticated/browser/responsive/performance QA, then one fresh complete web
   suite on the final post-fix tree, lint/typecheck/build and delivery checks.

No new AI/model calls, automatic Memory, generic Board changes, new notification
spam, Goals/OKR framework, CRM, finance, HR or fundraising features are authorized.
No merge or push. Verification results and remaining limits will be recorded here
and in PROJECT_STATE before completion.

## Home and execution

Home consumes a validated, content-only Core attention contract. Core reads
Tasks, derived blockers, dated Milestones, six activity records and the authorized
directory. The trusted plugin host optionally adds Marketing's own projection:
evaluations, ending Experiments, untested READY_TO_TEST/HIGH Hypotheses, active
Campaign end dates and recent human Learnings. Campaigns have no recorded owner,
so their attention is team-level. Disabled Marketing is omitted and its RPC
denies reads. No responsibility, analytics or confidence probability is invented.

Personal/team groups show at most 12 unique items each; recent Learning is bounded
to three. Reasons, real owners and dates explain each action. Item/provenance
links disable speculative prefetch; attention does not issue detail reads per
item. Domain searches remain explicit; there is no global search.

Tasks retain complete metadata in 1,000-row transport pages, existing views,
URL selection/filter state, lazy discussion and the 14-day Completed/Archive
rule. One related-summary RPC per page adds blocked count and Milestone metadata.
Selected detail batches prerequisites/dependents, linked Notes and its Milestone.

Dependencies are same-organization edges, bounded at 50 in either direction.
Self/duplicate/transitive cycles and foreign targets are rejected. An org-level
transaction lock serializes competing cycle checks. Only COMPLETED prerequisites
unblock; CANCELLED stays unresolved until deliberately removed or reopened.
Blocked is derived information, not a new lifecycle. Completing a Task never
completes its prerequisites or dependents automatically.

Milestones have title, description, optional owner/date, PLANNED/ACTIVE/COMPLETE
and archival. Each Task has at most one. Progress counts actual linked Tasks,
excluding cancelled work; progress never changes Milestone status.
`/tasks?milestones=1` exposes bounded search/detail/archive;
`/tasks?view=all&milestone=<id>` filters the existing workspace. Archived checkpoints
retain old associations but accept no new ones. Goals remain deferred.

## Working Notes and Company Memory

`/notes` is member-readable Settings / Knowledge / Working Notes, with Home and
Task links. It adds no global destination. The index returns 25 recent metadata
rows plus a lookahead, timestamp/UUID pagination and literal title search. Bodies
are excluded and per-row prefetch is disabled. Exact selected detail is independent
of the current list filter/page.

A Note has a stable identity, audit provenance, a 160-character title, up to
40,000 characters and soft archival. Active editors collaborate; VIEWER reads.
Revision-checked saves retain text on failure. Plain Markdown headings, lists,
emphasis, code and HTTP(S) links have an optional preview. React escapes text;
HTML, images, embeds, scripts and server URL fetching are unsupported. Dates use
the shared hydration-safe viewer-local component.

Up to 30 explicit Task/Milestone links use tenant-composite foreign keys. No
universal graph or canonical duplication is introduced. Marketing-specific Note
relations are deferred until a bounded public contract justifies them.

**Preview addition to Company Memory** is a separate editable confirmation form.
Long Notes require a chosen excerpt, never silent truncation. The RPC checks the
exact reviewed Note revision and delegates to Core's public human company-memory
create-once contract. The organization-scoped `core.note:<id>` key prevents
duplicates; retries never overwrite existing Memory. Later Note edits do not
rewrite it. An exact authorized Memory opener retains identity, including archive.

The public `@/core/notes/server` adapter registers live `core.note` metadata through
the existing host. Cards store references only and resolve current authorized
title/update/archive metadata, without bodies or privileged snapshots. It adds
no conversion, AI, Memory retrieval or generic Board mechanics.

## Company setup and recovery

Seven information steps plus Review preserve canonical fields and management
roles. OWNER/ADMIN edit; members waiting on incomplete setup cannot. Accepted
invitations to completed organizations go directly to Home.

Acceptance keeps the existing verified-token and current-organization cookie
boundary, then enters Home. The retained Team accepted-link state still works;
incomplete organizations continue through the existing manager waiting gate.

The desktop rail/mobile step menu expose saved/current/remaining steps and total
progress. Navigation waits for dirty drafts; modifier-click keeps native behavior.
Back/Continue remain in document flow for keyboard-height viewports. The first
ordinary step omits Back; competitors can be empty. Review Edit returns to Review;
ordinary Company Profile editing keeps its existing return destination.

Manager-only `onboarding_drafts` hold bounded raw fields separately from canonical
context. An 800ms debounce coalesces typing; one in-flight save drains newer edits
using the returned revision. Opening a form writes nothing. Early hydration input
is never inferred to be an already-saved DOM baseline. Saves do not advance the
step or refetch the profile per field. Status distinguishes unsaved/saving/saved/
unconfirmed work. Failure retains text, offers retry and blocks navigation; there
is no offline durability promise.

Continue validates fields and atomically commits canonical rows, absolute progress
and draft removal. Revision checks detect stale tabs/profile changes; explicit
Keep draft or Use current profile resolves conflict. Review identifies unconfirmed
drafts and cannot finish over them. Competitor UUIDs survive draft/retry. Required
and error descriptions attach to controls; invalid submission focuses the first
relevant field. Drafts never become AI context or permanent Company Knowledge.

## Provenance and authority

One compact pattern shows explicit links, with disclosure after six entries.
Task backlinks use the public host. Marketing batches up to six Experiments,
deduplicates Hypotheses and resolves exact Evidence tuples. Completed evaluations
use frozen source IDs, not today's source selection. Nothing is inferred from
titles or similarity.

Fresh read/RPC boundaries enforce actor, tenant, role and plugin authority; layout
state is not mutation authority. New tables have authenticated SELECT-only RLS;
bounded SECURITY DEFINER RPCs own writes. No new notification types, cross-domain
Memory access, model calls, jobs or business modules are added.

## Verification and delivery

The explicitly requested continuation adds shared styled selects and narrowly
bounded Board context-menu, Delete shortcut and native-card presentation fixes.
It does not authorize additional editor mechanics or schema changes. The public
UI popup is extracted from the existing Board overlay; the Board wrapper keeps
its specific panel/focus configuration. Normal forms preserve native submission
values and change events through a hidden select, while a labeled combobox and
bounded popup provide pointer/keyboard interaction. Escape closes the inner
popup before its enclosing modal. Positions compensate for a modal's translated
containing block. The visible chevron reserves a 12px inset.

Home's bounded groups reserve the first action of each kind before filling by
rank, so a large blocked Task list cannot hide every evaluation/checkpoint.

Three reviewed forward migrations are applied to the authorized development
backend. All 49 ledger versions, five new RLS tables, 15 authenticated-only RPCs,
private helper grants and retained Boards V2 columns/RPCs are verified. Applied
source hashes are unchanged. Thirteen local PostgreSQL/pgTAP suites pass 455
assertions, including 140 new ones. Legacy anonymous-read assertions now check the
canonical migration's permission denial; invitation revocation uses its public
listing RPC and onboarding fixtures use the actual smallint signature. No
authorization assertion was removed or weakened.

Production-built authenticated browser checks cover actual Task/Milestone/Note
creation, dependencies, Note links and edited explicit Memory promotion, plus
Hypothesis/Experiment creation, Task linking, exact Evidence openers and Home
evaluation/Learning attention. Core hosted checks pass 20 assertions, including
concurrent opposing-edge serialization. Draft recovery covers offline retry,
resume, Keep/Discard conflict choices, zero competitors, Review Edit and Finish.
A newly accepted VIEWER invitation reaches Home; revoked/foreign reads and all
new VIEWER mutations remain denied. Native Note insertion persists one reference
without its body and opens the canonical Note after reload.

The first responsive matrix covers 12 surfaces, eight widths and two themes
(192 cases). The six changed form surfaces receive another 96 current-control
cases. Checks include modal focus trapping/restoration, visible labels, one main
heading, reflow, a 400px-high keyboard viewport, all eight named mobile setup
steps, reduced motion and three viewer timezones. Actual form selects preserve
payloads and autosave, support pointer/keyboard cancellation and keep a 13px
measured chevron inset. Keyboard validation errors attach to their fields.

Board checks retain all seven supported/requested zoom samples (10/25/50/100/
150/200/400%), with constant 256px menu width, 410px normal command height and
14px text. Hover/keyboard submenus flip and remain reachable. New edge Text,
Sticky and Shape objects show complete actions without movement. Real focused
Delete and Shift-selection Backspace persist; undo restores both. Locks, inline
editing, drilled-in Group children, VIEWER and Presentation are protected.
Eight additional boundary cases cover screen edges, open panels and a short
modal viewport. Final native card checks cover both themes, focus/selection,
archived/unavailable states and Presentation, with complete bounded metadata
rows and visible semantic Open links. No generic persistence/resolver contract
changes or UI-specific schema changes are introduced.

### Practical performance observations

Three samples each use a production local Next server and the authorized hosted
development backend, authenticated headless Chrome at 1440x1000, ordinary browser
caches and an unthrottled network. The server is warm. These are small observations,
including automation polling overhead, not p95, SLAs or before/after claims.

| Actual fixture / readiness condition | Samples (ms) | Median (ms) |
| --- | --- | --- |
| Home, with evaluation retained among 500+ Tasks | 2559, 1120, 1101 | 1120 |
| All 505 Tasks readable | 1806, 1683, 2143 | 1806 |
| Selected Task prerequisites and exact provenance ready | 5597, 4912, 5524 | 5524 |
| 51 Milestone-filtered Tasks | 1269, 1287, 1176 | 1269 |
| 501 Notes, first 25 metadata rows | 837, 818, 865 | 837 |
| Note title search, 10 matches | 888, 1000, 844 | 888 |
| Internal Company-to-Product setup navigation | 1021, 956, 1040 | 1021 |

The Note index/search transfers no body canaries. Second-page selection and Back
restore the exact search, cursor and 700px click-time scroll position. Internal
setup transitions make zero document requests. Browser document/fetch totals
are bounded (Task list 10, selected detail 14), including ordinary route prefetch;
these are not database query counts. Source uses one Task summary RPC per bounded
transport page rather than per row.

The full 505-row Task response is about 1.57MB decoded; list Long Tasks reach
186ms and selected-detail Long Tasks reach 259ms in these samples. Complete
secondary dependencies/provenance takes roughly 5.5s. These remain profiling
limitations for later measured optimization; no speedup or production guarantee
is claimed. Manual Windows NVDA, physical touch/keyboards and other browser
engines were not exercised. The local pgTAP runner is PGlite with an explicit
Supabase bootstrap, separate from the real authenticated hosted checks.

### Cleanup and final gate

Exact cleanup verifies four task Auth accounts (404), two task organizations,
two Boards/20 objects, 506 Tasks, 502 Notes, two Milestones, 42 dependency edges,
their explicit links, synthetic Growth/Evidence/run/cancelled-job records and one
explicit Memory are absent. Both immutable source triggers are enabled. Browser
storage/fixture credentials are cleared and the task's two helper ports are
closed. All 49 migration versions and deployed grants/columns/RPCs are rechecked;
applied source hashes are unchanged. No reset, DROP, TRUNCATE or unrelated data
deletion occurred.

The final complete web suite passes **252 files / 1,409 tests**, with one worker
thread and every correction included. The preceding complete run passed 1,407
tests and exposed two remaining page fixtures: a native-select value assertion
and an unmocked onboarding draft request boundary. Both are corrected; focused
page checks pass three tests. Earlier control/inventory corrections also retain
their payload/discoverability assertions. No tests are skipped or weakened.
All 130 final source/test/SQL hashes remain unchanged. Lint passes with zero
warnings; worker/web typecheck and the final worker/web production build pass.
Worker source is unchanged, so its tests are unaffected. Scoped formatting,
56 local Markdown links, 34 retained/current page routes, three retained
entrypoints, default whitespace checks and credential/artifact scans pass across
141 changed/new files. Applied SQL is not reformatted. The task-local environment
copy is removed after building; all original environment files remain untouched.
Temporary QA evidence stays ignored. No subagents, merge or push.

REDESIGN-007 is PASS and ready for user-managed review. Goals, additional Note
relations, full profiling and the manual target-environment checks above remain
deferred explicitly. REDESIGN-008 has not started.
