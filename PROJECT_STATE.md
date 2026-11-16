# Stylus — Project State

Last Updated: 2026-11-16

## Overall Status

REDESIGN-009 engineering and native release-pipeline acceptance: **PASS**.
Exact CI-tested release SHA: `5c99aaea122338556d96703f0b32e90b6de4ed83`.
[Native CircleCI #21](https://app.circleci.com/workflow/fb7f1bdd-b38e-4f34-947e-7a0d318273cb/job/a344e292-252d-438f-9258-14679aca6c3d)
and its complete logs are verified successful. Fresh install, all 53 migrations
from zero, isolated/native SQL (30 suites / 1,138 assertions), upgrade, real
OWNER/MEMBER/VIEWER Auth/JWT/role checks, 36 worker tests, 1,531 web tests, 64 demo
tests, lint/typechecks/security and both production builds pass. All nine browser
cases pass in Chromium/Firefox/WebKit with one worker and zero retries. Both full
seed/verification/exact-cleanup rounds, unchanged control baseline, final control
cleanup and no tenant/Auth/Storage orphans are verified. The owned stack stops.

**READY TO MAKE PUBLIC: NO.** The supported-host clean-clone signup/organization/
onboarding walkthrough and physical NVDA checks remain unperformed. GitHub live
security/branch/reviewer settings, author/history privacy, artifact legal/source
obligations and applicable public Google OAuth verification still need maintainer
confirmation. No failing or unexecuted manual check is relabeled as passed.
See [release audit](docs/RELEASE_AUDIT.md) and [checklist](docs/RELEASE_CHECKLIST.md).

Acceptance closure `cdd223862801b3689da5fbf15112dc81bb5b00c5` changes exactly seven
Markdown files after the tested SHA. No later release commits are found on a fresh
remote fetch. This final reconciliation adds documentation only and is intended
for the release PR; executable inputs remain identical to the tested candidate.
Only Markdown/link/diff and requested branch/history checks are repeated.

Both local and remote main remain at `5b7e76a0fe6a4e80f17e14c04b119a84b43668a9`,
an ancestor of the release head, with no main-only commits. The original main
checkout's 58 tracked modifications and 25 untracked files outside `.worktrees`
are preserved by content/status comparison. Merge preview has no conflicts and
matches the release tree. Recommend a reviewed merge commit preserving ancestry;
validate the eventual actual main merge SHA, which does not exist before merge.

GitHub already reports PUBLIC visibility; this task does not change it. All 31
advertised branches and zero tags are reviewed. Reachable-history secrets scan
passes; no committed environment/QA artifacts are found in those remote refs.
Historical personal author metadata, example-brand/domain and hosted-project
references still need review, and the separate old open-source branch has Apache
licensing rather than this candidate's AGPL license. No refs/history are deleted
or rewritten. See the release audit for scope and exact reconciliation evidence.
No hosted database access, agents, automatic merge, tag or visibility change.

## Earlier verification records

REDESIGN-009 inventory/round-trip follow-up: native diagnostic #12 at `8a182d9`
fails before seeding because the CLI emits a plain JSON array outside agent mode,
but the adapter unconditionally reads `.rows`. The resulting undefined value is
indexed by the catalog consumer. The pinned CLI formatter confirms the contract;
this is not an empty catalog or a permission-denied query. Output now pins
non-agent JSON and validates the complete transport/result shape. Private logs
preserve exit/signal/spawn errors and both output streams. Catalog coverage,
primary keys, provenance and tenant identities must be complete before empty
tenant records can count as verified absence.

The entire actual round-trip and Auth-smoke sources now execute in the SQL
contract regression, including both seed rounds, CLI response decoding, exact
cleanup and before/after preservation checks. This caught two later defects:
team verification now uses the existing directory RPC (direct membership reads
are own-user only), and Auth-smoke tasks use database-generated IDs because the
browser INSERT grant excludes `id`. Returned IDs are journaled before update.
Smoke-inventory reconciliation permits an already-recorded exact identity once;
unexpected rows/provenance still stop cleanup. Missing/changed baseline data stops
before deletion. The baseline includes actual control content/Auth identity and
fresh-VM Auth-ID/Storage inventories, with validated genuine empty Storage results.

All 63 demo regressions, seven release-helper tests, lint/typechecks and 30 SQL
suites / 1,138 assertions pass locally with 53 unchanged migrations. Auth/Storage
transport is synthetic in the SQL test; no real Supabase PASS is claimed. The
requested preflight branch is fast-forwarded to
`eeab04337322438985d8e6c6845aa3517350b194`, incorporating the later 009 hardening.
Native triggering still returns 404 through CLI and documented v3 API; automatic
compatibility execution has ended. An owner-started native diagnostic at that
exact SHA is requested. Hosted data, production grants, RLS, migrations,
dependencies and the lockfile remain untouched. No agents/merge/tag/publication.

Owner-started native run #15 confirms the inventory/baseline repair at `eeab043`,
then fails at MEMBER logout: the new data validator incorrectly required `data`
from `auth.signOut()`, whose documented SDK result is error-only. Explicit logout
success now requires `{ error: null }`; data-bearing queries/RPCs still require
their data field. The installed Auth and Storage SDK implementations now run
inside the complete controller regression with fenced synthetic HTTP, replacing
handwritten SDK result mocks. All 64 demo tests and seven release-helper tests
pass, including actual SDK account/session/logout/upload/info/download/remove
transformations, full SQL roles and all round-trip phases. Lint, typechecks,
both production builds, formatting, 190 links, secret scan and workflow/Bash
checks pass. The full real Supabase round trip remains pending a new native run;
no PASS is inferred from #15 or local synthetic transport.

REDESIGN-009 complete demo-seed repair is in progress from `e5fe80e`.
The entire interaction/role audit is in docs/DEMO.md. Direct service membership
writes are replaced by OWNER invitations and each teammate's authenticated
acceptance. Administrative research SQL inserts are replaced by the existing
bounded service RPC lifecycle, cancelled before synthesis. All remaining fixture
writes use existing authorized OWNER interfaces. A private authored PNG now has
exact path/Storage UUID/hash verification and guarded removal before tenant
deletion. Hosted seeding/inspection is refused; no hosted backend was accessed.

Nineteen demo tests pass, including the complete actual seed source and cleanup
twice against all 53 unchanged migrations/grants/RLS in isolated PostgreSQL with
synthetic Auth/Storage transport. All 30 isolated SQL suites / 1,138 assertions,
release-helper tests, lint, both typechecks and both production builds pass.
The complete web suite passes 267 files / 1,531 tests; all 36 worker tests pass.
Upgrade, formatting, 189 relative links and license checks pass. The new real CircleCI
round-trip gate seeds/cleans twice, verifies zero AI/reports and exact absence,
preserves an independently recorded control tenant/content, and retains the
second fixture for real Auth/JWT/browser checks before final guarded cleanup.
Only the smoke's two preallocated tasks/four exact trigger events can extend its
cleanup inventory; any other delta stops cleanup.

Real Supabase and full release acceptance are still pending. CircleCI CLI auth
reads native logs successfully; the existing native failure is confirmed at
membership 42501. Native manual trigger returns 404, cancellation returns 403.
The retained diagnostic branch `cci/preflight/demo-seed-20261116-a` at
`8a182d92d2fbc0f8a7e299e147015ec9fa987e3c` automatically selected the older
compatibility pipeline, not the required native definition. The owner has been
asked to start `release-machine-ci` explicitly on that diagnostic branch.
No real seed/cleanup PASS or public-release readiness is claimed.
No production grants, RLS, migrations, dependency/lockfile or application changes.
The initial diagnostic snapshot predates final inventory normalization, Storage
identity denial checks and shared verification-query coverage; the final 009 SHA
must run the full native workflow. Official CircleCI config/Bash validation and
candidate-tree secret scanning pass. The unchanged high-severity npm audit gate
passes with seven moderate lint-tool-chain findings (minimatch advisory
GHSA-g3hv-75wg-m249); dependency remediation is outside this seed-only repair.

REDESIGN-009 demo verification 42501: remote branch and CircleCI release failure
both identify exact candidate `227c7cf`. The owner reports fresh Docker, migrations
and SQL/RLS now pass; seeding fails at the service-key admin client's direct
organizations SELECT. The seed already has an authenticated fictional owner and
has bootstrapped its organization. Shared exact-ID verification now uses that
owner's existing RLS read path, both during setup and after owner sign-in during
cleanup. It checks the recorded organization UUID, name and creator UUID; missing
or mismatched identities fail without fallback searches. Auth administration,
exact account checks, complete row inventory and atomic owner deletion remain.

Focused verification passes 13 demo tests, including actual seed-through-verify
and cleanup source executed with synthetic transports/in-memory files, and 13
organization pgTAP assertions. Owner reads succeed while direct service-role
organization reads remain denied. Full isolated SQL passes 30 suites / 1,138
assertions / 53 unchanged migrations. The focused Node tests join the existing
sequential npm test gates; no dependency or lockfile change. Application grants,
RLS, production behavior and migrations are unchanged. A full live demo seed
remains pending the new release-machine-ci run; no hosted backend, local Docker
or Windows virtualization was used.
Lint, both typechecks, repository formatting, 188 relative links, candidate-tree
secret scanning and diff checks pass. Package metadata differs only by the added
demo test command/gate; the lockfile and application/CI/migration files match base.

REDESIGN-009 SQL role-boundary repair: the owner reports Docker-backed Supabase,
local postgres fixture setup, Auth/Storage/pgcrypto and all 53 migrations passing
on CircleCI candidate `06ecb41`. The following SQL errors reproduce locally when
the isolated bootstrap's accidental blanket public-table grant to service_role
is removed. Both harness variants have postgres session/current identity; the
grant masks intra-suite service-role fixture reads, not a connection, ordering
or transaction-reset defect. Ask Council fails before its RPC during argument-ID
lookup; six other suites inspect protected state without restoring postgres.

The seven suites now capture fixture UUIDs under postgres in transaction-local
test settings, keep all original RPC operations under their intended roles, and
reset for protected result inspection. The isolated bootstrap no longer grants
every public table to service_role. Production grants, RLS, functions, migrations,
application code, dependencies and both CI configurations remain unchanged.
All 255 original focused assertions retain labels/order, and 171 public function
references retain their original roles. A new administrator-restoration assertion
and 18 release-security assertions enforce eight direct-read denials plus explicit
integration access. The new denial guards reject the old bootstrap with 16
expected failures, proving sensitivity to the original masking defect.

Focused suites pass individually in the requested order: Ask Council 38, Creative
Council 21, External Research 54, Heavy Jobs 59, Reminders 32, Strategic Review 29,
Windows Workers 23; release-security passes 104. Full isolated SQL passes 30/30
suites / 1,134 assertions / 53 migrations, and the pre-integration upgrade passes.
Lint, both typechecks, repository formatting, 188 relative links, candidate-tree
secret scanning and diff checks pass; production build inputs are unchanged.
Native SQL rerun, remaining real Auth/JWT/Core/browser/build gates and complete
CircleCI acceptance remain pending at the new exact candidate. No hosted backend
or local Docker/virtualization was used for this repair.

REDESIGN-009 direct CircleCI machine pipeline: `.circleci/config.yml` adds one
sequential Ubuntu 24.04 VM job with direct local Docker, exact `CIRCLE_SHA1`
verification, Node 24.22.1, a fresh npm cache and deterministic `npm ci`. The
existing GitHub Actions workflow is unchanged. Experimental Supabase is disabled;
fresh-container/volume guards precede standard Docker-backed startup. Real local
status, all repository migration versions, Auth/Storage/pgcrypto and the postgres
fixture connection/grants are inspected before the complete pgTAP suite. No RLS,
SQL fixture, migration, dependency or lockfile change is made for the reported
compatibility-layer `worker_registrations` denial.

The existing three-account fictional seeder exercises real Auth creation and
owner organization bootstrap. An additional local-only gate logs in OWNER,
MEMBER and VIEWER, verifies each JWT with Auth, tests Core reads/writes and
management restrictions, and confirms VIEWER writes leave the original unchanged.
It uses public-key/password sessions for assertions, never service-role
impersonation. All previous static/security, isolated SQL/upgrade, web/worker,
production build and three-engine browser gates remain required. Cleanup always
stops only the stack this job attempted to create; raw logs/credentials/traces
are not uploaded. Hosted Supabase and external providers are not used.

CircleCI's official CLI 1.15.0 validates the configuration/public orb. Seven local
guard/redaction tests, all run-step Bash syntax, script/package references,
simulated startup failure/cleanup ownership, lint and both typechecks pass.
Formatting, 188 documentation links, the Git-visible candidate secret scan and
diff checks pass; all validation runners were sequential.
The existing GitHub workflow and application build inputs remain unchanged.
The owner must configure
CircleCI to read `.circleci/config.yml` directly; the compatibility pipeline does
not automatically switch. Full machine execution and release acceptance remain
pending at the new exact candidate, including reproduction/classification of
any SQL failure. Windows virtualization remains disabled and untouched.

REDESIGN-009.1 startup diagnosis: CircleCI passed npm installation and the worker
path fix at `7aa7924`, then failed Supabase startup with both output streams hidden
in a file. CI now reports safe platform/tool/environment-presence diagnostics,
bounded artifact-host reachability probes and sanitized failure output while
preserving the startup exit status. This is a diagnostic candidate, not native
acceptance. Locked CLI 2.115.0 top-level start/help uses legacy Docker; the repo
does not select the current documented experimental native runtime. Actual
CircleCI UID/architecture/glibc, startup error, downloads, Postgres, Auth and all
53 migrations still need remote evidence. No runtime switch, dependency change,
root workaround, health bypass or hosted database operation is included.
Local verification passes two log-redaction tests, parsed workflow comparison
(all other gates unchanged), Bash syntax and simulated success/failure exit
paths, lint and both typechecks. Application build inputs remain unchanged.

REDESIGN-009.1 follow-up: CircleCI confirmed the npm-cache fix at `ca86b31`,
then exposed host-dependent Windows model-path basename handling on Linux.
Transcript model metadata remains filename-only; execution retains the full
configured path. The four path-form regression cases, media suite (22), full
worker suite (36), worker typecheck and build pass. Remote full-workflow/native
acceptance remains pending on the new candidate recorded in the final handoff.

REDESIGN-009 LOCAL VALIDATION VERIFIED / PUBLIC RELEASE GATES OPEN

Dedicated `codex/redesign-009-release-hardening` worktree from exact
`72b990e221a2c353697f8edb5f64466d115feb6c`; the dirty root and 008's generated
Next.js development-type change remain untouched. Main agent only, sequential
runners. REDESIGN-009.1 authorizes normal task-branch pushes for remote CI;
no merge, tag or visibility change is authorized. Scope is release
hardening, documentation, legal/provenance, reproducibility, CI, fictional demo
media, accessibility/browser/security and measured performance fixes; feature freeze.

The maintainer confirmed public redistribution of the project-created Stylus logo
and source raster, with no extra attribution. Baseline has no project LICENSE,
despite the brief's Apache assumption. Reviewed dependency license expressions
and existing OFL font provenance before adding canonical AGPL-3.0-only text and
package metadata. Initial version recommendation is `0.1.0-beta.1`: all packages
were 0.1.0 and no tags exist. Source-only third-party obligations are being recorded.

Gitleaks 8.30.1 all-reachable-history and Git-visible candidate-tree scans have
zero findings. Current text/path review finds no known private business/project
reference, tracked environment or QA artifact; one personal Git author mailbox is
flagged for maintainer review without rewriting history. Final-candidate scans
remain required. Compatible dependency updates address reported critical/high
runtime issues; seven moderate lint-tooling findings have a documented controlled
development-only reachability assessment. The final sequential runtime run passes
267 web files / 1,531 tests and 32 worker tests. Lint, both typechecks and full
formatting pass. LF checkout rules fix Windows autocrlf-only formatter failures
without changing canonical Git source or binary assets.

The isolated SQL runner uses real pgcrypto, no privilege aliases, no environment
or hosted connection. It passes all 30 suites / 1,115 assertions over 53 migrations.
The pre-008 upgrade preserves organization/Task/Board/object data and permitted
authenticated edits. All 71 organization-keyed tables have RLS; all 149 application
security-definer functions pin empty search paths. See docs/RLS_REVIEW.md.

Mirroring Supabase default grants exposed the original Boards migration's missing
table-level revocation. Its identity-update denial assertion failed. A read-only
hosted query confirms broad anon/authenticated grants there. New forward-only
`20261115000100_board_explicit_browser_grants.sql` removes those grants and
restores existing permitted columns, including stable upload IDs. No data, RLS,
RPC or applied migration changes. Six new ACL checks pass; two anonymous-read
assertions require the stronger 42501 outcome. The supported linked dry run lists
only this correction. The owner authorized application and the exact fictional
demo; the correction is now applied. All 52 hosted versions match; explicit
column/RPC checks pass. No applied migration was rewritten.

The production worker/web build passes with optional AI/providers absent.
Chromium, Edge, Firefox and WebKit pass eight public production-browser checks:
semantic/axe checks, Skip/Enter focus, responsive widths, themes and reduced motion.
Native Windows WebKit requires explicit zero tabindex for skip-link Tab access;
the main target is focusable. A sandboxed Firefox crash was rerun successfully
with normal process permissions. Authenticated demo/media and actual Task/Board
transport measurements now pass: all 12 final four-engine smoke checks, 64
authenticated responsive combinations, Task failure/retry and real 50+5 comment
pagination. Three-sample same-fixture comparisons reduce decoded Task documents
from 656,412 to 275,882 bytes and median related/discussion readiness from 8,818
to 3,320ms. Actual 200/300/500-object Board checks and detailed creation/group/
menu/upload/persistence flows in Chromium, Edge, Firefox and WebKit pass. Two
fictional users converge through private Realtime; VIEWER remains read-only.
Memory filter labels, real PostgreSQL cursor offsets and unnecessary Board
subscription restarts are corrected. Board cursor decoration is hidden from the
accessibility tree; low-zoom inline edit targets have individually measured
same-page equivalent controls. See RELEASE_AUDIT for raw-finding interpretation.
Eight screenshots, two GIFs and two decoded/seeked masters show actual fictional UI.

Exactly three users and one organization were used. The final exact-ID inventory
contains 1,096 rows across 33 demo tables; every created object/image ID is recorded.
All four exact private image assets were removed and verified absent. The existing
organization-deletion RPC then failed with a membership/Board FK ordering error;
that transaction rolled back and no accounts were deleted in that attempt.
Guarded cleanup initially stopped for separately requested approval of the forward
`20261115000200_atomic_organization_deletion.sql` repair. Its 16 root tenant
cascade links and 133 deferrable reference changes preserve existing keys, initial
modes and records on deployment. History remains immutable while its organization
exists; owner/name checks and RLS remain. Populated Core/Research/Performance/
Council deletion and all permanent isolation/immutability tests pass locally.
The owner separately approved it; the supported dry run listed only this repair,
and deployment is complete. All 53 hosted versions and Board column/RPC checks
match. Guarded cleanup then succeeded: all 1,096 inventoried rows, the exact demo
organization and all three Auth accounts are verified absent. The four exact
Storage assets are absent. Non-demo aggregate account/org/provider counts match
before and after; no full existing-content fingerprint is claimed. No AI or
provider was invoked. The password and task-only hosted/browser credential copies
are removed; the application uses restored placeholder configuration.
Final lint, both typechecks, worker/web production builds, SQL/upgrade, license
inventory, formatting, links and redacted current/history secret scans pass.
The registry audit passes its high-severity gate with seven documented moderate
development-only findings and zero high/critical findings. A fresh temporary clone
with no inherited modules/environment/build output passes `npm ci`, placeholder
example configuration, formatting, links, license inventory, both typechecks,
worker/web builds and eight public checks across all four engines. Its tracked
tree stays clean. Full native authenticated setup remains pending as stated below.
Runtime/test/schema/package inputs are frozen; final documentation records these
results. The final handoff and ignored verification manifest identify the exact
release-candidate SHA. No major new feature or external provider execution was added.

Automatic review rejected a broad existing-data fingerprint query; it was removed
before execution. The permitted alternative records only aggregate account/org/
provider-connection counts. Non-demo counts match; no full content comparison is
claimed. Do not retry the rejected broad query or inventory existing tenants.

The owner reports WSL/Virtual Machine Platform caused a Windows boot failure and
were disabled. Do not enable them, require Docker or repeat requests to install
local Supabase. Only Docker-dependent full local Supabase authenticated clean-
install checks are pending for that reason; isolated SQL, database CI, public
clean-clone documentation and all independent work continue. These pending checks
must not be reported passed. Remote CI also requires a later separately authorized
push. See docs/RELEASE_CHECKLIST.md for the initial checklist and open gates.

## Prior accepted phase

REDESIGN-008 PASS / ACCEPTANCE CLOSED BY REDESIGN-008.1

Dedicated `codex/redesign-008-integrations` worktree, exact clean 007 base
`6ce67b97ef098c709b8bce02aded0835f1469cc6`. The verified predecessor follow-ups
were committed before branching; root/user changes are preserved. Main agent
only, sequential work, no merge/push. Approved scope is GitHub organization App
access, user-private Drive/Calendar and explicit references on five existing
entity types, with one confirmed Calendar event write. Boards/AI remain frozen.

Audit: existing organization context/RLS, service-role client, public canonical
entity registry/provenance, trusted plugin host and shared UI are reused. No
existing OAuth/encryption helper was found. Plan: server-only AES-GCM credentials,
one-time browser/user/org-bound PKCE, additive RLS migrations, bounded adapters,
Settings management and lazy connected-resource UI, focused security/provider
tests, then final regression/build and authorized hosted migration verification.

The owner's REDESIGN-008.1 brief records successful live GitHub, Drive and Calendar
QA, including real Calendar event creation. Those results remain valid: this
follow-up changes SQL fixtures/documentation only, with no provider, OAuth,
application, RLS or migration change. Live provider QA is not repeated. Exact
configuration remains in docs/INTEGRATIONS.md; no credentials or real resource
names are recorded here. REDESIGN-009 is not started.

## REDESIGN-008.1 acceptance closure

Started at `2bb3bed1f54a88e0805d148e23abe2334763eab0` on the existing branch.
The pre-existing generated `apps/web/next-env.d.ts` development-path change is
preserved and excluded from the follow-up commit. Main agent only; sequential
runners, no merge/push. No new hosted migration or retained test record.

Each legacy suite was run individually before repair. Original sources and all
49 migrations were also loaded directly from baseline
`6ce67b97ef098c709b8bce02aded0835f1469cc6`, without resetting the checkout.

| Suite | Original current tree | Baseline | Same root cause |
| --- | --- | --- | --- |
| Ask Council | FAIL | FAIL | YES |
| Competitor analysis | FAIL | FAIL | YES |
| Windows Workers | FAIL | FAIL | YES |

These are invalid original fixture assumptions, not integration regressions or
legitimate product semantics superseded since the tests were written:

- Ask Council first stops before assertion 1: `public.has_*_privilege` does not
  exist (`42883`). Catalog functions belong to `pg_catalog`. Diagnostic aliases
  exposed assertion 14's integer argument to the existing `smallint` specialist
  RPC (`42883`) and the later invalid uppercase `UNKNOWN` enum (`22P02`), which
  also aborts assertion 23's query. AI migration `20260825000900` has always used
  lowercase `unknown`; Ask Council migration `20260825002000` already declared
  the smallint parameter. Repairs use the actual namespace/type/enum. Counts,
  mutation probes and conversation lookups now target the fixture organization,
  retaining every role, immutability and tenant-denial assertion. This also fixes
  seven hosted failures caused by unrelated pre-existing conversations.
- Competitor assertion 10 expected composite-FK rejection `23503`, but received
  plugin-denial `42501`: Org B's Marketing plugin was never enabled. Its own OWNER
  now enables it, so the original cross-tenant FK assertion reaches its intended
  constraint. Assertion 15 then stopped on the private job registry: migration
  `20260825001100` already revoked browser access before the competitor suite was
  introduced with `20260825001400`. Only read-only deployment/bucket inspection
  uses the test owner; authenticated role is restored for archive/restore. Catalog
  privilege calls use `pg_catalog`. An added assertion proves browser registry
  reads remain denied; no browser mutation is moved to service-role access.
- Windows Workers originally appeared to stop on missing `paired` (`42P01`).
  The prior local bootstrap stripped pgcrypto and supplied only digest, so valid
  pairing assertion 8 failed first on missing `gen_random_bytes` (`42883`). The
  installed PGlite package's real pgcrypto extension is now loaded for local QA,
  without stubs or privilege aliases. Native hosted PostgreSQL and the baseline
  with real pgcrypto reveal the actual fixture defect: assertion 21 cannot read
  the service-owned temporary credential table as authenticated (`42501`), so
  revocation never occurs and assertion 22 sees no exception. A separate temporary
  table exposes only the worker ID to the authenticated OWNER. The original real
  revoke and revoked-credential checks pass; an added check denies credential-table
  reads to that OWNER. Worker runtime and permissions remain unchanged.

Hosted integration regression additionally exposed three global cache counts
that assumed an empty backend. Those lifecycle assertions now count only their
fixture connection. Unscoped authenticated visibility checks remain unchanged,
preserving their ability to detect foreign/private rows. All 54 assertions pass
locally and hosted, including GitHub tenant isolation, private Google connections,
VIEWER writes, target authorization, revoked membership and cross-tenant denial.

Final SQL gate: **29/29 suites, 1,018 assertions, no skips/expected failures** in
isolated PGlite PostgreSQL with pgTAP, real pgcrypto and all 51 repository migrations.
No public privilege aliases or crypto substitutes are used. Focused legacy totals
are 35/23/23; related AI/creative/jobs/plugin coverage also passes. Hosted native
rollback-only checks pass Ask Council 35, Competitor 23, Workers 23 and integration
54. The hosted full-gate attempt was stopped when nonempty-database assumptions
surfaced; the complete gate is the isolated run, not a claim of 29 hosted passes.
All hosted suites roll back; no external provider calls are made by these tests.
Focused integration web coverage passes 10 files / 92 tests. Full web and worker
runtime suites are not repeated for SQL-only repairs; their implementation-commit
results below remain valid. Final lint, web/worker typechecks and the worker/web
production build pass. Scoped formatting, diff, secret/artifact and migration
hash/51-version ledger checks are recorded with the final follow-up review.
Final review covers 11 scoped files, 37 local documentation links and 59 production
client chunks; formatting, whitespace, secret and artifact checks pass. All 51
migrations remain unchanged and match the hosted ledger. A read-only hosted probe
confirms zero retained organizations at the eight exact closure-fixture IDs.
No security assertion is weakened, policy broadened or VIEWER write enabled.
REDESIGN-008 is ready for review; REDESIGN-009 may be planned but is not started.

## REDESIGN-008 implementation verification

Delivered: restrained Settings → Integrations; organization GitHub App/user
intersection and explicit repository selection; separate private Drive/Calendar
grants; shared references on Task/Milestone/Note/Hypothesis/Experiment; debounced,
paginated metadata pickers and batched lazy resolution. Versioned AES-GCM secrets,
browser/user/org-bound one-time PKCE and fixed callbacks protect authorization.
Generation checks protect disconnect; 60-second server/client metadata expiry and
local failure states prevent indefinite stale titles. Confirmed Calendar creation
uses account-bound durable receipts and deterministic event IDs, including recovery
after reopening. No automatic synchronization, ingestion, new AI or Board changes.
Home's optional upcoming widget is deferred to preserve its attention hierarchy.

Database: exactly two reviewed additive `202611110001*` migrations applied through
the supported CLI. All 51 hosted/local versions match and reviewed hashes remain
unchanged. Hosted catalogs confirm six RLS tables, five target types, two member
RPCs and three service-only RPCs. No reset/DROP/TRUNCATE or existing-record rewrite.
The new 54-assertion suite passes locally and hosted with transaction rollback;
five relevant SQL suites pass 246 assertions. Real Supabase Auth JWT smoke passes
13 persistence/isolation/role assertions using fictional task-only fixtures.

Focused validation passed 200 tests across 33 files, followed by 15 passing UI
tests after hook cleanup and 13 passing navigation/discoverability tests. The
complete corrected web run passes 264 files / 1,512 tests with one worker. An
initial candidate run exposed lost direct trusted-App discoverability; the
existing Apps link was restored alongside Integrations and the strict inventory
extended. No test was weakened. Worker tests pass 5 files / 32 tests. Final lint
and both typechecks pass; the final worker/web production build passes.
Production-bundled actual-component browser QA uses synthetic provider/Next
transport: 14 width/theme combinations (320/390/430/768/1024/1440/1920), seven
interaction/permission/failure flows, no overflow/console errors, keyboard popup/
modal/focus checks and 15 small fixture-only performance samples. Actual production
Next/Supabase browser checks pass for OWNER and VIEWER with optional providers
unconfigured, zero provider requests and usable Task details. This does not prove
live OAuth consent, real external permissions, provider latency or manual NVDA.
Final production-build browser checks pass for both roles. All four isolated test
accounts and both organizations are deleted through exact scoped ownership checks;
13 follow-up checks confirm no task rows, credentials or cached metadata remain.
Task-only Next/Vite servers and Chrome are stopped; the verified task Chrome
profile is removed. No real provider records or personal accounts were used.

Final file review: 56 scoped files (36 new), 45 local Markdown links validated,
59 production client chunks checked for actual server secrets, scoped formatting
and `git diff --check` pass. No environment files, private credentials, logs,
browser profiles, screenshots, generated bundles or QA harnesses are included.
Generic Board/worker/dependency files remain unchanged. All 51 migration versions
still match after cleanup; applied migration hashes are unchanged. No merge/push.

The initial expanded SQL audit stopped in three suites and used local catalog
aliases. Its 26/29 result is superseded by the complete alias-free 008.1 gate above.

POST-REDESIGN-007 INTERACTION / METADATA POLISH COMPLETE / VERIFIED

Tasks navigation follow-up: Milestones now uses the same view-link renderer and
explicit no-underline styling as other Tasks views. Only the selected view receives
the primary border indicator and `aria-current`. The 19 existing Tasks tests,
lint, web typecheck and production web build pass. No data or permission changes.

Placement cursor stability follow-up: FIXED. Creation uses a 20px screen-space
SVG crosshair with fixed dark centre/white halo; native cursors are hidden only
inside placement. Its paint persists through drawing and viewport/theme changes,
and unmounts on finish/cancel/tool switch. Image requests restore canvas focus;
native file-chooser cancellation also clears placement with a cleaned-up listener.
Escape from canvas navigation buttons also cancels placement; editing fields and
dialog/popup keyboard handling remain guarded.
All 32 focused placement/workspace tests pass. Automated Chrome records 266
unchanged hover samples over 31 seconds per theme, plus drag, content hover,
10/100/400% zoom, same-session theme/zoom/fit changes and all reset paths.
Lint, web typecheck, production build and scoped formatting/diff checks pass.
QA uses actual components with synthetic transport; no hosted records change.
Temporary browser/server helpers are stopped. The earlier Tasks tab fix is preserved.

## Final interaction and metadata polish (post-REDESIGN-007)

Small authorized follow-up on the same branch/worktree, starting at
`f1d83a044de4871e1e1da46ca2efcce5688fba58`. The completed 007 systems and original
checkout remain preserved. Main agent only, sequential runners; no merge/push.
Plan: isolate ephemeral placement feedback, reuse existing creation/coordinates/
guides, add bounded drag geometry and local picked-image staging, improve only
new Shape defaults, and use Next metadata with a tenant-authorized Board title.
No schema, persisted existing-object or workflow redesign is authorized.

Delivered: local constant-size cursor cues, precise tool cursors, six-pixel click/
drag distinction, world-space Shape/Line/Arrow/Section drawing, existing snapping,
Shift constraints and one-shot create/history. Text enters the existing editor.
Picked image files remain local until placement, with actual blob thumbnails,
safe fallback and URL cleanup. Only new Shapes receive visible theme defaults.
Next metadata covers all 34 existing pages (33 static, one authorized named Board),
with bounded plain-text titles and a stable Board fallback. No database changes.

Affected regression coverage spans 68 files / 396 tests: 395 passed initially;
one legacy upload test expected immediate upload on file selection. It now also
asserts zero uploads before placement. The corrected Workspace/placement/title
rerun passes all 35 tests across three files; no failure remains. Eleven new
tests cover geometry, release-only creation, cues/fallback and title authority.
The complete web suite is not repeated for this bounded patch; the unchanged
baseline's full 252-file / 1,409-test result remains recorded below. Relevant
Board/layout/metadata coverage, lint (zero warnings), worker/web typecheck and
the final production build pass. Worker and database code remain unchanged.

Actual production-bundled component browser QA passes 11 flow groups, six zooms
in both themes (10/25/50/100/200/400%), responsive 390/768/1440px checks, touch-style
placement, cancellation/undo/read-only safety, real local image previews and
selected/unselected Shape paint with grid on/off. Boundary contrast exceeds 3:1
in both themes; prior Shape colors remain unchanged. These checks use explicit
synthetic actions/reads/Realtime, not hosted writes. Five additional checks against
the actual production Next server verify public titles, client navigation and
safe unauthenticated Board entry. Tenant/RLS/fallback metadata tests pass.
Helpers and isolated browser storage are cleaned up. No backend fixtures created.

Scoped formatting, all 34 route/title declarations, 57 local Markdown links,
whitespace and secret/artifact review pass across 57 changed/new files (48
source/test/style files). CSS formatting only normalizes line endings beyond the
four new token declarations. No schema/dependency/provider/worker changes, subagents,
merge or push. This is a small completed follow-up, not REDESIGN-008.

Limits: image drag sizing and center-origin modifiers are deferred. Named entity
metadata is Board-only; Competitor keeps a safe generic title rather than adding
plugin data reads. Manual NVDA, physical devices, other browser engines and fresh
authenticated hosted metadata/persistence smoke tests were not performed here.
The existing hosted persistence baseline is preserved, not claimed as a new run.

## REDESIGN-007 - Core execution and startup essentials

Clean dedicated worktree/branch `codex/redesign-007-core-execution`, starting at
`6afe70c7ffa07b61187ebc8eefd304318de02fba`. Original checkout and completed
worktrees remain untouched. Main agent only, sequential runners; no merge/push.
The inspected audit/decisions and implementation plan are in
[Core execution](docs/CORE_EXECUTION.md). Dependencies, minimal Milestones and
Core working Notes are justified by absent existing models. Goals are deferred.
Onboarding keeps its eight-step canonical content and manager authorization;
recoverable bounded drafts do not become Company Knowledge or AI context.
No new AI execution. Generic Board changes are limited to the explicit
continuation's menu/input/card fixes. The final fresh complete web suite must
include all fixes and the retained route/navigation inventory assertions.

Checkpoint: three reviewed forward migrations are applied to the authorized
development backend; all 49 ledger versions, five RLS tables, 15 authenticated-only
RPCs, private helper grants and retained Board columns/RPCs are verified. Applied
hashes are unchanged. Thirteen related local PostgreSQL/pgTAP suites pass 455
assertions (140 new). Existing anonymous-access fixtures now assert actual denied
table grants; invitation revocation uses its public list RPC and onboarding test
arguments use the real smallint signature. No security assertion was weakened.

Actual production-built browser onboarding completed in a new isolated task
organization: initial validation, incomplete-member waiting, partial resume,
offline failure/retry, step jumps, zero competitors, Review Edit and Finish to
Home. No automatic Memory. Real Task creation, dependency, Milestone association,
filtered progress, working Note links and edited explicit Memory promotion have
persisted. Browser QA identified an early-hydration draft baseline race and a
Note locale hydration mismatch; both fixes have focused regression tests.

Hosted Core checks pass 20 assertions, including concurrent cycle denial. Actual
Growth creation/linking, exact Task/Experiment/Hypothesis/Evidence openers, Home
evaluation/Learning attention, draft Keep/Discard conflicts, native Note insertion
and invitation acceptance to Home pass. The initial responsive matrix passes 192
cases; the changed shared controls receive additional current-build checks.

The explicit continuation authorizes shared form selects, context-menu input/
screen-space/collision fixes, Delete/Backspace safety and native card presentation.
Generic Board changes are limited to those approved UI/input paths; persistence,
entity contracts, selection semantics, voting and Presentation contracts remain.
The shared popup is extracted into UI, retaining Board-specific configuration at
its wrapper. Browser testing found and fixed nested-popup Escape and transformed
modal positioning, with permanent focused coverage. Real selects and all seven
Board zoom levels pass. Real Delete/Backspace/undo, locked/VIEWER/Presentation
safety, boundary/modal cases and archived/unavailable card states also pass.

The changed-control matrix passes another 96 cases. Practical production-built
hosted samples cover 505 Tasks, 501 Notes, filtered/detail/Back and internal setup
navigation. Full Task payload is about 1.57MB decoded and complete related work
takes roughly 5.5s; these are profiling limits, not speedup/SLA claims. Manual NVDA,
physical devices and other browser engines remain unperformed checks.

Exact task fixtures are cleaned up: four Auth accounts (404), two organizations,
two Boards/20 objects, 506 Tasks, 502 Notes, two Milestones, their dependent joins,
synthetic Growth/Evidence/run/cancelled-job rows and one explicit Memory are absent.
Both immutable history triggers remain enabled. Task Chrome/Next helpers are
stopped and fixture credentials/storage cleared. No unrelated data was removed.

Final complete web suite: **252 files / 1,409 tests PASS**, one worker thread,
after all corrections. An initial incomplete attempt exposed native-select and
Settings inventory assertions; a complete pre-correction run then found two
remaining page fixtures (disabled policy and onboarding draft request context).
All retain their payload/discoverability/edit/redirect checks. Focused reruns pass
11 files / 69 tests and both page files / three tests. The final suite includes
every correction, without skipped or weakened assertions. All 130 final
source/test/SQL hashes remain frozen. Lint (zero warnings), worker/web typecheck
and the final worker/web production build pass. Workers are otherwise unchanged;
no worker test rerun is required. Scoped formatting, 56 local Markdown links,
all 34 pages/three retained entrypoints, whitespace and credential/artifact checks
pass across the 141-file delivery. Applied migration hashes remain unchanged.
The task-local environment copy is removed after building; original environment
files remain untouched. REDESIGN-007 is PASS and ready for user-managed review.
No subagents, merge or push. REDESIGN-008 is ready for its own approved scope and
has not started. Performance/manual-environment limits above remain explicit.

## REDESIGN-006 - Startup growth and learning workflow

Dedicated branch/worktree `codex/redesign-006-growth-learning` starts exactly at
`82d854afca2f2a91162c70a5b6bf37694c0f857a`. Root and completed task worktrees,
including the user's generated `next-env.d.ts` change in 005, remain preserved.
Main agent only, sequential runners. No merge or push.

The existing-domain audit is in [Growth and learning](docs/GROWTH_LEARNING.md).
Content Opportunities remain immutable report candidates; deterministic
Performance Learnings retain their metric-specific semantics. Focused new
Marketing Hypothesis, Experiment and team Learning records are implemented.
Evaluation stays on Experiment and freezes its result/source identities.
Explicit Company Memory promotion delegates to the existing Core human mutation
through an additive idempotent public SQL contract. No automatic promotion/AI.

Four reviewed forward migrations are applied to the authorized development
project. All 46 ledger versions match; schema/RLS/RPCs and unchanged hashes are
verified. Thirteen related SQL suites pass 527 assertions in isolated PGlite,
including 102 new growth assertions. Real authenticated and browser checks pass
the workflow, native recovery, exact openers and role/tenant/revocation boundaries.
Overview/Research/Experiments/Create/Campaigns/Learn navigation and bounded
workspaces are implemented. Native providers and existing-receipt
conversions extend only public integration contracts; generic Board mechanics,
voting, presentation and existing AI workflow inputs/execution stay frozen.

**Verification:** the full web suite ran once: 236 files / 1,330 tests; 1,328
passed and two outdated route/navigation inventory expectations failed. Those
expectations now explicitly cover all 30 retained routes plus three growth pages,
six primary workflow entries and retained capabilities. The final focused rerun
passes all nine tests across those two files and the dialog-focus regression.
All observed failures are resolved; no duplicate full-suite run or skipped test.
Web lint (zero warnings), worker/web typecheck and final production web build pass.
Scoped formatting, local links, retained routes, diff and secret/artifact checks
are recorded in ignored `.next/cache/redesign-006-qa` evidence.
Default staged `diff --check` reports one extra EOF blank line in the already
applied `20261109000110` migration. Its bytes/hash are deliberately preserved.
All other files pass the default check; that file passes with only the
`blank-at-eof` rule disabled. This formatting exception changes no SQL semantics.

Production-built actual pages against the hosted development backend pass the
explicit workflow, edited Memory confirmation, canonical backlinks, typed link
pickers, exact immutable openers, native insertion/conversion/reload recovery,
VIEWER/foreign/plugin-disabled/revoked-member checks. Responsive QA passes nine
surfaces × eight widths × two themes (144 cases), plus 64 targeted repeats for
the mobile search-row fix and modal bounds/labels/focus. Direct-create closing
clears query state, restores a usable opener and permits native Enter reopening.

Three samples per representative fixture cover Overview, 100 Hypotheses,
110 Experiments, 100 Learnings, filtered search/detail and a 500-object mixed
Board with 50 distinct native references. Lists stay at 25 records; metadata uses
one 50-reference batch. Observed list readiness is 0.83–1.12s, Board readiness
1.40–1.46s and full native metadata 4.76–4.90s. Board load has 3–4 Long Tasks per
sample (maximum 161–207ms); no list Long Tasks were observed. These are unthrottled
warm-server observations, not p95, an SLA or controlled before/after claims.

**Cleanup verified:** four task accounts (Auth 404), two task organizations,
three Boards/521 rows, 321 growth records plus joins/canonical/provenance fixtures,
two explicitly promoted memories and four receipts are absent. Four immutable
history triggers were restored in the same locked exact-ID cleanup transaction
and verified enabled. No unrelated data or private assets were deleted. Both
task-local Next/Chrome helpers are stopped; ignored test passwords are removed.

**Limits/deferred:** manual Windows NVDA, physical touch devices and other browser
engines remain target-environment checks. Native metadata still has measured
type-grouped read latency; full cold/warm profiling belongs to 009. No new AI,
generic Result/analytics platform, automatic Memory, anonymous voting, native
source replacement or future business module is delivered. REDESIGN-007 is not
started or authorized by this completion. No merge or push.

## REDESIGN-005 - Native Stylus entities in Boards

Dedicated branch `codex/redesign-005-native-board-entities`, starting exactly at
`8236b471592023faf6aa3b0136344071f7c93bcf`. Original checkout and completed
004.* worktrees are preserved. Main agent only, sequential runners; no merge/push.

Delivered: public Core reference/provider/projection/open/create contract, trusted
plugin composition, six initial card adapters, exact immutable Evidence binding,
private batched resolution, canonical openers and reviewed Task/Idea/manual
Research Note conversions. Durable own-creator receipts recover failed linking,
lost successful responses and reload without duplicate targets. Sources remain;
explicit card archival and newer collaborator rows survive recovery. Manual Notes
remain an existing separate domain. No AI or Knowledge promotion is introduced.
Generic editor mechanics/design, voting and presentation architecture stay frozen.

All three reviewed `202611040002*` forward migrations are applied to the authorized
development project; all **42** local/remote versions match. Existing Board V2
columns/RPCs and new receipts/domain RPCs were verified. No reset, DROP/TRUNCATE
or unrelated hosted records were changed. Exact test-fixture cleanup verified
absence of four accounts (including Auth 404 checks), two organizations, four
Boards, 1,030 Board rows, 83 remaining canonical fixtures, nine immutable source/
Evidence rows, one cancelled synthetic run/job and their scoped dependent data.
Both immutable triggers are enabled. No model/worker job was executed or private
asset uploaded. Task helpers are stopped; ignored evidence is never shipped.

**Verification:** full web suite run once near completion: **227 files / 1,292
tests PASS**. All six Board pgTAP suites pass against actual SQL in isolated
PGlite: **246 assertions** (201 existing plus 45 native-reference/recovery).
Web lint, worker/web typecheck and production web build pass. Scoped formatting,
links, architecture/security/scope/secret/artifact and final diff checks pass.

Real authenticated Supabase/browser checks cover all six inserts/openers, all
four conversions, retry/reload/lost-response recovery, deleted-target refusal,
tenant/role/revoked-member/plugin boundaries, archive labels, stale-title/search
purging and re-enable. Shift-selection, Groups/Sections, alignment/distribution,
lock/layers/duplicate, reference-only paste, actual comments/reactions and existing
voting/presentation pass. Native voting remains deliberately ineligible.
Both themes pass **16** responsive cases at 320/390/430/768/1024/1200/1440/1920px;
keyboard/focus restoration and real touch-emulated picker checks pass.

Three local production direct-entry samples per fixture show median canvas-ready
times of 1,846ms at exact baseline vs 1,483ms current for 500 ordinary objects;
500 objects including 50 native cards take 1,527ms. All 50 fresh authorized
projections resolve at median 4,423ms through one discovery plus one 50-reference
batch, with no resolution Long Tasks. Selection/search medians are 31.8/21.7ms.
Existing canvas virtualization is retained. These small samples are observations,
not cold/warm percentiles, causal speedup claims or SLAs. Manual Windows NVDA,
other browser engines/devices and hosted end-to-end percentile budgets remain
unverified. Optional source replacement/native voting, AI conversion, storyboard,
follow/history, anonymous voting and richer connectors remain deferred.
REDESIGN-006 is ready for its separately approved scope and remains unstarted.
See [Native entities](docs/NATIVE_ENTITIES.md) for the contract and binding matrix.

## REDESIGN-004.3.3 — Board voting, Section presentation and visual color picker

Branch `codex/redesign-004-3-3-voting-presentation` starts at
`1e7b8a1e3d41744603ad715bd924dc16e33b2d38`. Original checkout and completed
004.3.2 remain preserved. Main agent only, sequential runners; no 005, AI/native
cards, merge or push. Existing fixtures/work were continued, not recreated.

Delivered: visible voting with default 3 / bounded 1–5 own slots, multiple votes
per object, one active session, fresh role/tenant authority and SELECT-only RLS.
Version/request identities protect real concurrent/delayed requests. Private
revision events refresh bounded summaries/results; own-only optimistic rollback
retains newer remote counts. Ending freezes casts/removals. Presentation uses
existing Sections in Layers order, the same mounted canvas/fit path, read-only
input guards, keyboard/touch controls, optional fullscreen and editor restoration.
Remote content/order/removal preserve appropriate active context without a slide
model. Visual popovers provide S/V, hue/alpha, HEX/presets/Shape None, per-object
previews and one commit per completed gesture. Nested Escape retains Properties.
Native EyeDropper is feature detected; Pick from Board is explicitly deferred.

Both reviewed forward migrations are applied:
`20261104000100_board_voting.sql` and
`20261104000110_board_voting_conflict_response.sql`. The latter corrects the
observed hosted PostgREST retry timeout with PT409, preserving the applied
original, existing records, locks and grants. All **39** ledger versions match.
Existing Board columns/template-operation RPCs, both new tables and four voting
RPCs were explicitly verified. No reset, DROP/TRUNCATE, seed/role application
or unrelated hosted data deletion occurred.

**Verification:** full web suite run once near completion: **220 files / 1,266
tests PASS**. Focused Board coverage passed 53 files/332 tests before the final
read-transport addition; its nine client/route cases also pass in the full suite.
All five Board pgTAP suites pass in isolated PGlite: **201 assertions**, including
63 voting assertions and result pagination/caps. Web lint, typecheck and ordinary
production build pass. Scoped formatting, links, secret/artifact/scope scans and
final diff checks are part of the recorded delivery review.

Hosted smoke passes ten lifecycle/concurrency/security groups. Real two-user
UI voting, injected rollback/recovery, ending/results, presentation/input/
fullscreen/restore, live Section updates/reorder/archive/restore, color gesture
preview/commit/reload, VIEWER, safe links/touch and accessible names pass. Both
themes pass all eight required widths. New private HTTP voting reads preserve
fresh shared authorization but bypass the mutation Server Action queue; real
member/foreign/revoked/signed-out boundaries pass. This corrects a measured save
delay without changing permissions. Absent sessions are not reread just by panning.

500-object production probes cover drag, Layers, Section focus, presentation and
realtime voting. Individual vote updates render zero object bodies; color
previews render one. Lightweight interaction probes show no repeatable new
regression; final valid save observations are 3.124/2.462/1.825s against baseline
3.101/2.550/1.895s. One 51ms Long Task appears in the final current trace. Small
samples/hosted variation are not SLAs; diagnostic overhead/outliers and existing
initial-render/marquee limits remain explicit in docs/BOARDS.md.

Exact cleanup verified absence of four task users, two organizations, three
Boards, 522 objects, three private assets, 25 votes and 11 sessions, including
user 404 checks. Task helpers are stopped. Evidence/scripts/screenshots and the
now-deleted-account credential inventory stay ignored under
`.next/cache/redesign-004-3-3-qa`; no secrets/artifacts/dependencies are delivered.

**Limits:** native OS EyeDropper capture, manual NVDA and other browser/device
engines remain target-environment checks; headless Chrome plus deterministic
API-contract tests do not claim those sessions. Pick from Board, full voting
history analytics, public presentation URLs and new slide entities are deferred.
Generic Board editor scope is frozen; REDESIGN-005 is ready for its own approved
public entity/provider/conversion brief and is **not started**.

## Previous verified milestone

REDESIGN-004.3.2 COMPLETE / VERIFIED / READY FOR USER-MANAGED REVIEW

## REDESIGN-004.3.2 — Boards UI and input polish

Branch `codex/redesign-004-3-2-boards-ui-polish` starts clean at
`9e678586dd34b87dcd1e8fcc0712fc8aad0ffd58`, in its own matching worktree.
Main agent only; original checkout and other worktrees preserved. The continuation
brief adds direct Group-child drill-in; all original requirements remain in scope.
No schema change, REDESIGN-005, AI/native cards, merge or push is authorized here.

Implemented and verified: 15 local OFL Board families (12 added
from official Google Fonts with license/source/hash records), categorized search,
supported weight selection, editable numeric presets and compact exact-HEX color
controls. Board-local overlay controls replace native Properties selects and
the persistent View details menu. Properties uses a 320px desktop dock and hides
empty Text Appearance. Bare-domain input normalizes at the user input boundary;
strict stored/action URL validation remains and malformed URLs fail safely.

Layers accepts valid Group insertion/extraction using existing parent identities
and atomic operations, with indexed destination checks and explicit no-drop/
Group/Section/reorder feedback. Natural wheel/touchpad panning and modified zoom
use existing React Flow input paths. Group context derives from canonical
selection: single click targets the Group; double-click targets the actual hit
child without entering text edit; a subsequent intended double-click edits text.
Escape returns to parent; sibling Shift selection, Layers expansion, child
Properties and inherited locks remain synchronized. Selection does not save.

Relevant verification: 45 Board files passed; the remaining new drop-cue file
passed its focused rerun after fixing JSDOM's synthetic DragEvent coordinates
(46 files / 279 tests in aggregate before two final regressions). Negative layer
projection and Space-pan regressions pass focused operation/Group tests. Existing
assertions for replaced native controls/old prohibited extraction now exercise
the approved behavior; security/persistence assertions remain. Web lint with zero
warnings, typecheck and the final production build pass. The single final full
web run passes **211 files / 1,206 tests** with one worker and no file parallelism
(726.78s); no skipped/weakened assertions or timeout changes. This includes all
46 Board files / 281 tests after the two final regressions. Scoped formatting,
local-link, secret/artifact, scope and diff checks pass. The requested commit is
`fix: polish Board properties and canvas input`; no merge/push or REDESIGN-005.

Authenticated production checks pass: all five Group child types, native topmost
overlap, sibling Shift selection, inherited locks, first versus subsequent text
double-click, no selection writes, actual text/geometry edits and reload with
ownership intact. Native HTML5 Layer drag inserts/extracts; Group bounds expand
without translating old children. Custom Text/Sticky/Shape colors, four normalized
link edits with unchanged title, invalid-scheme rejection, numeric preset/custom/
Escape/validation, View dismissal/navigation and font request checks pass. The
12-case light/dark 390/768/1024/1200/1440/1920 Properties matrix passes, including
paired control geometry, popup bounds and modal focus/Tab behavior. Native child
drag/resize, Shift-wheel, Space/H panning without writes, panel wheel isolation
and custom-color outside-blur saving pass on the final build.

Native QA found two corrected input defects: invalid fractional CSS frame layers
could intercept negatively ordered children; render-only integer projection
fixes the hit target. Space-pan could start an object drag; temporary draggability
and a committed-event guard now prevent it. Neither fix changes persistence or
the hierarchy schema.

Performance: ordinary production before/final runs complete all 72 phases each
across identical 200/300/500 fixtures, with zero browser exceptions. First-node
times are 1420/1435/1756ms before and 1472/1455/1658ms final. Single phase samples
vary (including four 59–68ms final 500-object marquee tasks); no general speedup,
p95 or latency SLA is claimed. Five matched empty-pane marquee runs per build
select 92 objects and write zero operations: nine total Long Tasks/max86ms before,
eight/max75ms after. Seven Layers collapse/expand trials per build record one
task each (136ms before, 99ms after); seven native Group drill-ins have zero Long
Tasks and retain mounted node DOM identity. The comparison found no new
repeatable interaction regression. Font browsing requests zero unused faces;
five representative selections request exactly those five local files, and a
Geist-only 500-object board requests zero Board font files. Details/limits are
in [Boards](docs/BOARDS.md).

Temporary helpers/artifacts live in ignored `.next/cache/redesign-004-3-2-qa`.
Authenticated QA used two isolated task accounts, one organization, four boards
(200/300/500 mixed objects plus a 14-object interaction fixture), seven private
assets and three comments. All were removed and absence verified, including
1,014 elements. Only checked task-owned Next helpers on 3345/3346 and task-profile
Chrome 9345 were stopped. Exact inventory/credentials/artifacts remain ignored;
no unrelated records or helpers were touched. Optional
font/color recents are omitted to keep this a finishing pass. Do not rerun the
download codemods or reset this worktree during continuation.

Limits: manual NVDA, physical touchpad feel and additional browser engines are
not claimed. Chrome native input/keyboard and responsive/modal checks pass.
Large initial-render/selection costs remain measured; small local samples are
not a p95, broad speedup claim or production SLA. Database schema/configuration,
dependencies, auth and other product areas are unchanged. Hosted writes were
isolated QA only and fully cleaned up. Ready for a separately approved
REDESIGN-005; no future feature was started.

## Previous verified milestone

REDESIGN-004.3.1 COMPLETE / VERIFIED / READY FOR USER-MANAGED REVIEW

## REDESIGN-004.3.1 — Large Board performance hardening

Status: **PASS — MEASURED INTERACTION HARDENING; LIMITS RECORDED**.

Branch `codex/redesign-004-3-1-board-performance`, isolated worktree
`.worktrees/redesign-004-3-1-board-performance`, starts exactly at
`2d767aa2bb743eed5497e2427304eebe12526d54` with clean status. Main agent only;
unrelated checkout changes preserved. Performance only; no schema changes,
product redesign, new features, REDESIGN-005, merge or push.

The historical 104/50 ms observations contained no stacks. The same 1,000-object
probe was reproduced with CPU/timeline attribution before application changes.
Ordinary-production diagnostics identify broad React host/SVG updates and
subsequent browser layout/paint; a reproduced 104.885 ms task is a React commit,
and a 51.858 ms task includes 32.26 ms Paint plus 5.108 ms Layout. Diagnostic React
profiling builds themselves add component-timing overhead, so those numbers are
not used as the shipped-runtime baseline. Lightweight ordinary production
measurements cover all flows at 200/300/500 objects, with no CPU profiler or React
timing logger. At 500, hover has repeated 50–96 ms tasks, search clear 175 ms,
marquee up to 180 ms and commit-time drag work up to 191 ms. Properties drafts
remain local. Raw traces stay ignored, outside product docs.

Implemented: stable committed event closures, shared canonical object lookup,
memoized Layers controls, structure/search projections, retained hidden trees,
offscreen-render containment and save-time event guards. A follow-up CPU trace
found repeated Zod errors for absent typography options during Section focus;
missing values now use the same validated defaults, with supplied values still
validated. Chrome also exposed a pre-existing root-list role issue; a presentation
role restores Section roots as tree items. No schema/server authorization change.

The final ordinary-production benchmark completes 72 phases at 200/300/500 with
no browser exceptions. At 500, hover/scroll/search/clear/Locate/Section focus/
pan/zoom/single and multi-drag/Properties commit/feedback/realtime/sidebar phases
have no Long Tasks. Marquee improves from 16 tasks / 180 ms maximum to 3 / 92 ms;
300 drops from 12 to 4 tasks with a 73 ms maximum. Initial document/render tasks
remain (221/163/190 ms at 200/300/500); first-node timings are variable and do not
establish a general speedup. Detailed before/after observations and limitations
are in [Boards](docs/BOARDS.md).

Verification:

- Focused Board suite: **40 files / 225 tests PASS**. Eight added regressions
  cover committed callback authority, structural/search cache invalidation,
  retained tree identity, save-time node identity and fresh Locate geometry.
- Full web: **205 files / 1,150 tests PASS**, sequentially with one worker. The
  initial default-worker run had 204 passing files / 1,149 tests and one
  five-second undo/redo timeout. The full serial rerun changes no assertions,
  skips, configuration or timeouts; no application/test workaround was added.
- Web lint with zero warnings, typecheck and ordinary production build PASS.
  Scoped formatting, local-link, diff, scope, secret and artifact checks PASS.
- Final ordinary-production browser QA: **36 accessibility/interaction checks**
  PASS, including all 500 tree items in both themes at 1200/1440/1920 px,
  keyboard traversal/rename, native persisted Layers reorder, search/tree
  retention and modal focus/reflow at 390/768/1024 px. **26 drag checks** PASS
  across seven cases including native Shift-click, stable grid/node/selection/
  handles, one save per release, held-save guard, write-free marquee and reload.
  **Six image/search checks** PASS: all 50 private previews load, unrelated
  selection retains the URL and three 356-match searches cap display at 50
  without Long Tasks. No browser exceptions in these final passes.
- Exact isolated hosted inventory was removed and verified absent: **two users,
  one organization, four boards, 2,000 elements, four comments and seven private
  assets**. No schema/reset/migration or unrelated records were targeted.
  Only checked task Next/Chrome helpers on 3344/9344 were stopped. Credentials,
  scripts, screenshots and traces remain ignored, never committed.

Limits: one before/final-after sample per phase/fixture; no p95 or general speedup
claim. Initial rendering, some selection/Properties layout shifts and marquee
remain measured costs. The historical unsaved stacks cannot be reconstructed;
reproduced paths are documented instead. Manual NVDA, Firefox/Safari and physical
device timing remain unperformed. No REDESIGN-005 implementation, merge or push.

## Previous verified milestone

REDESIGN-004.3 COMPLETE / VERIFIED / READY FOR USER-MANAGED REVIEW

## REDESIGN-004.3 — Boards interaction and creative usability

Status: **PASS — LOCAL AND REAL AUTHENTICATED VERIFICATION**.

Branch `codex/redesign-004-3-boards-interaction`, isolated worktree
`.worktrees/redesign-004-3-boards-interaction`, starts exactly at
`eff9568c4b39c3ebffdd4abf33ab35afa667c7a0`. Main agent only; unrelated checkout
changes preserved. No merge/push or REDESIGN-005 implementation.

Desktop Layers-left/Properties-right docks default open and collapse independently
with scoped device/account preferences. Bottom tools, View, quick actions, direct
Layers reorder/reparent/inline rename and keyboard tree stay synchronized with
canonical selection. Groups manipulate; Sections organize. Text uses lazy licensed
Geist/Lora/Geist Mono content controls, safe auto-height, local guides/snapping and
one-intent Alt-drag copies. Application chrome/brand and other feature areas stay
unchanged. Comments share the right slot, resolve/reopen without deleting history,
and use deferred bodies plus open-thread badges. Board-local search and Section
focus are included; voting/presentation/attached connectors are deferred.

Flicker investigation found lost measured node dimensions, save-time control
removal, competing Group-child drag selection and full editor RSC rendering from
list invalidation. Controlled identity/dimensions, root-only controls, explicit
drag selection and operation-only responses correct those paths. All seven
required production drag cases retain the same visible DOM nodes, grid, selection
and handles, with no confirmation jump, zero pointer-frame writes and exactly one
persisted operation after release. Synchronous DOM reorders still occur; zero DOM
mutations is not claimed. A small-fixture move response changed from 21,921 bytes
including unchanged Board content to 666 bytes containing the operation result.
A scoped content-free marker refreshes the list on return. Visible image signing
is independent from the 200-object feedback limit, preventing preview starvation
on large text-heavy Boards; signing stays bounded to 25 per request.

Section 39 of the 004.3 brief expressly authorizes the configured development
project the maintainer?s development project. Reviewed forward migrations
`20261103000100_board_reactions.sql` and
`20261103000110_board_comment_resolution.sql` were applied unchanged through the
supported linked CLI workflow. They preserve existing rows and enforce fresh
roles, composite tenant/object identity, idempotency and RLS. The final ledger and
read-only API diagnostic confirm all required columns/table and six operation/
template/feedback/count RPCs. No reset, DROP, TRUNCATE or unrelated data deletion.

Verification:

- Full web suite: **202 files / 1,142 tests PASS**. Final Board coverage is
  37 files / 217 tests, included in that full run; focused changes passed first.
- Web lint (zero warnings), typecheck and final production build PASS. Scoped
  formatting, diff/link/scope/secret/artifact checks are recorded below.
- Four permanent pgTAP suites: **138 assertions PASS** (34 existing + 59 V2 +
  24 reactions + 21 resolution) in isolated PostgreSQL/PGlite using repository
  SQL/minimal Supabase bootstrap. Hosted pgTAP still requires unavailable Docker;
  real hosted application/API checks are separate, not mocked transport.
- Production Chrome: **109** two-theme/eight-width layout/focus/shortcut checks,
  **36** seven-case drag checks, **25** Alt-copy/native Layers checks, **13**
  comments/search/typography reload checks, **11** image/recovery checks and
  **12** landing/navigation checks PASS, without unexpected browser exceptions.
  Real API role/tenant/revocation/anonymous checks: **10 PASS**; large-fixture
  readiness/pointer checks: **6 PASS**. Network errors deliberately induced for
  rollback are identified separately from normal browser exceptions.
- Isolated fixtures: two test accounts, two organizations, three boards,
  1,034 total active/archived elements, one comment and six private assets were
  exactly inventoried, removed and verified absent. No unrelated records targeted.
  Only this task's checked Chrome/Next helper processes were stopped. Temporary
  credentials/traces/screenshots/runners remain ignored, never committed.

Measured limits: the 1,000-object fixture contains 20 image objects sharing one
private asset. All 20 load after the viewport fix. Three sequential production
full-document navigations in one authenticated session observed first nodes at
6,181 / 3,647 / 7,070 ms; document transfer was 91,835 bytes and decoded document
1,599,172 bytes (excluding later JS/actions/images). These uncontrolled local
network/cache samples are not a cold/warm benchmark, p95, SLA or speedup claim.
A 100-pointer-move probe wrote zero operations and observed two Long Tasks
(104 ms and 50 ms). Large-document payload/initial rendering remains a measured
profiling opportunity, not a claimed solved performance budget.

Manual Windows NVDA and additional browser engines remain target-environment
checks. Keyboard, semantic names/tree, focus restoration, reduced motion,
320/390/430/768/1024/1200/1440/1920px reflow and both themes are automated/browser
verified. Font subsets use fallback for non-Latin scripts. Dense layer reorders
touching more than 200 rows reject safely. Existing owner organization-deletion
audit-FK ordering remains separately scoped; cleanup used only inventoried QA Board
rows before the existing owner deletion RPC. Native entities/conversions, AI,
anonymous voting, presentation, persistent attached connectors, repeated-duplicate
offset memory and global search are not introduced. REDESIGN-005 can proceed as a
separately authorized task using the current feedback surfaces.

Final repository checks: scoped formatting and local Markdown links PASS;
`git diff --check` PASS; 77-file scope/credential-pattern/artifact audit PASS;
font source hashes/byte sizes match. Dependencies, applied historical migrations,
unrelated feature code and original checkout changes remain untouched. Generated
Next type references are restored. These scans supplement review; they are not
a claim of exhaustive credential detection.

## Previous verified milestone

REDESIGN-004.2 COMPLETE / VERIFIED / READY FOR USER-MANAGED REVIEW

## REDESIGN-004.2 — Boards stabilization and UX polish

Status: **PASS — LOCAL AND REAL AUTHENTICATED VERIFICATION**.

Branch `codex/redesign-004-2-boards-stabilization` continues from
`f6fdf51882b299d24e538d385ae311e05b797043` in the existing worktree. The
previous uncommitted P0 patch was retained. Main agent only; original
checkout/other worktrees preserved; no merge/push or REDESIGN-005.

The owner explicitly superseded the earlier production restriction and
authorized the maintainer?s development project as this task's active development backend.
Supported CLI ledger inspection confirmed history through `20260825002020` and
exactly two missing migrations. The reviewed dry run listed only
`20261102000100_board_v2_element_types.sql` and
`20261102000110_board_v2_foundation.sql`; both were applied unchanged. They add
enum values, nullable/defaulted columns, constraints, indexes, triggers and
bounded RPCs. No reset, DROP, TRUNCATE or unrelated record deletion. Ledger and
API schema now include both RPCs, `template_key`, `parent_id` and `locked`.

Real authenticated QA used one isolated account/organization, three boards and
one private image. Direct hosted RPC verification passes 18 checks. Signed-in
browser actions verify cross-type Shift selection; one persisted multi-object
move; Group/ Ungroup; decimal property commit; context duplication/undo;
internal clipboard; network-failure rollback, retry and reload;
marquee/Shift-marquee; saved alignment/ distribution;
Section-from-selection/name focus and drag creation; Layers locks; keyboard
context menus; grid and shortcut help. An initial visible-menu event wrapper
defect was found and corrected during QA. These are actual Next/Supabase
authenticated actions, not mocked transport. Final production browser checks and
isolated fixture cleanup are complete.

Failures now restore confirmed document/history state and keep unrelated/remote
work. The board remains usable. Safe retry retains identities; conflict recovery
loads latest state without page reload. Safe error categories distinguish
access, locks, limits, validation, conflict, missing schema and infrastructure.
Diagnostics log codes only. Custom clicks own Shift toggling; React Flow
selection changes are applied only during marquee to avoid the former duplicate
selection update.

Properties uses rounded decimal text fields with Enter/blur commit, Escape
restore and inline validation; no native step popup or Save object button.
Context menus, icon alignment/arrangement, Layers/Properties tabs and compact
keycap help expose power actions. Groups are manipulation containers; Sections
are visible named organization regions. Cards render deferred, freshly
authorized bounded native content previews; image glyphs replace costly
private-image signing. Dot grid and minimap toggle through View controls.
Existing privacy, operation/ownership limits, private Realtime and
no-AI/no-native-entity boundaries remain.

Verification:

- Full web: **192 files / 1,104 tests pass**. Focused Boards tests pass; new
  geometry, property, recovery/error and preview authorization coverage is
  included.
- Web lint (zero warnings), standalone typecheck and production build pass.
- Real hosted RPC suite: **18 checks pass**. Signed-in browser suites pass all
  seven cross-type Shift selection cases, **13 persisted interaction/recovery
  checks** and **11 extended manipulation/Section/Layers/help checks**.
- Actual production app: editor/reflow, single responsive panel, Properties,
  focus return, visible action menu and reduced-motion checks pass at
  320/390/430/768/1024/1200/1440/1920px in both themes. The first 83-check run
  found six desktop card-column failures caused by mixed Tailwind breakpoint
  units. Those were corrected, rebuilt and replaced by **18 passing targeted
  card/ preview checks**. Both production runs recorded zero browser exceptions.
  These are authenticated application/transport checks, not synthetic fixtures.
- Permanent pgTAP: **34 existing + 59 V2 = 93 assertions pass** in isolated
  PostgreSQL/PGlite using actual repository SQL. The supported hosted CLI test
  runner requires unavailable Docker; real hosted RPC/browser verification above
  is separate and succeeds. No permanent test was skipped or weakened.
- No worker, dependency/lockfile, auth/provider, Marketing or native-entity
  changes. Existing two migrations were applied; no migration source was
  rewritten.
- Scoped formatting, local documentation links, diff and secret/artifact checks
  pass. Temporary QA artifacts and local credentials are excluded from the
  commit.

Fixture cleanup verified exact test identity, ownership, organization name and
three board IDs. One private image, all three QA boards, the QA organization and
the QA account were removed; unrelated records were not targeted. The existing
owner organization-deletion RPC first failed transactionally with
`board_elements_creator_membership_fkey`: membership cascade precedes the board
audit reference cleanup. Removing only the inventoried QA board rows first
allowed cleanup. This pre-existing organization-deletion ordering issue needs a
separately scoped fix; no applied migration or deletion behavior was changed
here.

Limits: manual Windows NVDA, physical touch devices and non-Chromium browsers
were not exercised. Automated keyboard/focus/modal/reflow and reduced-motion
behavior passed; these checks do not replace manual screen-reader acceptance.
Docker is unavailable, so hosted CLI pgTAP did not run. No hosted
latency/performance SLA is claimed. REDESIGN-005 may proceed as a separately
authorized task and is not started.

Temporary scripts, credentials, screenshots and logs stay ignored under
`.next/cache/redesign-004-2-qa`; local environment files are untracked/ignored.
See [Boards](docs/BOARDS.md) and
[environment findings](docs/BOARDS_ENVIRONMENT.md).

## REDESIGN-004.1 — Brand identity, typography and premium auth

Branch `codex/redesign-004-1-brand-auth`, isolated worktree
`.worktrees/redesign-004-1-brand-auth`, starts exactly at
`f4571e28cb6325406abe4fcc2afb97a91ddf08e5`. Main agent only. Original checkout
and prior worktree changes are preserved. No merge/push or REDESIGN-005 work.

“Calm where people work. Expressive where the product speaks.” now governs the
shared brand. Cobalt #4F5BD5 replaces cyan; warm light/charcoal dark neutrals keep
Home, Tasks, Boards and navigation calm. Supporting apricot/mint/butter/sky have
separate dark artwork values and remain distinct from semantic states and human
collaborator colors. Older pastel names are palette-derived compatibility aliases.

The supplied blue–coral logo package is integrated unchanged, with full wordmark
variants, compact/monochrome marks and favicon/Apple/app icons. Shared BrandLogo
uses the pre-hydration theme class; runtime full-logo image hints avoid oversized
downloads. Geist variable Sans (69,436 bytes) is self-hosted from official
`geist@1.7.0`, with original SIL OFL license, hash, same-origin preload and
system fallback. No package/lockfile changes or runtime CDN.

Login/signup use a full-bleed deterministic architectural tile field and one
concise content card. Local proximity controls bounded Z lift, tilt, directional
shadows and highlight intensity through refs/finite RAF easing. No WebGL, new
graphics library, idle loop or React pointer rerenders. Reduced motion, hidden
documents, coarse pointers and small screens reset/stay static. Mobile is form
first with a small static accent. Artwork is decorative and unfocusable.

Removed redundant login/signup, Tasks and Boards subtitles; Home retains the
organization name. Useful ordering/read-only/empty/error/password guidance stays.
Board template preview accents are presentation only; no Board data, template
initialization, Realtime, private Storage, task rules or Marketing workflow changes.
Auth actions, schemas, provider, safe returns and session semantics are unchanged.
The proxy matcher excludes only the exact shipped font and license so public
auth can load them; permanent tests keep private/similar routes protected.

Verification:

- Full web suite: **188 files / 1,070 tests pass**. Existing permanent isolation,
  authorization, memory-domain, plugin, task and workflow coverage remains enabled.
- Focused brand/auth/contrast: 7 files / 30 tests pass. Targeted static-font routing,
  existing session proxy and contrast: 3 files / 11 tests pass (contrast overlaps).
- Web lint (zero warnings), standalone typecheck and production build pass.
- Actual production public login/signup: **142 checks across 32 theme/width/mode
  cases pass**, at 320/390/430/768/1024/1200/1440/1920px. Includes keyboard sequence,
  form labels/safe return, static art, pointer entry/slow-fast movement/local
  falloff/settling, reduced motion, short viewport, mobile and zoom-equivalent
  reflow. Zero recorded browser exceptions. No successful provider login/signup
  or real authenticated session was exercised; local nonsecret env placeholders.
- Home/Tasks/Boards list/editor: **16 actual-component fixture smoke checks pass**
  in both themes at 390/1440px. Only transport/actions/Realtime are synthetic; this
  checks tokens/reflow, not a new audit of Boards functionality or hosted services.
- Rendered auth contrast: button text 5.54:1 light / 7.80:1 dark; input boundaries
  3.39:1 / 4.13:1; body 16.09:1 / 16.86:1. Automated token tests cover body, muted,
  links, action states, selected nav, semantic states, inputs and focus. Decorative
  dividers are intentionally lower contrast. The global border default was moved
  into the base layer so control/selection tokens actually apply.
- Login declared client-reference JS union versus the starting build: **-103 raw /
  +48 locally gzipped bytes**, five chunks in both. No shader/canvas bundle. Local
  optimized wordmark responses were 8,180/8,036 bytes; both variants are requested
  to support device-local theme switching. Font is an additional 69,436-byte file.
- A short 60-move local production-page probe recorded local falloff, stable form
  bounds, zero Long Task/layout-shift entries and no frames after rest/leave.
  These are scoped observations, not a production benchmark, cold-load CLS claim
  or device SLA. No authenticated latency improvement is claimed.

Limits: manual Windows NVDA, physical devices, non-Chromium browsers and hosted
provider acceptance remain target-environment checks. The existing locked install
reported npm audit findings; dependency upgrades were not part of this visual
task. Database/worker validation is not applicable because neither changed.
Temporary QA/install artifacts stay ignored under `.next/cache/redesign-004-1-qa`.
Scoped code formatting, 13 changed Markdown ranges, diff whitespace and the
57-file artifact/secret/relative-link review pass. Final sidebar logo fit passes
after its size default was placed below utility overrides. Task browser and
preview helpers are stopped. See [Brand](docs/BRAND.md) for canonical sources/usage and
the exact future REDESIGN-005 recommendation.

## REDESIGN-004 - Boards V2 foundation

Boards now has real owner/updater/template metadata and seven native templates.
The editor uses an immersive BoardShell with overlay navigation, vertical named
creation tools, six Shapes choices, one-shot insertion, explicit Sections/Groups,
selection sets and atomic manipulation. Private images support bounded batches,
paste/drop, per-file recovery, aspect/crop/fit and identity-preserving replacement.
Safe manual links fetch no previews. Inspector, Comments and the accessible
outline share one responsive slot; zoom/fit/minimap and account/org/board-scoped
local viewports preserve context. Scoped shortcuts and outline/Inspector controls
provide alternatives to dragging. See [Boards](docs/BOARDS.md) for full contracts.

Two forward migrations add minimal parent/lock/template invariants and bounded
atomic operation/template RPCs. Direct writes and RPCs serialize on the board and
repeat tenant/role/ownership checks. Initial canvas data has zero comment bodies
and zero Storage signing calls. Deferred reads freshly check organization/board,
accept PostgreSQL offset timestamps and sign canonical private asset keys in
batches. Traversal/encoded/URL-shaped keys are rejected in both app and SQL.
SVG paint cannot request external resources. Realtime keeps existing private
channels, directory identity, unique people, stable colors and throttled cursors.
Timestamp comparison retains PostgreSQL microseconds; same-transaction changes
reconcile without dropping final row fields. Failed conflicting intents require
reload rather than blind replay. No provider/plugin-private/Knowledge path is added.

Verification passes:

- Focused board plus workspace architecture: 24 files / 149 tests.
- Full web suite: 186 files / 1,063 tests, including permanent isolation,
  authorization, memory-domain, plugin-boundary and workflow categories.
- Actual board SQL in isolated PostgreSQL/pgTAP: 34 existing plus 59 V2 assertions.
  Covers tenant/role/revocation, direct read policies, ownership/cycles, atomic
  rollback/moves, bounds/locks, archive/restore, image identity/private keys and
  bounded template initialization. Existing SQL fixtures were corrected, not
  weakened: policy-compatible UUIDs, accurate plan and distinct actor-denial /
  recipient-success notification checks.
- Web lint, standalone web typecheck and production Next build pass. The build
  retains all 30 page URLs and non-page entrypoints, using nonsecret local
  Supabase placeholders. No worker/shared-worker code changed, so worker checks
  are not applicable.
- Sandboxed headless Chrome: 70 recorded actual-component fixture checks across
  320/390/430/768/1024/1200/1440/1920 px and both themes, plus a desktop panel-focus
  transition check. Covers blank/populated/template/1,000-object/20-image boards,
  list/empty/VIEWER, mouse/keyboard/touch-style input/reduced motion, manipulation,
  real Group/Section dragging and image resize, outline/panels, comments, upload
  recovery/paste/drop/replacement, reconnect simulation and viewport restore.
  Recorded browser runs have zero runtime exceptions. Resize handles were raised
  above image surfaces after actual hit testing exposed an overlap.

Limits: browser fixtures replace only Next transport/actions/Realtime; they are
not a live authenticated Supabase session. PostgreSQL uses a minimal Supabase
bootstrap because Docker/Podman/local Supabase are unavailable; hosted data and
service transport are untouched. Hosted migration/Storage/private-channel smoke
checks and manual Windows NVDA remain target-environment acceptance. No offline
persistence, connector attachment relation, image garbage collection, permanent
board history, or native entity/AI integration is claimed. Local short timing
probes are client-only observations, not before/after speedups or service SLAs.

Temporary dependencies, synthetic fixtures, screenshots, logs and profiles are
ignored under `.next/cache/redesign-004-qa`; no app dependency/lockfile changed.
Task browser/preview helpers were stopped. No merge/push or 005 implementation.
Scoped code/changed-Markdown formatting, local documentation links and
`git diff --check` pass. Review covers all 64 changed candidate files; no secret,
environment, dependency/lockfile or generated artifact is included. The production
build retains 30 unique page URLs and three callback/API entrypoints. Its 48
client JavaScript files contain none of the checked private-provider environment
or synthetic QA markers. These scans are scoped verification, not a hosted audit.

### Baseline captured before persistence changes

Branch `codex/redesign-004-boards-v2`, worktree `.worktrees/redesign-004-boards-v2`,
starts exactly at `d211d878793b60abb2598460a0feaf1f9baf5c9f`. Main agent only.
Original checkout changes remain untouched. No merge/push or 005 implementation.

Before modifying persistence: `boards` holds title, organization, author/updater,
timestamps and archival state. `board_elements` has independently addressed TEXT,
STICKY, IMAGE, SHAPE and ARROW rows; world x/y, width/height, rotation, persisted
z-index and object-shaped content/style/metadata. Images use metadata.storagePath
in the private board-images bucket, PNG/JPEG/WebP up to 10MB. Comments reference
board/optional object, with shallow replies and validated mentions. Existing
tenant foreign keys, provenance triggers, member-read/collaborator-write RLS and
private org+board Realtime channel authorization are retained.

No sections, groups, locks, links or template metadata exist in the baseline.
Only the first selected ID is retained. Layer/undo changes persist through
independent row actions (Promise.all), so partial saves are possible. The list
uses repeated generic previews and generic owner labels. The editor sits in its
page-owned AppShell, then adds its own header/horizontal toolbar. Initial editor
loading waits for board, elements, directory, up to 200 comments and individual
signing of every image; no production timing claim is made.

Recorded plan: retain URLs/module/table names; add an immersive BoardShell with navigation
overlay and no notification/search reads. Add bounded atomic operations and
relational ownership/lock/template invariants with forward migrations, keeping
legacy object identity/world coordinates. Build native templates, multi-selection,
group/section manipulation, named shape tools, inspector/outline alternatives and
zoom/device viewport controls. Defer comments and batched authorized image signing
until after the base canvas is usable; retain private original assets and comment
identities on replacement. Keep existing cursor/presence/color normalization and
local conflict-aware operation history. No plugin imports, canonical entity cards,
conversion, voting/reactions, AI execution or memory promotion.

Docker/Podman/local PostgreSQL are unavailable. Database verification used an
isolated embedded PostgreSQL/pgTAP runner, documenting its Supabase
bootstrap/service limits; hosted data is not a test fixture and is not modified.

## REDESIGN-003.1 — Auth visual identity and interactive artwork

Branch `codex/redesign-003-1-auth-visual-identity`, isolated worktree
`.worktrees/redesign-003-1-auth-visual-identity`, starts exactly at accepted
REDESIGN-003 `d9f481d119a7d4f517d428bd3b4a6473bf38e444`. Original checkout changes
remain untouched. Main agent only; no merge/push or REDESIGN-004 implementation.

Login/signup share an original abstract contour/plane composition: ideas becoming
structure, with sparse grid/coordinate fragments and concise identity copy.
Server SVG is passed into a small client interaction wrapper. Scoped theme tokens
provide mist/teal/seafoam/warm-neutral light art and separately authored charcoal/
muted-teal dark art. Normal application surfaces and global tokens are unchanged.
Desktop is approximately 55/45; tablet has a reduced static field; mobile is
form-first with a small static accent. Focused invitation/setup/recovery shells
retain their existing presentation and behavior.

Fine desktop pointer movement normalizes/clamps position, translates layers by
2/4/8/10 SVG units and reveals secondary lines through a soft radial CSS mask.
Geometry is cached outside the frame loop and invalidated on resize/scroll.
Only CSS variables change in finite RAF bursts; no React state/render loop,
ambient drift, velocity effect, SVG filter, WebGL, raster hero or new dependency.
Media/visibility changes reset/cancel animation; reduced motion also disables
transforms/reveal in CSS. All pointer data is ephemeral and local, never logged,
persisted or sent. Decorative artwork is aria-hidden, unfocusable and independent
of auth, account, organization or application state.

AuthForm, auth pages/actions/schemas, session and return-path boundaries are
unchanged. Focused tests pass: 5 files / 24 tests, including existing normalized
credentials, validation, generic errors, signup confirmation and invitation return
security; new tests cover form submission, decorative safety, media/visibility
guards, finite frames, cached geometry, cleanup and zero pointer-driven React
child rerenders. Preview screenshots of actual public routes were inspected.

Production public-route QA passes 260 checks across 32 login/signup cases in both
themes at 320/390/430/768/1024/1200/1440/1920px, plus 1440x600 short-screen checks.
Coverage includes form bounds/reflow, caption separation, essential button/copy
contrast, decorative focus isolation, actual Tab order, return paths, invalid
submission, static small-screen art, slow/fast pointer response, local reveal,
form stability, settled idle behavior and live reduced-motion reset. Final desktop,
mobile and reveal screenshots were inspected. There were no uncaught/console
errors. Public pages used nonsecret local Supabase placeholders; successful live
provider authentication was not exercised. Existing action/schema tests retain
that behavior coverage through mocks. Manual NVDA is not claimed.

Against the accepted REDESIGN-003 production build, the declared login client-
reference JS chunk union remains five files: 356,085 -> 359,234 bytes raw and
88,524 -> 89,452 bytes locally gzipped, a +3,149/+928 byte change. This includes
shared chunks and is an artifact comparison, not measured HTTP transfer. SVG
markup and CSS are additional payload, not included in those JS figures. Short
desktop slow/fast-pointer probes observed zero Long Task entries in both themes;
this is a local observation, not a device-independent performance guarantee.
Unit tests verify zero pointer-driven child rerenders; browser checks verify no
continuing style writes after settling. No elaborate benchmark harness was added.

All required local checks pass: full web suite 179 files / 1,006 tests, focused
auth suite 5 files / 24 tests, web lint, standalone web typecheck, production build,
scoped formatting and diff/secret/artifact review. Checked private server/client
construction markers are absent from production client bundles. QA assets remain
ignored under `.next`; temporary browser/server processes are stopped. No worker
or DB validation is required because no shared worker runtime or schema changed.
No Home/Tasks/Boards/Marketing/Settings, database/RLS, worker/shared runtime,
provider or dependency changes are included. Total-list pagination and signed-in/
NVDA follow-up from REDESIGN-003 remain unchanged. REDESIGN-004 can proceed as a
separately authorized task; it is not started here.


## REDESIGN-003 — Home and Tasks V2

Branch `codex/redesign-003-home-tasks`, isolated worktree
`.worktrees/redesign-003-home-tasks`, starting exactly at accepted REDESIGN-002
`17ade235eabfe142ee536267e1a3d88da736942a`. Original checkout changes are untouched.
Main agent only; no merge/push and no REDESIGN-004 implementation.

Home replaces pastel/metric/launcher sections with six deduplicated tasks ranked
overdue, due within 48 hours, assigned to the viewer, then other active work.
Four organization-scoped queries each request at most six task summaries; a
deterministic due-date/ID tie break produces the final six. Activity requests six
events. The member directory and existing enabled-Marketing overview contract
are retained. Meaningful Marketing work is omitted when disabled or empty.
Create task uses the existing `?create=true` flow; VIEWER gets Review tasks.
Home deadlines and compact activity reuse the hydration-safe, browser/System
Intl component, including date-boundary and DST behavior.

Tasks exposes My/All/Upcoming/Completed, with Overdue/Archive/Calendar under More
views. Search, a mobile filter sheet, removable active filters and compact rows
retain existing filter/order/completion/archive semantics. Selection uses native
App Router-compatible history, preserving all other query state without a list
refetch. Detail is a 480px nonmodal desktop panel, modal tablet overlay and
full-screen mobile dialog. Back/Forward and direct selection work independently
of visible rows. Closing returns focus to the row or heading.

### Structural performance evidence

Inspected baseline before changes: initial Tasks selected every task field and
every organization comment body, plus one member-directory RPC: one task query,
one comments query, one member query (excluding authorization/setup/shell).
Home selected up to 50 full task rows and displayed four, with UTC-only deadline
formatting. These are source observations, not production timings.

After: initial Tasks reads only nine summary fields and one member RPC, with
**zero comment queries/bodies**. For fewer than 1,000 tasks this is one task query;
larger lists use deterministic ID-keyset batches of 1,000 (an exact multiple
requires an empty final batch). No total-list cap is claimed: product pagination
is deferred to preserve complete cross-list search, views, archive and deadline
refresh semantics. The former implicit API row cap no longer silently truncates
the workspace. Concurrent insertions before a traversed cursor appear on refresh.
The full directory and total summary list can still grow; this remains a measured
follow-up rather than an incorrect first-N client list.

Opening detail starts one read action: fresh current organization/membership,
validated UUIDs, then one organization+task-scoped full task read. Only after
success does a second action reauthorize, check task existence and read at most
51 comments, displaying 50 and an explicit earlier-page cursor. Ordering is
timestamp+ID, newest batch displayed chronologically; Load earlier comments uses
a validated keyset cursor. Each subsequent batch is bounded. Foreign/missing
tasks share an unavailable response; expected organization is validated against
fresh server context, never trusted as authority. RLS and mutation actions remain.
Keyed selection boundaries and request lifecycles discard late detail/comments
after switches, refreshes or closing. Local errors/retry preserve the list.

No reliable authenticated Home -> Tasks latency or DB request trace is available;
no milliseconds or production percentile improvement is asserted. Home trades
one wider task query for four small priority-arm reads (at most 24 candidates).
Marketing overview fetching remains its existing contract, outside this redesign.

### Verification and remaining acceptance

Focused Home/Tasks/read-authorization/local-time tests pass, including 22 final
Task workspace/data tests. The final full web suite passes: 177 files / 997 tests.
Headless Chrome passes 132 actual-component fixture checks at
320/390/430/768/1024/1200/1440px in
both themes, including a representative 224px desktop shell allowance, overflow,
Enter opening, modal Tab wrap, URL/filter retention, empty/read-only/error states,
lazy-read counters, mobile filter-sheet bounds and repeated comment posts that
refresh discussion without remounting the focused composer. Desktop/mobile screenshots
were inspected; no uncaught browser/console errors occurred. Fixture server reads
are mocked; this is not live authenticated browser or RLS/production timing proof.
Temporary fixture bundles, screenshots and profiles stay ignored under `.next`.

Web lint, web typecheck and the web production build pass. Scoped formatting,
diff checks and secret/runtime-artifact review pass; production client bundles
contain none of the checked private server-environment/client-construction markers.
The build retains all existing page and non-page entrypoints. Temporary QA browser
and server processes are stopped. No worker validation or DB migration checks are
required because neither shared worker runtime nor schema changed.
Manual Windows NVDA and signed-in target-environment transition/
authorization/latency acceptance remain outstanding and are not claimed as passed.
No database, migration, RLS, dependency, worker/shared runtime, AI or memory changes.
REDESIGN-004 remains the separately approved Boards foundation: list/templates,
immersive BoardShell and editor mechanics. Native entity integrations/conversions
remain in 005; Marketing redesign and new AI execution remain outside that scope.


## REDESIGN-002 baseline and scope

Starting HEAD: accepted REDESIGN-001 commit
`0deddae882c589f3e26be6e2af6017bbca273e83`, descendant of freshly fetched
`origin/main` `5b7e76a`. Implementation is isolated in
`.worktrees/redesign-002-shell-auth-performance` on
`codex/redesign-002-shell-auth-performance`; original unrelated changes remain.

Before implementation, source confirms sidebar document anchors, individually
owned page shells, 256px sidebar/64px topbar, inert global search, six parallel
onboarding datasets for routine routing, duplicate membership/org reads and two
notification queries per page render. Plugin state and Auth are already
request-memoized. Source-derived common Core-page overhead is 14 DB/RPC calls
before feature data (3 context, 2 full-loader membership/org, 6 onboarding,
2 notifications, 1 plugin); selected-cookie fallback may add a membership call.
This is a structural call inventory, not a measured trace or latency benchmark.
Marketing tab links already use client routing but recreate their shell.

No connected browser tool or authenticated browser session is available for
reliable Home -> Tasks, Tasks -> Marketing, Marketing -> Studio or Settings
timings/request traces. Record structural before/after evidence and automated
contracts without inventing measurements. Preserve existing incomplete-setup
Marketing/Workers behavior and defer Home/Tasks content, BoardShell/mechanics,
Marketing workflows and deep Settings consolidation.

### REDESIGN-002 implementation and verification

The `(workspace)` route group owns one AppShell at unchanged URLs. Each page
keeps server-derived context and applicable setup/plugin/role checks; ordinary
layouts do not grant mutation authority. The existing board editor remains on
its page-owned AppShell until REDESIGN-004. Workers/Marketing retain their
existing incomplete-onboarding behavior rather than acquiring a new setup gate.

The shell uses serializable navigation icon IDs, a neutral 224px expanded/56px
collapsed sidebar, 48px opaque topbar, Next Link pending feedback and content
skeletons. Collapse is device-local, keyboard-labeled and works without Storage
through a session fallback. Settings and local Marketing/Apps links preserve
all moved destinations. The inert search field is gone. Auth retains its action,
validation, confirmation and safe return contracts with a two-column desktop
showcase and form-first layout below 1200px.

Selected-membership resolution now reads one membership plus one organization,
instead of selecting membership twice. Read-only onboarding/company composition
reuses that request context, while explicit membership authorization stays
uncached. Routine gates read only `completed_at, current_step`; full loaders
remain for Company/Memory/editing. Layout owns initial notifications/plugin reads
in parallel. Notification summaries refresh on opening through a fresh
organization/recipient-derived action; focus refresh updates shell metadata.

Structural common Core overhead is now 6 queries on a full workspace render
(2 context, 1 setup, 2 notification, 1 plugin), or 3 on a content-only transition
that reuses the layout, plus feature data. The baseline was 14. These are source
counts, not observed production requests or latency claims; cookie fallback may
add a membership query. Task comment loading is deliberately unchanged.

Verification passes the full web suite (174 files / 969 tests), repository lint,
worker/web typechecks and standard worker/web production builds. After aligning
the shell/auth desktop breakpoint to the specified 1200px, the affected eight
UI tests, targeted lint and web production build pass again. Scoped formatting,
route contracts, diff/whitespace review and secret/local-artifact checks pass.

Headless Chrome checks against the built public auth routes pass 28 cases:
login/signup, light/dark, 320/390/430/768/1199/1200/1440px. Checks cover overflow,
showcase visibility, form bounds, one main heading, autocomplete and real Tab
order through the inputs/submit. Reduced-motion media is honored and no uncaught
client errors were observed. Desktop/mobile screenshots were inspected. This is
not manual NVDA testing or authenticated workspace performance acceptance.

The isolated worktree needed a local install of the unchanged lockfile for
Turbopack's workspace-root resolution; no dependency/version/lockfile changed.
Build/browser QA uses non-secret verification public configuration, never a
copied production environment. Temporary browser/server processes were stopped
and generated QA files remain ignored. Worker tests were not rerun because no
worker/shared runtime code changed; no DB migration tests apply without DB changes.

Remaining acceptance: authenticated desktop/tablet/mobile shell transitions,
real before/after latency/request traces and manual NVDA verification in the
target environment. Do not claim measured speedups. Existing board/editor and
feature-page content stays deliberately unchanged for later redesign phases.

## REDESIGN-001 — V2 Product Experience Foundation

Documentation-only work on `codex/redesign-001-v2-foundation`, isolated at
`.worktrees/redesign-001-v2-foundation` from freshly fetched `origin/main`
`5b7e76a0fe6a4e80f17e14c04b119a84b43668a9`. Unrelated source edits and supplied
untracked design references in the original `main` checkout are preserved.

The canonical [V2 specification](docs/STYLUS_V2_PRODUCT_EXPERIENCE.md) defines
neutral cyan-led visuals, Home/Tasks/Boards/Marketing/Settings navigation,
all 30 page routes, immersive BoardShell, startup board templates/integrations,
workflow-first Studio and Settings consolidation. DESIGN_SYSTEM and UI_PATTERNS
now describe V2 targets, not an assertion that those targets are implemented.
ADR-040 supersedes ADR-039's default editorial section-color guidance only.

Source audit confirms ordinary sidebar anchors, page-owned shells, six-dataset
onboarding gates on routine Core routes and eager loading of every task comment.
Auth/plugin request memoization and existing loading files qualify other
hypotheses. Production timing and each mechanism's latency contribution remain
unmeasured. All ten verdicts, P0/P1/P2 remediation and repeatable benchmarks are
in the spec. No browser automation, application code, migrations, RLS, workflow,
worker behavior, dependencies or existing functionality changed.

Validation passes: scoped Prettier for all seven Markdown files, all 30 page
routes plus three retained non-page entrypoints, 16 local Markdown links,
38 required sections, ten performance verdicts, repository lint, worker/web
typechecks and six focused existing web test files / 23 tests. Diff review and
whitespace checks confirm documentation-only changes. No full suite, production
build or database tests were run: they are not applicable to this prose-only
change. An ignored worktree-local junction resolves the existing shared
TypeScript config for checks; no dependency/package/lockfile changed. Do not
reuse old verification counts below as evidence for this task.

Unresolved: capture production before/after timing, run NVDA and visual responsive
QA during implementation, confirm owner product/budget decisions listed in the
spec, and keep all previous hosted QA limitations in force. The reference files
are user-supplied untracked inputs in the original checkout; they are not staged
or copied into this documentation branch. No runtime feature is declared complete.

Stylus Marketing now includes Ask Council, a bounded conversational advisor
that reads authorized company, research, Performance Learning and exact
creative-artifact context. Deterministic routing selects a small specialist set,
then one final synthesis produces an immutable, provenance-backed advisory
answer without invoking Create, Research, Strategic Review, performance
derivation, memory or Web Agency behavior.

---

## Current Phase

REDESIGN-002 — Workspace Shell / Authentication Foundation

Status: COMPLETE / REQUIRED LOCAL CHECKS PASS

---

## Current Objective

Review REDESIGN-002 and its retained manual acceptance limitations; do not merge
or push automatically. REDESIGN-003 is not started. Its exact next scope is Home
attention hierarchy/local-time consistency and Tasks toolbar/views/right detail
with lazy selected-task comments and bounded loading, preserving reminder,
completion/archive and authorization contracts. The earlier production and
TASK-001 through TASK-020 notes below are historical implementation/QA records,
not V2 completion claims; existing manual/hosted acceptance obligations remain.

## Final Production Design Refinement

The placeholder Home view is replaced by a permission-aware operating
dashboard using only existing organization-scoped task, activity, member,
plugin and Marketing data. It summarizes overdue/near-due/assigned work,
provides existing-flow shortcuts, shows recent activity and adapts its pulse to
whether Marketing is enabled. VIEWER receives review links rather than a task
mutation shortcut; organization and actor context remain server-derived.

The shared UI now uses a stronger editorial hierarchy, consistent 8px-derived
spacing, accessible controls and centralized pastel section surfaces with dark
counterparts. Canonical brand identity remains `#0D98BA`; light primary actions
use the derived `#087690` surface with white text (5.24:1 WCAG contrast) and
darker hover/active states. Marketing Overview, Creative Studio, Ask Council,
Research, Settings and long-form Memory receive restrained section rhythm and
bounded reading measures without workflow changes.

Whiteboard identity uses eight curated high-distinction families. A single
active-set allocator deduplicates by trusted user ID, preserves existing
assignments across joins/leaves, deterministically resolves preferred-color
collisions and supplies the same accessible tokens to avatar, cursor and name
label. Realtime Presence/Broadcast, topic isolation, RLS, 25 Hz throttling,
cursor expiry and migration `02020` are unchanged. No migration is introduced.

Team-member last-sign-in values remain an OWNER/ADMIN-only server projection.
A small hydration-safe client formatter now presents the authorized timestamp
in the current viewer's browser/system timezone using native `Intl` rules; the
stored absolute timestamp and Auth metadata boundary are unchanged.

The root `README.md` is now the detailed public entry point for product scope,
architecture, local setup, configuration, security, testing and deployment. It
links to the existing specialist source-of-truth documents rather than
replacing them.

Focused verification passes 11 files / 46 tests and the complete web suite
passes 164 files / 928 tests. Repository lint, web typecheck, scoped formatting,
the web production build and npm audit with zero vulnerabilities pass.
Automated browser screenshot QA is unavailable in the current environment, so
the final light/dark responsive visual checklist remains a manual acceptance
step.

---

# Phase 0 Implementation

- npm workspace structure with `apps/web` and shared TypeScript config
- Next.js App Router application with strict TypeScript
- Tailwind CSS design tokens with light and dark theme variables
- shadcn/ui-compatible component conventions and aliases
- Lucide icon system
- responsive desktop sidebar and accessible mobile navigation drawer
- topbar with global search, notifications and account placeholders
- placeholder Home page with no business functionality
- Zod-backed environment validation and `.env.example`
- ESLint, Prettier and Vitest configuration
- focused navigation and Home placeholder tests

---

# Phase 0 Verification

Verified on 2026-08-25:

- `npm install`: passed; 0 audit vulnerabilities
- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 3 files and 4 tests
- `npm run build`: passed; `/` prerendered as static content
- development server: started successfully; `/` returned HTTP 200

---

# Phase 1 Implementation

- browser-safe and server-only Supabase clients using `@supabase/ssr`
- Next.js Proxy session refresh using verified Supabase claims
- signup, email-confirmation, login and logout flows
- protected application and organization-setup routes
- server-side identity and organization-membership helpers
- organization setup boundary before entering the Stylus shell
- shell account identity, organization name, role and logout menu
- Zod validation for required public environment configuration and forms
- generic authentication errors that do not expose credentials or account state

---

# Phase 1 Database

Migration: `supabase/migrations/20260825000100_auth_organizations.sql`

Introduced:

- `public.organization_role`: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`
- `public.organizations`
- `public.memberships` with `(organization_id, user_id)` primary key
- private membership/role authorization functions with pinned search paths
- atomic `public.create_organization(text)` RPC
- restricted table/function grants
- RLS policies for organization reads, organization updates and membership reads
- pgTAP policy suite at `supabase/tests/database/organizations_rls.test.sql`

---

# Phase 1 Verification

Verified on 2026-08-25 with browser-safe test configuration:

- dependency installation: passed; 0 audit vulnerabilities
- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 10 files and 27 tests
- `npm run build`: passed; 7 application routes plus Proxy compiled
- development server: passed
- `/login` and `/signup`: HTTP 200 with expected labeled forms
- `/` and `/organization/new` while unauthenticated: HTTP 307 to `/login`
- browser bundle scan: no service-role environment names or secret-key prefixes
- source scan: no credential/token logging or service-role client

---

# Phase 2 Implementation

- focused eight-step onboarding: Company; Problem & Idea; Product; Audience;
  Positioning & Brand; Marketing; Competitors; Review & Finish
- per-step validation, field errors, pending states, Back and Save/Continue
- bounded add/remove list controls and zero-or-more competitor editor
- durable server-side progress saved between steps
- completion timestamp and workspace routing that does not repeat onboarding
- Company Profile review/edit page after completion
- pre-product-friendly optional website, social, brand and competitor fields
- no AI provider, memory, embedding, RAG, scraping or Marketing plugin code

---

# Phase 2 Database and Security

Migration: `supabase/migrations/20260825000200_company_onboarding.sql`

Introduced:

- controlled company, product, brand, marketing and competitor enums
- `company_profiles`
- `audience_profiles`
- `brand_profiles`
- `marketing_profiles`
- `competitors` with archival removal
- `onboarding_progress`
- member read policies and OWNER/ADMIN insert/update policies on every table
- immutable organization ownership, creator/starter provenance and authenticated
  updater enforcement
- pgTAP policy suite at
  `supabase/tests/database/company_onboarding_rls.test.sql`

Server Actions independently derive the current organization from the validated
membership context and map accepted fields explicitly. MEMBER and VIEWER roles
cannot mutate onboarding data.

---

# Phase 2 Verification

Verified on 2026-08-25:

- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 16 files and 49 tests
- `npm run build`: passed; onboarding and Company Profile routes compiled
- linked `supabase db push --dry-run --skip-vault`: passed; exactly the new Phase
  2 migration is pending and no remote changes were made
- unauthenticated `/onboarding/company` and `/company/profile`: HTTP 307 to
  `/login`
- source security scan: no service-role use, secret logging, AI calls or memory
  implementation

## Manual-QA Navigation Fix

Resolved on 2026-08-25:

- removed broad root-layout revalidation before onboarding redirects
- replaced the separate progress read/upsert with
  `advance_onboarding_progress(uuid, smallint)` on the same authenticated client
- progress advancement now targets the absolute completed step, making duplicate
  requests idempotent rather than incrementing twice
- regression coverage verifies first-submit persistence/redirect, validation and
  persistence failures, duplicate requests, disabled pending submission and
  refresh/login recovery
- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 18 files and 59 tests
- `npm run build`: passed
- linked migration dry run: passed; only
  `20260825000300_fix_onboarding_progress_advance.sql` is pending

---

# Phase 3 Implementation

- protected `/tasks` workspace integrated with the responsive Stylus shell
- fast create/edit dialog with title, description, one optional assignee,
  priority, status, scheduled time and due time
- compact task rows with accessible completion/reopen controls and overdue state
- My Tasks, All Tasks, Upcoming, Overdue, Completed, Archive and Calendar views
- composing title, assignee, status and priority filters
- deterministic actionable ordering and UTC date handling
- 14-day recent-completion window with older history retained in Archive
- lightweight task comments for working collaboration context
- view-specific empty states plus loading, error and pending states
- no reminder delivery, notifications, workers, AI or later-task infrastructure

---

# Phase 3 Database and Security

Migration: `supabase/migrations/20260825000400_task_management.sql`

Introduced:

- `task_status` and `task_priority` enums
- `tasks` with one nullable same-organization assignee
- `task_comments`
- organization/status, assignee, due and completion-history indexes
- composite organization/member and organization/task foreign keys
- database-managed, idempotent `completed_at` lifecycle
- immutable organization/creator provenance and authenticated updater enforcement
- column-level grants that exclude IDs, ownership and managed timestamps
- organization member reads; OWNER/ADMIN/MEMBER writes; VIEWER read-only RLS
- authenticated `list_organization_task_members(uuid)` directory RPC exposing
  only member IDs, display names and roles
- 19-assertion pgTAP suite at
  `supabase/tests/database/task_management_rls.test.sql`

---

# Phase 3 Verification

Verified on 2026-08-25:

- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 25 files and 92 tests
- `npm run build`: passed; protected `/tasks` route compiled
- linked `supabase db push --dry-run --skip-vault`: passed; exactly
  `20260825000400_task_management.sql` is pending and no remote change was made
- migration/security contract coverage verifies RLS roles, organization isolation,
  same-organization assignment, restricted grants and lifecycle invariants
- component coverage verifies compact task display, collaborator dialogs,
  VIEWER read-only behavior and view-specific empty states

## Manual-QA Overdue Deadline Fix

Resolved on 2026-08-25:

- local date/time inputs now convert through the browser timezone to UTC
  instants before persistence, and stored instants display in local time
- overdue uses the inclusive `due_at <= now` boundary for active tasks only
- the open workspace schedules one refresh at the nearest future active
  deadline, with timer cleanup and no polling when no deadline can change state
- deterministic coverage verifies timezone conversion, active/inactive status
  behavior, the deadline boundary, refresh-time filtering and the existing
  14-day completion split
- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 26 files and 97 tests
- `npm run build`: passed; protected `/tasks` route compiled

---

# Phase 4 Implementation

- compact global notification bell/popover with unread count, recent messages,
  explicit unread text, mark-one and mark-all read actions
- safe task-context navigation derived from controlled entity references
- 24-hour, one-hour and at-deadline in-app reminder policy for assigned active
  tasks
- deterministic database processor with exact UTC deadline-version idempotency
- current status, assignee, membership and deadline revalidation on every run
- immutable task create/update/assignment/status/comment activity triggers
- protected responsive `/activity` history with member identities and task links
- no external delivery channel, browser polling, local daemon, VPS or AI scope

---

# Phase 4 Database and Security

Migration: `supabase/migrations/20260825000500_reminders_notifications_activity.sql`

Introduced:

- controlled notification, reminder and activity event enums
- recipient-private `notifications`
- deadline-versioned `task_reminder_deliveries`
- immutable organization-readable `activity_events`
- `process_task_reminders(timestamptz)` restricted to trusted database/service
  execution
- recipient-scoped database-time read-state functions
- composite organization/member and organization/task foreign keys
- RLS and grants denying browser notification creation, activity forgery and
  reminder-ledger access
- 32-assertion pgTAP suite at
  `supabase/tests/database/reminders_notifications_activity_rls.test.sql`

---

# Phase 4 Verification

Verified on 2026-08-25:

- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 33 files and 112 tests
- `npm run build`: passed; protected `/activity` and `/tasks` routes compiled
- linked `supabase db push --dry-run --skip-vault`: passed; exactly
  `20260825000500_reminders_notifications_activity.sql` is pending and no remote
  change was made
- deterministic tests use fixed instants with no sleeps
- migration contract verifies current-state eligibility, deadline-version
  deduplication, trusted execution grants and immutable activity provenance

Production build, linked migration dry run and final formatting are recorded
after the final verification pass.

## Manual-QA Reminder Processor Fix

Resolved on 2026-08-25 after hosted Supabase Cron exposed a PostgreSQL runtime
ambiguity:

- the applied processor's local `reminder_kind` collided with the unqualified
  `reminder_kind` conflict-target column, aborting every eligible reminder run
- forward migration `20260825000510_fix_reminder_processor.sql` replaces only
  `public.process_task_reminders(timestamptz)` and preserves existing data
- all processor locals now use a `v_` prefix and target-row identifiers are
  explicitly qualified where PostgreSQL permits qualification
- `SECURITY DEFINER`, the empty `search_path`, current task/member checks,
  deadline-version idempotency, and service-role-only execution are preserved
- pgTAP now executes the eligible insert branch with `lives_ok`, directly
  covering the hosted failure path
- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run test`: passed; 33 files and 114 tests
- `npm run build`: passed
- linked migration dry run: passed; only
  `20260825000510_fix_reminder_processor.sql` is pending

---

# Phase 5 Implementation

- protected `/whiteboards` list/grid with create, rename, open and archival
- full-space React Flow editor with pan, zoom, fit, selection and touch-friendly
  compact tooling
- independently persisted TEXT, STICKY, IMAGE, SHAPE and ARROW elements
- rectangle/ellipse shapes, direct text/sticky editing, resizing and deterministic
  bring/send layering
- bounded persistence on create, drag end, resize end and edit commit with
  visible saving/error/retry feedback
- private validated image upload with one-hour signed rendering URLs
- contextual font size, alignment and curated text/sticky/fill/stroke palettes
- 75-operation local undo/redo with persisted archive, restore and update
  transitions plus Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl+Y shortcuts
- horizontally centered default arrows, memoized element rendering during
  pointer updates and direct toolbar-to-native image picker activation
- VIEWER read-only behavior and OWNER/ADMIN/MEMBER collaboration
- no comments, mentions, realtime, presence, AI or Marketing integration

---

# Phase 5 Database and Security

Migration: `supabase/migrations/20260825000600_whiteboard_foundation.sql`

Introduced:

- controlled `board_element_type`
- organization-scoped `boards` and independently addressable `board_elements`
- finite geometry, positive dimensions, JSON-object and z-index constraints
- composite organization/board and membership provenance foreign keys
- provenance triggers preventing creator, organization and board reassignment
- collaborator-write/member-read RLS with restricted column grants
- private `board-images` bucket limited to 10 MB PNG/JPEG/WebP files
- path-derived organization storage policies for member reads and collaborator
  writes/removal
- 22-assertion pgTAP suite at
  `supabase/tests/database/whiteboards_rls.test.sql`

---

# Phase 5 Verification

Verified on 2026-08-25:

- focused TASK-006 usability tests: passed
- full web suite: passed; 44 files and 168 tests
- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- `npm run build`: passed; `/whiteboards` and `/whiteboards/[boardId]` compiled
- unauthenticated list and direct board routes return HTTP 307 to `/login`
- linked migration dry run: passed; remote database is current with no pending
  migrations; the usability pass required no schema change
- dependency audit: 0 vulnerabilities after adding `@xyflow/react`
- local pgTAP execution unavailable because Docker/Podman is not installed
- in-app browser QA unavailable because no browser surface was connected

---

# Manual Verification Still Required

The current machine does not have Docker or an available in-app browser surface.
The linked Supabase project was available for a non-mutating migration dry run.
Before merge/deployment:

1. Run `npm run db:start`, `npm run db:reset`, `npm run db:lint` and
   `npm run test:db` in a Docker-enabled environment.
2. Create OWNER/ADMIN/MEMBER/VIEWER users in two organizations and confirm list,
   direct-route, board mutation and element mutation boundaries.
3. Create a board and each element type; pan, zoom, move, resize, layer, edit and
   archive elements, then navigate away/reopen and verify reconstruction.
4. Exercise formatting and undo/redo controls and shortcuts for create, move,
   resize, content, style, archive and layer changes; reload after undo and redo.
5. Upload valid PNG/JPEG/WebP images and reject SVG/executable and oversized
   files; confirm Organization A cannot sign or fetch Organization B paths.
6. Confirm save/error/retry feedback under a simulated network failure and that
   repeated clicks while pending do not duplicate creation.
7. At desktop, laptop, tablet and narrow mobile widths, verify canvas containment,
   toolbar overflow, touch targets, selection controls and no page-level
   horizontal scrolling.
8. Verify keyboard focus, Enter text editing, Escape deselection, Delete/Backspace
   archival and React Flow keyboard movement without intercepting text input.

---

# Phase 6 Implementation

- trusted built-in plugin definitions with explicit static discovery
- Zod-validated stable IDs, metadata, permissions, capabilities, navigation,
  event subscriptions, memory domains and future AI tool descriptions
- instance-scoped deterministic registry with duplicate ID/capability rejection
- controlled Lucide icon resolution and namespaced plugin routes
- organization-scoped enable/disable state with non-destructive semantics
- enabled-only capabilities, navigation, event dispatch and server route guards
- compact `/apps` management UI with OWNER/ADMIN controls and member reads
- guarded `/apps/example` development proof plugin with no business functionality
- focused Core/plugin import-boundary enforcement

---

# Phase 6 Database and Security

Migration: `supabase/migrations/20260825000800_plugin_framework.sql`

Introduced:

- `organization_plugins` with organization/plugin composite identity
- enable, disable, creation and update timestamps with member provenance
- active plugin index and stable safe plugin-ID constraint
- organization-member SELECT RLS and no direct browser writes
- OWNER/ADMIN-only `set_organization_plugin_enabled` with derived actor,
  validated organization membership and an empty `search_path`
- 19-assertion pgTAP suite at
  `supabase/tests/database/plugin_framework_rls.test.sql`

Disablement preserves the row and does not delete plugin data, memory,
configuration or historical activity. Unknown well-formed database IDs remain
inert because only the static application registry can provide behavior.

---

# Phase 6 Verification

Verified on 2026-08-26:

- `npm run format:check`: passed
- `npm run lint`: passed with 0 warnings
- `npm run typecheck`: passed
- full web suite: passed; 58 files and 241 tests
- `npm run build`: passed; `/apps` and guarded `/apps/example` compiled
- focused registry, event, enablement, UI, route and architecture tests passed
- Team member and invitation dates now use an explicit locale and UTC timezone,
  preventing server/client hydration differences during manual QA
- local pgTAP execution unavailable because Docker/Podman is not installed
- linked migration dry run: passed; only
  `20260825000800_plugin_framework.sql` is pending and no remote change was made

---

# Phase 7 Implementation

- server-only normalized AI messages, text/structured results and execution context
- provider-neutral `ModelGateway` with no raw provider clients in its public API
- OpenAI-compatible HTTP adapter usable with configured hosted endpoints
- Ollama through its local OpenAI-compatible endpoint without startup probing
- deterministic fake provider covering success, failure, timeout and usage paths
- typed model registry with logical fast, balanced and reasoning tiers
- capability, location, allowlist, budget and organization-policy-aware routing
- controlled local-to-remote fallback only when `REMOTE_ALLOWED` explicitly permits it
- Zod validation of provider JSON before typed structured results are returned
- explicit trusted tool registry with schemas, capability ownership and read/write/
  external-side-effect metadata; no autonomous tool execution loop
- bounded timeouts, cancellation signals and one conservative transient retry
- optional pricing metadata, normalized usage and estimated-cost accounting
- `/ai` organization policy, metadata-only run diagnostics and fixed-input AI
  connection test

---

# Phase 7 Database and Security

Migrations:

- `supabase/migrations/20260825000900_ai_foundation.sql`
- `supabase/migrations/20260825000910_fix_ai_trace_metadata_constraint.sql`

Introduced:

- controlled AI execution mode, logical tier, run status and error enums
- `organization_ai_policies` with default-deny behavior, provider allowlist and
  optional monthly estimated remote-cost ceiling
- `ai_runs` with server-derived actor, organization/plugin context, lifecycle,
  timing, usage, estimated cost and bounded safe trace metadata
- no API keys, complete prompts or model responses in either table
- organization-member SELECT RLS and no direct browser table writes
- OWNER/ADMIN policy mutation and OWNER/ADMIN/MEMBER lifecycle functions with
  pinned search paths, active membership and enabled-plugin checks
- 32-assertion pgTAP suite at
  `supabase/tests/database/ai_foundation_rls.test.sql`

VIEWER cannot execute AI. Plugin execution additionally requires static
registration, current organization enablement and a declared capability. Memory
domains are copied from the manifest for audit context only and grant no retrieval.

---

# Phase 7 Verification

Verified on 2026-08-26:

- formatting passed
- lint passed with zero warnings
- type checking passed
- 74 test files passed with 316 tests
- production build passed, including the `/ai` route
- linked Supabase migration dry-run passed and reported only
  `20260825000910_fix_ai_trace_metadata_constraint.sql` as pending
- dependency audit passed with zero production vulnerabilities
- migration and application security reviews passed

Local pgTAP execution was unavailable because Docker/Podman is not installed.
Interactive browser QA was unavailable because no in-app browser surface was
connected. The pgTAP suite and hosted/local provider behavior remain explicit
manual-QA steps.

Manual QA then exposed a Next.js runtime boundary defect: the AI `"use server"`
module exported its ordinary initial action-state object. The state now lives in
the shared AI schema module, the action module exports only an async Server
Action, and permanent boundary/page/data/UI tests cover the runtime convention,
disabled default policy, safe failure UI and policy mutation paths. The linked
migration was confirmed applied; the generic settings fallback was caused by
the same module-loader failure rather than a demonstrated database connection
failure.

Manual QA confirmed the migration, policy persistence and local Ollama setup,
then identified the absence of an authenticated application execution path. The
`/ai` page now provides a fixed-input `core.ai.connection-test` diagnostic for
OWNER, ADMIN and MEMBER. It calls `generateAIText`, obeys the existing
organization policy/router, records the normal run lifecycle and returns only
provider, model, duration or normalized error category. VIEWER cannot execute,
and the browser cannot supply prompts, organization/actor IDs, plugin identity,
provider URL/ID or model ID.

The first live connection test then failed before Ollama invocation. The applied
trace constraint used recursive JSONPath descent followed by `keyvalue()`, an
object-only method, so valid scalar trace values raised during the
`start_ai_run` insert. The run store discarded the database error as a plain
`Error`, which normalized to `unknown`. The forward-only corrective migration
replaces that expression with a type-safe recursive helper, retains nested raw
content-key rejection and adds stage/code-only server diagnostics. The linked
dry run reports only the corrective migration as pending.

---

# Phase 8 Implementation

- typed Company Knowledge composition over canonical company, audience, brand,
  marketing and competitor rows, including incomplete-profile handling
- explicit `knowledge_memories` records with organization, controlled domain,
  kind, provenance, source, actor timestamps and archive lifecycle
- OWNER/ADMIN/MEMBER human company-memory create, update, archive and restore;
  VIEWER remains read-only
- simple indexed text search plus kind, provenance and active/archive filters
- stable bounded retrieval: 50 general results and 20 AI-context results
- `/memory` Core workspace with canonical-profile status and no plugin-private
  domain disclosure
- server-only AI context builder requiring explicit domains and independently
  enforcing active membership, Core/plugin origin, static registration,
  enablement, exact capability and declared domains
- meaningful memory lifecycle activity without read/search noise or content copy
- no automatic promotion from tasks, comments, boards, uploads or AI drafts
- no embeddings, pgvector, semantic search, ingestion, RAG or provider calls

---

# Phase 8 Database and Security

Migrations:

- `supabase/migrations/20260825001000_company_knowledge_memory.sql`
- `supabase/migrations/20260825001010_company_memory_lifecycle.sql`

The table is SELECT-only to authenticated browser roles. RLS exposes only the
current organization's company domain. Narrow SECURITY DEFINER functions use an
empty search path, derive `auth.uid()`, force human/company provenance and deny
VIEWER/removed/cross-organization mutations. No generic plugin-provenance write
function or hard-delete grant exists.

The 23-assertion pgTAP suite is at
`supabase/tests/database/company_knowledge_memory_rls.test.sql`.

---

# Phase 8 Verification

Verified on 2026-08-26:

- focused memory/activity suite passed: 11 files, 33 tests
- formatting passed
- lint passed with zero warnings
- type checking passed
- full suite passed: 84 files, 347 tests
- production build passed, including `/memory`
- linked Supabase dry-run passed and reported only the two ordered TASK-010
  migrations as pending
- migration, application-boundary and secrets/security reviews passed
- no dependency was added or changed

Docker and Podman are unavailable, so the 23-assertion pgTAP suite could not run
locally. No hosted migration was applied. Hosted pgTAP and role/isolation/manual
responsive QA remain required.

---

# Phase 9 TASK-011 Implementation

- trusted Zod-backed Core/plugin job definitions with duplicate and provenance
  rejection, fixed schemas, timeout/retry/side-effect policy and execution class
- authenticated server-derived enqueue boundary with no browser-provided tenant,
  actor, provenance, capability, priority, retry, timeout or worker identity
- explicit optional idempotency plus 100-active-organization and
  25-active-creator queue protection
- atomic one-at-a-time `FOR UPDATE SKIP LOCKED` claims, leases, heartbeats,
  monotonic progress and concurrency-group transaction locks
- bounded deterministic retries, eligibility times, dead-letter retention,
  terminal timeouts and stale-lease recovery
- immediate queued cancellation and cooperative running cancellation
- generic server-only executor contract with AbortSignal, heartbeat,
  cancellation, progress and bounded validated output
- DATABASE, SERVERLESS and EXTERNAL_WORKER routing without implementing the
  TASK-012 Windows adapter
- harmless database-native `core.test.echo` plus documented one-minute Supabase
  Cron schedule
- protected `/jobs` operational workspace with safe metadata and role-aware
  enqueue, cancellation and manager retry
- no AI-run merger, memory write, domain workload, Redis, Edge Function, pg_net,
  continuously running Node process or VPS

---

# Phase 9 TASK-011 Database and Security

Migration: `supabase/migrations/20260825001100_heavy_job_infrastructure.sql`

The `jobs` table is SELECT-only to authenticated organization members. Narrow
enqueue/cancel/retry functions derive `auth.uid()` and enforce role, tenant and
plugin state. Claim, heartbeat, progress, complete, failure and reconciliation
functions are revoked from browser roles and granted only to trusted database/
service execution. All SECURITY DEFINER functions pin an empty search path.

Bounded JSON constraints reject secret and raw prompt/response key shapes.
Claimant plus an unexpired lease is required for every worker transition. The
54-assertion pgTAP suite is at
`supabase/tests/database/heavy_jobs_rls.test.sql`.

---

# Phase 9 TASK-011 Verification

Verified on 2026-08-27:

- focused jobs/plugin boundary suite passed: 12 files, 78 tests
- formatting passed
- lint passed with zero warnings
- type checking passed
- full suite passed: 93 files, 407 tests
- production build passed, including `/jobs`
- linked Supabase dry run passed and reported only
  `20260825001100_heavy_job_infrastructure.sql` as pending
- migration, RLS/grant, concurrency/claim, AI/memory boundary and secrets reviews
  passed
- no dependency was added or changed

One load-sensitive pre-existing whiteboard keyboard-history assertion failed in
the first combined verification run, passed immediately in focused isolation,
and the complete suite then passed unchanged. No whiteboard code or test
was modified for TASK-011.

Docker and Podman are unavailable, so the 54-assertion pgTAP suite could not run
locally. No hosted migration or Cron change was applied. Hosted pgTAP,
role/isolation/concurrency QA and responsive browser QA remain required.

## Manual-QA Job Control Fix

Resolved on 2026-08-27:

- Queue, schedule, cancel and retry controls now explicitly submit their Server
  Action forms instead of inheriting the shared design-system button's safe
  `type="button"` default
- component regression coverage protects the submit semantics for all four job
  lifecycle controls
- no job authorization, RLS, worker lifecycle or migration behavior changed
- focused component coverage passed: 1 file, 5 tests
- formatting, lint and type checking passed; the full suite passed with 93 files
  and 408 tests; the production build passed with `/jobs`

## Manual-QA Durable Enqueue Fix

Resolved on 2026-08-27:

- hosted QA proved the Server Action ran and the trusted `core.test.echo`
  definition existed, but `public.jobs` remained empty
- PostgreSQL resolved the original enqueue `CASE` lifecycle expression as
  `text`; inserting it into the `public.job_status` enum failed with SQLSTATE
  `42804` at the `insert into public.jobs` statement
- execution reached the INSERT statement, but PostgreSQL rejected the typed
  expression before creating a tuple; the failed RPC transaction rolled back
  with no durable row, explaining the empty `public.jobs` result
- forward-only migration
  `20260825001110_fix_job_enqueue.sql` replaces the already-applied function and
  explicitly casts both initial states to `public.job_status`
- linked lint also found the hosted database processor passed integer progress
  `50` to a `smallint` lifecycle RPC; the same forward migration replaces the
  processor with an explicit `smallint` argument so Cron can complete Core echo
- safe server diagnostics now retain only enqueue stage, SQLSTATE and normalized
  category while the browser continues receiving a generic failure
- pgTAP executes the real enqueue path and now verifies exactly one Core row,
  initial state/type/scope, cross-organization denial, unknown-type denial,
  roles, removal and idempotency
- the 59-assertion database suite also executes the real processor path through
  100% progress, one attempt, `SUCCEEDED` and bounded
  `{"acknowledged": true}` result metadata
- focused regression suite passed: 4 files, 28 tests
- `npm run verify` passed: formatting, lint, typecheck, 93 files / 410 tests and
  the production build including `/jobs`
- linked lint independently reports only the two known hosted function errors,
  SQLSTATE `42804` and `42883`, because the correction is intentionally pending
- linked dry run applied nothing and reports exactly
  `20260825001110_fix_job_enqueue.sql` pending
- the corrective migration remains unapplied; hosted pgTAP and full lifecycle
  retest are required after it is applied manually

---

# Phase 9 TASK-012 Implementation

- forward migration `20260825001200_windows_workers.sql`
- protected worker registrations and one-time pairing requests with digest-only
  secrets, 15-minute expiry, single consumption and revocation
- brokered worker API using a hosted-only Supabase service credential; the
  Windows machine receives no database or human credential
- atomic organization/capability-scoped EXTERNAL_WORKER claims reusing TASK-011
  job states, leases, cancellation, retry and completion transitions
- static Windows handler registry and `core.test.worker-echo` diagnostic only
- conservative single-job polling, bounded backoff, lease heartbeat,
  cancellation/timeout AbortSignal and graceful shutdown
- `/workers` safe status UI with OWNER/ADMIN pairing/revocation and member reads
- local config under the current Windows user's application-data directory
- no arbitrary command execution, native binary, Ollama, media or domain work
- 22-assertion pgTAP worker suite plus application and worker regression tests

Manual-QA hardening on 2026-08-27 moved the worker action state/type into a
non-`use server` schema module. The worker Server Action boundary now exports
only async actions, matching the Next.js 16/Turbopack runtime contract, with
regression coverage for the boundary, pairing, revocation and role checks.
Formatting and lint passed, both typechecks passed, 101 test files with 434
tests passed, and both production builds passed. No migration changed.

Further manual-QA hardening keeps `/api/worker/*` outside human-session proxy
redirects while retaining the broker's pairing/credential authentication. The
broker now normalizes thrown failures as JSON, the worker rejects unexpected
non-JSON responses without reading or printing their bodies, and the CLI exits
safely. The one-time pairing display includes an explicit transient-feedback
copy control without persisting or retransmitting the raw code. No migration
changed. Final corrective verification passed formatting, lint, both typechecks,
102 test files with 444 tests, and both production builds. One pre-existing
whiteboard async-history test failed once under the full-suite load, then passed
all 12 tests in isolation and passed in the subsequent complete suite without
code changes.

Hosted migration, broker configuration, pgTAP and end-to-end Windows manual QA
remain required. Final verification on 2026-08-27 passed formatting, lint,
worker/web type checking, 100 test files with 428 tests, both production builds,
the linked hosted-schema lint and a production dependency audit with zero known
vulnerabilities. The linked dry run detected only
`20260825001200_windows_workers.sql`. Docker and Podman are unavailable in this
environment, so the 22-assertion pgTAP suite remains a hosted QA step. The dry
run did not apply the migration.

---

# Phase 12 Implementation

- protected `/apps/marketing/creative-studio` route and Marketing navigation
- one explicitly selected active Reel Idea per run
- optional explicit selection of at most three eligible completed TASK-014
  analyses through a 12,000-character allowlisted abstract projection
- bounded 20,000-character canonical Company context without durable memory
  retrieval
- static Hook Strategist, Script Writer, and Creative Critic definitions
- one structured ModelGateway call per stage using balanced, balanced, and
  reasoning tiers with 90-second timeouts
- immutable run, selected-evidence, stage, and versioned Reel Brief history
- safe structured Reasoning History without prompts, provider output, or hidden
  reasoning
- client pending state plus server idempotency/advisory-lock duplicate protection
- failure short-circuiting with successful prior-stage preservation
- OWNER/ADMIN/MEMBER execute and VIEWER read-only behavior
- no jobs, worker, tools, external research, Marketing memory, memory writes, or
  TASK-016 agents

Migration: `supabase/migrations/20260825001500_creative_council_v1.sql`

Database QA: `supabase/tests/database/creative_council_rls.test.sql` contains 21
organization, role, transition-privilege, duplicate, isolation, and non-promotion
assertions. Hosted application and pgTAP verification remain required.

Automated verification on 2026-08-28 passed focused TASK-015 coverage (8 files,
48 tests), lint, worker/web type checking, the full worker suite (5 files, 32
tests), the full web suite (112 files, 513 tests), and both production builds.
All TASK-015 source and documentation files pass Prettier; the repository-wide
format command still sees inherited Windows line-ending status noise in
unchanged TASK-012/TASK-014 files, whose Git content has no diff. Linked
migration dry-run reports only `20260825001500_creative_council_v1.sql` pending;
no hosted change was applied. Linked database lint reports no existing-schema
errors. Local pgTAP could not run because Docker, Podman, and local PostgreSQL
are unavailable.

Hosted manual QA was subsequently accepted, and TASK-015 was externally merged
into `main` as `7a17d2b` on 2026-08-28. Its V1 contract remains exactly three
successful tool-free structured calls—Hook Strategist, Script Writer, and
Creative Critic—producing a versioned Reel Brief with safe structured Reasoning
History and no durable memory retrieval or write.

---

# Phase 13 TASK-016 Implementation

- static reusable definitions for Audience Researcher, Trend Researcher,
  Competitor Analyst, Content Strategist, Retention Editor, Visual Director,
  Brand Director, Creative Judge and Challenge Reviewer
- professional Challenge Reviewer identity
  `marketing.challenge-reviewer`, with bounded adversarial output and no claim
  that unsupported material is necessarily false
- separate synchronous Strategic Review bound to one exact immutable TASK-015
  Reel Brief version
- exact Audience -> Brand -> Strategy -> Challenge -> Judge order, five calls
  maximum, 60-second call timeouts and a 285-second overall deadline
- balanced tiers for Audience and Brand; reasoning tiers for Strategy,
  Challenge and Judge; all calls use the existing Marketing capability through
  ModelGateway
- explicit evidence/inference/assumption and supported/weak/unsupported/
  contradicted/requires-verification semantics
- immutable successful partial stages, linked AI-run provenance, normalized
  failure state and a versioned Strategic Council Review only after Judge
  success
- same-user/source active-run and idempotency protection while intentional later
  review versions remain possible
- Creative Studio execution, five-stage progress and structured review history;
  VIEWER remains read-only
- no durable memory retrieval/write, tools, competitor evidence, raw media,
  external research, job/worker execution or TASK-020 chat behavior
- TASK-015 Hook -> Script -> Critic semantics and Reel Brief history remain
  unchanged

Migration: `supabase/migrations/20260825001600_creative_council_expansion.sql`

Database QA: `supabase/tests/database/strategic_review_rls.test.sql` covers
service-only transitions, role/isolation boundaries, exact-source binding,
sequential stages, idempotency, immutable completion and non-promotion.

Automated verification on 2026-08-29 passed focused TASK-016/TASK-015 coverage
(9 files, 63 tests), lint, worker/web type checking, the complete worker suite
(5 files, 32 tests), the complete web suite (118 files, 559 tests), and both
production builds. A final UI/migration/orchestration pass after presentation
refinement passed 5 files and 35 tests plus the web production build. All
TASK-016 and updated documentation files pass Prettier. Repository-wide
`format:check` remains blocked by 40 inherited TASK-012/TASK-014 Windows
line-ending files with no TASK-016 content changes; they were not rewritten.

The linked migration dry-run applied nothing and reports exactly
`20260825001600_creative_council_expansion.sql` pending. Linked schema lint
reports one pre-existing warning in the already-applied TASK-015
`record_marketing_creative_council_stage` enum assignment; the new TASK-016
assignment uses explicit enum casts. Docker, Podman and local PostgreSQL are
unavailable, so the 29-assertion TASK-016 pgTAP suite remains a hosted QA step.

## TASK-016 Creative Judge Manual-QA Fix

Resolved on 2026-08-29. The hosted failed run correctly preserved Audience,
Brand, Strategy and Challenge successes, recorded Judge as failed, terminalized
the run and created no final review. Its fifth `ai_run` was `SUCCEEDED`, proving
that Ollama returned JSON which passed the provider envelope, JSON parsing and
the static Judge Zod schema. The workflow then rejected it because the Judge's
disposition set did not exactly cover the Challenge identifier. Raw Judge output
was correctly not retained, so omission versus a different identifier cannot be
distinguished retrospectively.

The Judge now receives a per-run provider-visible schema containing the exact
Challenge reference enum and exact required disposition count. The same dynamic
Zod schema remains authoritative, and the existing final set-equality check is
retained as defense in depth. ModelGateway also records bounded safe diagnostic
categories, validation issue codes/paths, finish reason and known token usage
for structured failures without storing response or prompt content. No database
migration was required.

Corrective verification passed 49 focused tests, followed by the final 44-test
focused regression set, a one-call local Ollama reproduction using the real
dynamic Judge schema, lint, worker/web type checking, the complete worker suite
(5 files, 32 tests), the complete web suite (118 files, 562 tests), and both
production builds. The combined repository suite is 123 files and 594 tests.

---

# Product Direction

Stylus is a collaborative startup operating system.

Initial major capabilities:

- team accounts
- organizations
- tasks
- deadlines and reminders
- comments
- notifications
- activity
- whiteboards/moodboards
- company knowledge
- plugin infrastructure
- AI infrastructure

The first major business plugin will be Marketing.

Marketing initially focuses on pre-product Instagram Reel strategy and
creative intelligence.

---

# Completed Planning

The following decisions have been made:

- Stylus will use a modular architecture.
- Core collaboration features are separate from business plugins.
- Marketing is the first business plugin.
- Marketing initially focuses on Instagram Reels.
- Marketing uses multi-agent creative reasoning.
- Competitor Reel analysis is required.
- Reel analysis includes hooks, scripts, visuals, branding and pacing.
- Company and Marketing memory are isolated from Web Agency memory.
- Working content is not automatically permanent AI memory.
- Team task management is required.
- Task reminders are required.
- Completed tasks remain visible for approximately 14 days before being
  moved to an archive.
- Archived tasks are not automatically deleted.
- Collaborative whiteboards/moodboards are required.
- Whiteboards support images, text, sticky notes and comments.
- Stylus must use a professional SaaS UI.
- UI icons use Lucide rather than emojis.
- Initial hosting should avoid mandatory VPS costs.
- The production application must not depend on the developer laptop.
- The Windows laptop may act as an optional heavy AI/media worker.
- Codex sessions use repository documentation for continuity.

---

# Current Technology Direction

Frontend:
- Next.js
- TypeScript

UI:
- Tailwind CSS
- shadcn/ui
- Lucide React

Authentication:
- Supabase Auth

Database:
- Supabase PostgreSQL

Realtime:
- Supabase Realtime where useful

Vector search:
- deferred; pgvector is not installed by TASK-010

File storage:
- Supabase Storage initially

Queue/cache:
- Upstash and/or persisted PostgreSQL job infrastructure depending on
  workload

Local AI:
- Ollama

Heavy worker:
- Python
- Windows-compatible

Media:
- FFmpeg
- OpenCV

Transcription:
- local whisper.cpp CLI with operator-installed model

---

# Hosting Constraint

Initial production infrastructure should have no mandatory paid VPS.

The developer's laptop is NOT a production application server.

Stylus must remain available to teammates while the laptop is powered
off.

Heavy jobs may remain queued until an eligible worker becomes available.

---

# Current Work

TASK-020 Ask Council is implemented locally on its task branch and awaits final
verification, hosted migration and bounded manual acceptance. TASK-015 Create,
TASK-016 Strategic Review, TASK-017 research and TASK-018 performance contracts
remain unchanged.

---

# Known Issues

Database pgTAP still requires Docker/Podman or hosted execution when a local
database is unavailable. Ask Council's synchronous parallel-specialist workflow
must be exercised on the target hosted AI policy/provider path before merge.
TASK-019 remains deferred and is not an Ask Council dependency.

---

# Next Recommended Action

Finish TASK-020 local gates, apply only
`20260825002000_ask_council.sql` in hosted Supabase, then run one bounded
Research/Performance/combined advisory acceptance sequence and audit exact
provenance, AI-call counts, Viewer denial and zero downstream side effects.

---

# Next Session Handoff

TASK-015 is complete and merged. Its synchronous Create workflow remains Hook
Strategist (`balanced`) -> Script Writer (`balanced`) -> Creative Critic
(`reasoning`) -> versioned Reel Brief, with exactly three successful calls, no
tools, no durable memory retrieval/write, and safe structured Reasoning History.

TASK-016 adds Audience (`balanced`) -> Brand (`balanced`) -> Strategy
(`reasoning`) -> Challenge (`reasoning`) -> Judge (`reasoning`) over an exact
Reel Brief, with five calls maximum, 60-second call timeouts and a 285-second
deadline. Successful stages and final versions are immutable; failures preserve
prior stages and never fabricate a review. Trend, Competitor, Retention and
Visual are registered but unused in V1.

TASK-020 is the implemented Ask Council advisory product: deterministic bounded
question routing to the smallest approved specialist workflow and one
synthesized team-facing answer. It preserves organization/RBAC/plugin/AI-policy
boundaries, ModelGateway-only execution, agency-memory isolation, explicit
bounded context, exact provenance and no automatic memory writes, arbitrary
tools, spawning or raw chain-of-thought. It reads existing TASK-017 research and
TASK-018 performance evidence but never launches or mutates those workflows.

---

# Historical TASK-014 Handoff

Read:

1. AGENTS.md
2. PROJECT_STATE.md
3. CODEX_TASKS.md
4. docs/ROADMAP.md
5. docs/DECISIONS.md

TASK-014 is implemented on `codex/task-014-competitor-reel-analysis`; its hosted
migration is applied. Real Windows QA completed extraction and transcript
persistence, then ModelGateway recorded a LOCAL_ONLY Ollama
`provider_unavailable` failure before structured interpretation could persist.
The affected job exhausted its bounded retries and is now `DEAD_LETTER`; it must
not be executed again.

V1 accepts manually uploaded MP4 files only (100 MiB maximum, 180 seconds
maximum analyzed duration). A source/Instagram URL is bounded metadata and is
never fetched. Private organization-scoped Storage holds source media;
archiving preserves media and history until a future controlled cleanup tool.

The optional outbound Windows worker performs fixed FFmpeg/ffprobe extraction
and local whisper.cpp transcription, then the hosted application performs
text-only structured interpretation through ModelGateway. OCR, semantic vision,
Instagram acquisition, automatic memory promotion, and TASK-015 Creative
Council work remain deferred. Local database lint/pgTAP are pending because the
current machine has no Docker/Podman PostgreSQL stack.

TASK-014 corrective hardening removes the Python/faster-whisper/PyAV/CTranslate2
runtime because Windows Smart App Control blocked PyAV 18.1.0 during manual QA.
Stylus does not weaken Windows security. The worker now advertises Marketing
analysis only when its configured whisper.cpp CLI executes successfully, its
model is readable, and the required structured-output contract is available.
Corrective verification passed formatting, lint, both typechecks, 30 worker
tests, 468 web tests (498 total), and both production builds. No dependency or
database migration changed.

The interpretation correction preserves the safe ModelGateway route and
lets the existing terminal-job trigger own Reel/analysis failure state instead
of marking domain records failed while a retry is scheduled. The broker returns
a normalized retry category to the worker, the worker preserves it in the
dedicated failure report, and safe server diagnostics identify request-schema
versus RPC/claim failures without logging media, transcripts, tokens, or
credentials. A retry currently repeats deterministic extraction and local
transcription before interpretation; resumable interpretation is deferred.

Second Windows QA reached Ollama with `qwen3:1.7b`. The exact strategic schema
contains `summary.maxLength: 2000`; llama.cpp's grammar parser rejects a single
repetition count at its 2,000 sanity threshold. Synthetic requests reproduce 400
at 2,000 and succeed at 1,999. The Ollama adapter now omits only string bounds it
cannot represent, while the unchanged Zod schema remains the authoritative
post-response validator. Structured HTTP 400 is normalized as
`invalid_response`, which maps to non-retryable `validation_failed`.

Hosted metadata shows the QA job is `FAILED` at attempt 1/3 with
`validation_failed`. That terminal row proves its authenticated failure report
reached the database RPC; the separately observed `/fail` 400 was not the
accepted report's response. Exact `validation_failed`/`false` serializer and
broker coverage is now permanent, and safe diagnostics distinguish malformed
failure envelopes from malformed payloads without logging either body.
Earlier provider tests used small synthetic schemas and mocked HTTP, so they
never exercised llama.cpp's grammar threshold. Earlier failure tests covered
`provider_unavailable`/`true`, not the exact `validation_failed`/`false` pair or
the persisted hosted transition.

## Phase 14 TASK-017 External Research

TASK-017 adds one durable `marketing.external-research.run` SERVERLESS job and
an authenticated hosted executor that processes at most one claim per Cron
invocation. Research requests atomically create the domain run and job, enforce
one active run per organization and five submissions per hour, and derive
organization/actor authority on the server. Hacker News uses a fixed official
API host; up to two RSS/Atom feeds pass through centralized HTTPS-only,
pinned-DNS safe fetch with redirect, address, timeout and byte revalidation.

Deterministic code normalizes plain text, applies the 20-item/24k-character
ceilings, hashes and deduplicates, then persists immutable source and EVID-n
records. A partial run may synthesize retained evidence after source failures.
Zero evidence fails without a report. Synthesis uses exactly one maximum
`generateAIStructuredForTrustedJob` call at balanced tier and validates every
source-backed reference before persisting the immutable report. Retrieved
evidence remains auditable when AI policy/provider execution fails.

No Reddit, generic search, article crawling, Windows-worker dependency,
automatic Council research, agency memory, or automatic knowledge/memory write
was introduced. TASK-015 and TASK-016 remain unchanged. Local pgTAP execution
requires Docker/Podman, which was unavailable during implementation. The final
linked dry run passed and reported
`20260825001700_external_research.sql` pending; nothing was applied. Linked
database lint completed with only the pre-existing TASK-015 enum-assignment
warning. The TASK-017 pgTAP suite and hosted manual QA remain
deployment checks.

Focused TASK-017 verification passed 12 files / 60 tests. The final complete
suite passed 128 web files / 616 tests plus 5 worker files / 32 tests (648
tests total). Repository lint, worker/web typechecks and worker/web production
builds passed. Every TASK-017 source/document file passes targeted Prettier.
Repository-wide Prettier still reports the 55 known unrelated legacy/Windows
formatting files; they were preserved rather than rewritten.

### TASK-017 Vercel Hobby execution correction

Vercel Hobby rejects sub-daily Cron expressions, so the recovery schedule is
now `0 3 * * *` (daily at 03:00 UTC, with Hobby timing variance). A successful
hosted enqueue registers a stable Next.js `after()` callback that runs the same
registry-backed `JobExecutor` after the Server Action response. The callback
targets only the trusted job ID returned by the service-only atomic enqueue;
`20260825001710_claim_serverless_job.sql` adds the service-only `SKIP LOCKED`
claim needed to preserve exact-job execution and concurrent claim safety.

The durable job remains authoritative. Immediate execution failure leaves an
unclaimed job queued, and the authenticated daily Cron route drains at most one
remaining SERVERLESS job. Both paths use the same registry, store and atomic
database lease. Hobby functions are limited to 60 seconds even though the
durable job contract retains its 120-second timeout; runs exceeding the hosted
function window fail safely and require a platform with a longer function
duration rather than bypassing the queue or AI policy.

Corrective verification passed 9 focused files / 41 tests, 131 web files / 627
tests and 5 worker files / 32 tests (659 full-suite tests total). Lint,
worker/web typechecks, worker/web production builds and targeted formatting
passed. The pgTAP plan now contains 35 assertions. Linked migration dry-run
reported exactly `20260825001700_external_research.sql` and
`20260825001710_claim_serverless_job.sql` pending and applied neither. Linked
database lint still reports only the pre-existing TASK-015 warning.

### TASK-017 Hacker News hosted-QA correction

Hosted QA proved that the fixed HN stream and its sampled item requests had
completed successfully, but all candidates were removed at filtering because
each multi-word query input was previously required to occur as one contiguous
literal phrase. The `no_results` outcome therefore represented stage-C zero
matches, not a Vercel timeout, Firebase transport failure or RSS safe-fetch
rejection.

Filtering now tokenizes normalized Unicode query inputs and candidates, then
matches deterministic bounded keywords. HN payloads receive strict bounded
schema validation and deleted, dead, non-story and blank candidates remain
ineligible. HN and RSS adapters persist healthy zero-candidate/zero-match
observations as successful sources while zero retained evidence still prevents
synthesis and safely fails the overall run. Actual retrieval failures retain
their existing database category plus a safe diagnostic category and bounded
counts/HTTP status in existing `safe_metadata`.

No `01720` migration was required for that matching-only correction: the
applied source table already supported a successful observation with a
deterministic content hash and bounded JSON metadata. SSRF policy, fixed HN
host, RSS pinned-DNS/TLS hostname validation,
redirect revalidation, byte/time bounds, immutable provenance, one synthesis
maximum and job claim/idempotency boundaries remain unchanged.

Corrective verification passed 14 focused files / 79 tests, 131 web files / 634
tests and 5 worker files / 32 tests (666 full-suite tests total). Lint,
worker/web typechecks, worker/web production builds and targeted formatting for
all 16 changed files passed. Repository-wide Prettier continues to report only
the same 55 unrelated baseline files; none was rewritten. Hosted QA confirms
`01700` and `01710` are applied, and this correction adds no migration.

### TASK-017B External Research content enrichment

TASK-017B preserves the durable TASK-017 job and enriches only the first two
deterministically matched HN stories. Each matched story can yield separate
`HN_STORY`, `HN_TEXT`, `HN_COMMENT` and `ARTICLE_CONTENT` evidence. Discussion
selection keeps at most five top-level comments per story, the first listed
reply when usable at one nested level, and ten comments per run. Linked articles are limited
to two unique HTTPS URLs per run and pass through the existing pinned-DNS fetch
boundary before deterministic `htmlparser2` extraction and paragraph-based
chunking.

The runtime reserves the 60-second Hobby window: retrieval is capped at 20
seconds, article/comment requests at 8 seconds each, synthesis at 25 seconds,
the complete workflow at 55 seconds, and five seconds are reserved for durable
completion. Article responses are capped at 512 KiB; extracted article text at
4,500 characters in at most three 1,500-character chunks; evidence at 20 items,
24,000 total persisted characters, 18,000 synthesis-evidence characters and a
40,000-character serialized synthesis context. Enrichment
network concurrency is at most two inside the existing three-request gate.

`20260825001720_external_research_content_enrichment.sql` is the forward-only
schema correction. It extends immutable evidence with typed per-item
provenance, content hashes and bounded metadata, replaces only the service-only
retrieval RPC, preserves RLS and does not rewrite `01700` or `01710`. The pgTAP
plan now includes 38 assertions. Hosted evidence rows confirm that the migration
has been applied to Supabase.

Article/comment failure remains partial when story evidence survives. Safe
diagnostics include `extraction_failed` and `empty_content`; no response body,
header, address, stack trace, prompt, credential or raw model output is stored.
Exactly one trusted ModelGateway synthesis remains the maximum, with external
text explicitly treated as untrusted quoted data and no tool or memory access.
TASK-017C remains future fashion-oriented source expansion: Reddit plus bounded
web/fashion-editorial discovery. Social-platform intelligence remains separate.

Focused TASK-017B verification passed 8 files / 72 tests. The final complete
suite passed 132 web files / 655 tests plus 5 worker files / 32 tests (687 tests
total). Targeted formatting, repository lint, worker/web typechecks and both
production builds passed. The linked migration dry-run reported only `01720`
pending and applied nothing; linked database lint reported only the pre-existing
TASK-015 enum-assignment warning. The 38-assertion pgTAP suite was updated, but
local execution remains blocked because the local Supabase Docker database is
not running.

Hosted QA later proved that linked-article transport stopped before opening a
socket on Node 24: the HTTPS client requested an `all: true` custom lookup
result, while the pinned lookup returned the legacy scalar callback shape.
Node rejected that shape with `ERR_INVALID_IP_ADDRESS`, previously normalized
as `connection_failure`. The lookup now returns the same single validated pin
as a one-entry array when requested, retains scalar compatibility otherwise,
and categorizes that runtime-contract error as `transport_failure`. No SSRF,
DNS, TLS, redirect, size, timeout, tenant or evidence boundary changed.

Corrective verification passed 3 focused files / 45 tests and the complete web
suite at 132 files / 656 tests. Targeted formatting, web lint, worker/web
typechecks and both production builds passed. No migration or hosted database
change is required for this transport correction.

The next hosted enriched run proved retrieval and all 12 evidence rows, then
made one `openai-compatible` / `remote-default` structured attempt. A prior
attempt returned 1,598 of the 1,600 allowed output tokens with finish reason
`length` and `structured_output_truncated`; the enriched retest returned no
provider response before the former 25-second synthesis timeout. Neither case
reached evidence-reference post-validation or report persistence. The exact
14,190-character, 12-evidence synthesis context was below its 40,000-character
ceiling.

Synthesis now supplies a per-run structured schema whose evidence-reference
enum is exactly the EVID identifiers in context, preserves post-validation,
and bounds report breadth so a useful concise report fits the unchanged 1,600
output-token ceiling. The synthesis allowance is 35 seconds inside the existing
55-second workflow and five-second durable-completion reserve; timeout remains
single-attempt and safe. Evidence display sorts numeric EVID suffixes without
changing immutable IDs. No retrieval, migration, provider, authorization,
prompt-injection, memory, tool or one-call boundary changed.

Synthesis corrective verification passed 4 focused files / 31 tests and the
complete web suite at 132 files / 659 tests. Targeted formatting, web lint,
web typecheck and the web production build passed. Worker code was unaffected,
so its suite/build were not rerun. No migration was added or changed.

A final hosted `Creepy Crawlies` run proved the complete enrichment path with
13 immutable evidence rows, including three `ARTICLE_CONTENT` chunks. Its one
AI attempt returned 1,598 tokens with finish reason `length`; the durable
diagnostic was again `structured_output_truncated`, so JSON validation could
not produce typed data and report persistence was not reached. This was not a
provider timeout: the AI run completed in 32,288 ms inside the 35-second limit.

The remaining defect was a mismatch between the 1,600-token ceiling and the
synthesis schema's still-permissive maximum response: the prose requested
conciseness, but the schema allowed six findings, four patterns, four
recommendations and substantially longer text. Synthesis-only hard limits now
match the prompt at four findings, two patterns, two recommendations, one
disagreement and two inferences, with shorter field and citation bounds. All
13 input evidence records remain available, the exact per-run EVID enum and
post-validation remain intact, and the one-call/35-second/provider-policy
contracts are unchanged. No migration is required; hosted retest remains.

Final response-bounds corrective verification passed 4 focused files / 32
tests and the complete suites at 132 web files / 660 tests plus 5 worker files
/ 32 tests (692 tests total). Targeted formatting, repository lint, worker/web
typechecks and both production builds passed. No migration was added or changed.

Two independent post-`a686c2e` hosted synthesis attempts then failed earlier at
the provider-envelope boundary. `Creepy Crawlies` and the separate CDLM article
both received HTTP-success JSON that did not match the OpenAI-compatible
envelope; neither exposed usage, finish reason or `message.content`, and neither
reached report JSON parsing, dynamic EVID validation or persistence. The CDLM
AI run `fec8fd9e-f518-4aaf-bd4d-6596d0a2ad36` failed after 7,869 ms with
`provider_envelope_invalid`, independently establishing a repeated provider
response pattern rather than another timeout or truncation.

The adapter remains fail-closed. Provider-envelope failures now retain only up
to five Zod issue codes and bounded schema paths in the existing 500-character
safe diagnostic. Raw bodies, field values, content, prompts, headers,
credentials and arbitrary provider error text remain discarded, and the Zod
error object is not attached as an error cause. This is observability hardening
only: provider validation, research behavior, schema, timeout, retry,
provenance, persistence and routing are unchanged. No migration is required.

Provider-envelope diagnostic verification passed 4 focused files / 38 tests
and the complete suites at 132 web files / 662 tests plus 5 worker files / 32
tests (694 tests total). Targeted formatting, repository lint, worker/web
typechecks and both production builds passed.

The deployed `a4727726` CDLM run subsequently proved that its provider envelope
was valid: one `remote-default` attempt returned `finishReason=stop`, complete
usage metadata and string `message.content`. The gateway then failed before
report-schema validation because that string was malformed JSON. The generated
request used `response_format.type=json_schema`, `strict=true`, a closed schema
whose object properties are all required, and the exact EVID-1 through EVID-10
enum. No prompt, response body or generated content was retained or inspected.

OpenRouter documents that provider routing otherwise permits providers to
ignore unsupported parameters. Structured requests to the exact OpenRouter
host now add `provider.require_parameters=true`; other compatible endpoints and
ordinary text requests are unchanged. The `openrouter/free` alias remains a
random, changing free-model pool and is unsuitable as a deterministic hosted
structured-output contract. Deployment should select a concrete advertised
structured-output model before the single report-success retest. No migration,
retry, JSON repair, timeout/token increase or research-boundary change is
required.

Final hosted acceptance passed on the concrete-model deployment. Research run
`1a293e26-3946-4574-a4e7-5e2dd5e6ddfc` persisted one `HN_STORY`, ten bounded
`HN_COMMENT` records and three `ARTICLE_CONTENT` chunks with typed provenance.
Its single `remote-default` structured attempt finished with `stop`, validated
the exact per-run evidence enum including cited `EVID-14`, and created exactly
one immutable version-1 Research Report. No retry, repair, additional model
call, memory write or downstream Council workflow occurred.

### TASK-017C Fashion Marketing Intelligence

TASK-017C extends the merged durable research job without changing its enqueue,
immediate hosted execution, daily recovery, claim/lease, authorization or AI
policy boundaries. One server-derived intent produces an inspectable controlled
source plan. Reddit is selected for consumer discussion/language intents,
curated editorial feeds support fashion and retail context, and Hacker News is
selected only for `FASHION_TECH`.

Reddit uses application-only OAuth against fixed official hosts only when the
operator has explicit Reddit approval and enables complete server-only
configuration. The code-owned Marketing registry selects at most two relevant
communities and two query variants. Missing approval/configuration is a safe
unavailable source; there is no HTML, cookie, browser-session or anti-bot
fallback. Curated Vogue and Retail Dive feeds and their allowlisted articles use
the existing pinned-DNS HTTPS boundary. A narrow optional search-provider
interface exists, but no paid provider is required or configured.

The immutable evidence contract adds `REDDIT_POST` and `REDDIT_COMMENT` while
retaining all TASK-017B types. One maximum ModelGateway call classifies bounded
fashion signals and produces strategic Content Opportunity Candidates, never
finished hooks, scripts, shots, CTAs, captions or Council decisions. Every
signal and opportunity has one to three exact current-run EVID references; the
application and database independently reject foreign references. Deterministic
source coverage exposes family diversity, failures and unavailability.

Forward migration
`20260825001730_fashion_marketing_intelligence.sql` extends adapter/evidence and
report-version checks, replaces only the enqueue/completion functions, and
retains the existing RLS, immutable-history triggers, one-active-run constraint,
five-runs/hour limit and service-role-only lifecycle. No Council, memory,
TASK-018 or TASK-020 execution was added. TASK-017D remains future social/visual
source discovery.

Verification completed on 2026-08-31: 9 focused files / 77 tests and the full
135-file / 700-test web suite passed; repository lint, worker/web typechecks,
the web production build, scoped TASK-017C formatting and npm audit passed with
zero vulnerabilities. The linked Supabase dry run confirmed only
`20260825001730_fashion_marketing_intelligence.sql` is pending and applied
nothing. Local pgTAP remains a hosted-verification item because Docker/Podman is
not installed on this machine.

Hosted QA then found that the shared token matcher accepted two unrelated Vogue
items because each explicit multi-word term contained the generic token
`fashion`. TASK-017C now applies a dedicated deterministic editorial relevance
profile: meaningful explicit-term concepts take precedence, generic
fashion/request vocabulary cannot establish relevance, and meaningful question
concepts are only a fallback when the explicit terms contain no usable topic.
Feed metadata is gated before article fetching and safely extracted article
content is checked independently before it can become evidence. The two hosted
oversize diagnostics were confirmed as Vogue article bodies correctly rejected
by the unchanged 512 KiB limit. Corrective verification passed 7 focused files /
52 tests, the complete 136-file / 708-test web suite, scoped formatting, lint,
web typecheck and the production web build. No migration was required.

Final hosted acceptance passed after corrective commit
`9bbe02a7b23cd74f06b3b09025201c32ec6c382f`. Initial hosted QA had retained
unrelated Vogue evidence because generic `fashion` overlap was accepted. An
intermediate 15:58 UTC run persisted `AUDIENCE_PAIN` because that intent was
selected by the operator; it was not an intent-propagation defect. The final
deliberate `TREND_SIGNAL` run
`d49b4df5-bc5e-4f1b-9571-bc1706915a39`, backed by job
`671777c3-b743-411f-952c-178323c9924f`, checked 30 Vogue and 10 Retail Dive
candidates, retained zero matches, and safely failed retrieval while Reddit was
unavailable by policy. Hacker News was not selected. It persisted zero evidence
and reports and created zero AI runs, Council invocations or memory writes; no
TASK-017D, TASK-018 or TASK-020 behavior ran. Refusing to synthesize unsupported
sustainable-fashion claims is the correct zero-evidence outcome.

### TASK-017D Fashion Social Intelligence

TASK-017D extends the existing durable External Research workflow with a common
`SOCIAL` adapter boundary and first-class Instagram, TikTok, YouTube and
Pinterest capability states. Official-policy review intentionally activates no
production transport in V1: Meta professional/public-content access requires
approval and an account authorization lifecycle; TikTok Research Tools exclude
commercial product use; YouTube public discovery conflicts with the current
immutable evidence lifecycle's 30-day refresh/deletion obligations; and
Pinterest has no configured arbitrary public-listening path. Selected social
sources therefore return bounded `source_unavailable` observations and never
fall back to scraping, private APIs, browser automation or consumer sessions.

The deterministic planner adds social only to relevant consumer/competitor
intents and leaves `FASHION_TECH` unchanged. Browser input cannot select a
platform, profile, competitor, organization, actor, provider or model.
Organization-scoped competitor identities reuse `marketing_competitors` and are
validated by RLS plus the service-only enqueue function. Typed immutable social
evidence preserves platform, native/parent IDs, public account context,
retrieval/publication times, modality, deterministic hashes and bounded metrics.
Comment authors are not retained. Caption/comment/metadata evidence cannot
support visual claims, and competitor claims require configured competitor
provenance.

Ordinary research still performs deterministic retrieval/filtering/deduplication
and exactly zero or one trusted ModelGateway synthesis. It invokes no media
worker, Council, Reel Brief, memory, posting, TASK-018 or TASK-020 path. The
forward migration is `20260825001740_fashion_social_intelligence.sql`; the
predeployment linked dry run reported exactly that migration pending and
applied nothing. The hosted migration ledger now contains the same migration.
Local pgTAP remains unavailable because Docker/Podman is not installed.

Hosted acceptance passed on 2026-09-01 with `AUDIENCE_LANGUAGE` run
`823ef89e-bfae-4dda-9e53-11a61bd23f72` and durable SERVERLESS job
`b7e064d4-868c-44dc-811c-eacbb9f0a3b0`. The persisted deterministic plan
selected `REDDIT` plus `SOCIAL`; the social adapter resolved to `YOUTUBE` and
recorded `POLICY_DENIED` / `source_unavailable`, while Reddit recorded the same
safe unavailable outcome. The run and job failed safely with zero evidence,
zero reports, a null `synthesis_ai_run_id`, and zero attributable `ai_runs`.
The bounded execution window also contained zero Creative Council or Strategic
Review runs, zero memory writes, and no downstream job other than this External
Research job; TASK-018 and TASK-020 did not execute. This fail-closed result is
the correct V1 acceptance behavior and produced no unsupported social claims.

### TASK-017E Fashion Web & Consumer Evidence Expansion

TASK-017E implementation is complete locally and hosted acceptance is pending.
The deterministic fashion planner can add a `WEB` family only for applicable
intents and only when bounded server-built query variants contain meaningful
concepts. Tavily Search is the fixed-host discovery provider; its response is
transient candidate metadata, not evidence. Stylus requests no answer or raw
content and persists no provider snippet. Every retained URL independently
passes public-HTTPS policy, robots policy, pinned-DNS safe fetch with redirect
revalidation, deterministic article extraction and the existing fashion
relevance gate before immutable `WEB_PAGE` evidence is created.

Per run, the implementation permits at most three search queries, eight search
results per query, twelve unique candidates, six attempted page fetches, four
retained pages, two 1,500-character chunks per page and eight web evidence rows,
under the existing concurrency-three, four-MiB, 20-evidence, 20-second
retrieval, 35-second synthesis and 55-second workflow ceilings. A run still
makes exactly zero or one trusted ModelGateway call and invokes no Creative
Council, memory, worker, TASK-018 or TASK-020 path.

The forward migration is
`20260825001750_fashion_web_consumer_evidence.sql`. It adds only the controlled
adapter/evidence/report contract and forward-replaces the service-role enqueue
and completion validation functions. Existing RLS, one-active-run,
five-runs/hour, immutable history and organization/plugin boundaries remain.
Do not mark TASK-017E complete or merge-ready until one deliberate hosted
acceptance run passes.

Local verification passed on 2026-09-01: 10 focused files / 125 tests, the full
141-file / 791-test web suite, 5 worker files / 32 tests, repository lint,
worker/web typechecks, both production builds, scoped formatting, migration
contracts and npm audit with zero vulnerabilities. The linked dry run reported
only `20260825001750_fashion_web_consumer_evidence.sql`. Its first apply exposed
an ambiguous inline `CASE` parser boundary in the enqueue function; the
unapplied migration was corrected to compute the source-count limit in a typed
local variable. PostgreSQL then accepted the migration and the linked ledger
now records `01750` applied. Local pgTAP could not run because Docker/Podman is
unavailable. Hosted acceptance remains the only completion gate.

The first deployed acceptance run
`60e2773d-4f5e-474a-a1fa-0d90b6f43c5b` (job
`addf9949-069c-44f2-bb8e-1d3a3cc88154`) exposed a shared persistence defect:
three Tavily candidates independently passed URL policy, robots, safe fetch,
extraction and fashion relevance, but `buildRetrievalPersistence` did not
include the new `WEB_PAGE` evidence type in its deterministic priority list.
The durable run therefore recorded three successful full-page source
observations but zero evidence, AI runs or reports and failed safely. The
handler now prioritizes `WEB_PAGE` drafts, with a regression proving exact
`EVID-1` persistence and one trusted synthesis. Focused verification passes 2
files / 17 tests; the complete web suite passes 141 files / 792 tests together
with lint, web typecheck, scoped formatting and the production web build. The
failed run is immutable.

The second deployed run `197b9fc3-e7c3-4907-91e1-e4255b7db5ce` (job
`fef4a84b-b675-45c9-93c6-2ab1f40337c0`) proves the retrieval correction: three
independently fetched pages produced five immutable `WEB_PAGE` evidence rows.
Its single ModelGateway run succeeded, but the workflow then failed during
application-side semantic validation because the provider schema still
permitted competitor or visual sections that text-only, non-competitor web
evidence could not support. The synthesis schema now derives those two section
limits from current-run evidence capability, preventing unsupported claims
before generation while retaining the defensive post-gateway validator.
Focused verification passes 2 files / 22 tests and the complete web suite
passes 141 files / 793 tests, plus lint, worker/web typechecks and both
production builds. One final deployed retest remains required; both prior runs
remain immutable.

### TASK-018 Performance Learning

TASK-018 adds `/apps/marketing/performance` and forward migration
`20260825001800_performance_learning.sql`. Authorized OWNER, ADMIN and MEMBER
roles can manually register an Instagram Reel, optionally bind it to one exact
same-organization immutable Reel Brief version, and append timestamped manual
performance snapshots. VIEWER remains read-only. Publication identity is
archived/restored rather than hard-deleted; snapshots, learnings and their
evidence joins reject update and delete at the database boundary.

Every raw metric is nullable, so unavailable remains distinct from a supplied
zero. Counts are nonnegative and capped below JavaScript's unsafe-integer
boundary; time values are nonnegative decimals and completion rate is stored on
the normalized 0–1 scale. Deterministic read-time calculations use explicit
reach/view denominators and return unavailable for missing or zero
denominators. UTC observation age maps to `EARLY` [0,24h), `SHORT_TERM`
[24h,72h), `SEVEN_DAY` [72h,8d), or `MATURE` [8d,+∞).

Learning derivation is synchronous and bounded to 100 publications, 500
snapshots and 20 new artifacts. It selects the latest snapshot per publication
and horizon, then compares a segment's median `SAVE_RATE_BY_REACH` with the
same-organization Instagram/horizon median. The baseline requires at least five
publications and an explicitly classified segment requires at least three.
Strength is `WEAK` for 3–4 segment items, `MODERATE` for 5–9 and `STRONG` for
10 or more; labels are descriptive rather than statistical significance.

The optional publication classification reuses the exact TASK-017C controlled
Content Opportunity taxonomy. It is selected explicitly, never inferred from
Reel Brief text, research or AI; missing stays NULL and cannot enter a segment.
Each immutable learning stores sample counts, unrounded numeric medians,
difference, strength, caveats, algorithm `marketing-performance-learning-v1`,
and exact content/snapshot/Reel-Brief provenance. A content-identical derivation
is idempotent; changed evidence creates a new historical artifact.

No ModelGateway, Creative Council, Strategic Review, External Research, memory,
durable job or TASK-020 path executes. Future official platform adapters may
only produce a validated normalized snapshot draft and must pass the same
organization, metric, timestamp, provenance and immutability boundary. Future
Council work may retrieve explicitly selected learnings through a new
authorized bounded projection; TASK-018 does not add that integration.

Final local verification passes 5 focused files / 46 tests, the worker suite at
5 files / 32 tests and the web suite at 146 files / 839 tests (151 files / 871
tests total). TASK-018 scoped formatting, repository lint, worker/web
typechecks, both production builds and npm audit (zero vulnerabilities) pass.
TASK-018 subsequently passed hosted acceptance and was merged to `main` at
`e3c14bb`. Its migration and immutable Performance Learning contract are now an
accepted read-only input boundary for TASK-020.

### TASK-019 Web Agency Integration

TASK-019 is **DEFERRED**, not cancelled or renumbered. The separate
`ai-web-agency` implementation is not yet mature enough for a stable integration
contract. TASK-020 contains no Web Agency integration and has no agency-memory
access.

### TASK-020 Ask Council

TASK-020 adds `/apps/marketing/council` and forward migration
`20260825002000_ask_council.sql`. OWNER, ADMIN and MEMBER may ask questions;
VIEWER can inspect organization-scoped history but cannot execute AI. The
browser supplies only a bounded question, controlled intent, idempotency key and
optional artifact selections. Organization, actor, specialist route, provider,
model and provenance are trusted server concerns.

Routing is deterministic under `marketing-ask-council-routing-v1`. Each intent
selects one to three statically registered Marketing specialists; V1 mappings
select two. Specialists execute in parallel through ModelGateway at the
`BALANCED` tier, followed by exactly one synthesis only when every specialist
succeeds. The workflow therefore makes at most four ModelGateway calls, has no
workflow retry or autonomous loop and is bounded to 55 seconds, 900 output
tokens per specialist and 1,500 synthesis output tokens. A specialist failure
fails the turn without synthesis; synthesis failure creates no assistant
message.

Context selection prefers explicit selections, then structured relevance, with
recency only as a tie-breaker. It includes bounded canonical company context,
up to two existing Research Reports/six cited EVID items, four Performance
Learnings, one exact Reel Brief version, one exact Strategic Review and six
prior messages inside a 32,000-character context. Models see only safe reference
labels; real UUID provenance is stored separately through same-organization
foreign keys. Research remains untrusted data, and Performance Learning sample
counts, strength, caveats and algorithm version are preserved.

Conversations, messages, turns, selected context, specialist results and AI-run
links are durable. Messages, context references, specialist results and turn
routing/context provenance are immutable. Service-only workflow RPCs validate
active execution role, Marketing enablement and exact `BALANCED`
`marketing.ask-council.execute` AI runs; authenticated clients have SELECT-only
table access and one guarded archival RPC. Creation and successful completion
emit only bounded conversation activity.

Ask Council is advisory. It performs no Reel Brief creation, Strategic Review,
External Research, performance snapshot/learning derivation, Company Knowledge
or memory write, durable job, arbitrary tool, Web Agency/TASK-019 or direct
provider execution. Suggested next actions remain text and execute nothing.

Final local verification on 2026-09-02 passed 8 focused files / 46 tests, the
complete web suite at 153 files / 883 tests and the complete worker suite at 5
files / 32 tests (158 files / 915 tests total). Repository lint, worker/web
typechecks, scoped formatting, worker/web production builds, migration
contracts, `git diff --check` and `npm audit` with zero vulnerabilities passed.
The linked Supabase dry run applied nothing and reported exactly
`20260825002000_ask_council.sql` pending. Docker and Podman are unavailable, so
the 35-assertion TASK-020 pgTAP suite could not run locally and remains a hosted
database acceptance check.

Hosted acceptance then exposed an automatic Research context relevance defect:
the V1 selector considered only the literal current question, accepted one weak
substring match and used recency next, so an unrelated recent bug-blindness
report could fill unused context capacity on an anaphoric sizing follow-up. The
corrective selector is recorded as
`marketing-ask-council-research-relevance-v2`. It uses exact normalized
meaningful concepts from the current question or, when the question is
anaphoric, the most recent user message inside the existing six-message window.
Generic Marketing/Research/Reel terms cannot establish relevance, at least two
meaningful concepts must match, and recency is only a tie-breaker after that
threshold. Explicit report selection still bypasses automatic relevance.
Report and evidence rows are deduplicated by canonical persisted ID with stable
ordering and run association; no passing report means zero automatic Research
context. The correction adds no model call, migration, retrieval, memory or
downstream workflow behavior. Focused corrective verification passes 8 files /
52 tests and the complete web suite passes 153 files / 889 tests. Repository
lint, web typecheck, scoped formatting, the web production build and diff checks
also pass. The existing `02000` migration and database contract are unchanged.
