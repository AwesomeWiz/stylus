# Public beta release audit

Status: **REDESIGN-009 engineering acceptance PASS; READY TO MAKE PUBLIC: NO**.
Exact CI-tested release candidate: `5c99aaea122338556d96703f0b32e90b6de4ed83`.
Starting commit: `72b990e221a2c353697f8edb5f64466d115feb6c`.

The [checklist](RELEASE_CHECKLIST.md) distinguishes completed work and open gates.
REDESIGN-009.1 authorizes normal task-branch pushes for remote CI; no merge, tag
or visibility change is authorized. A workflow file is not remote CI evidence.
The candidate must be evaluated at its exact SHA.

## Current test-only follow-up — native #23 semantic landmarks

[Native #23](https://app.circleci.com/workflow/5dabe94d-320d-4336-a411-2f22da0ec456/job/57543886-0ebc-4d6a-89b8-0dd6bfad09e9)
at `ce61c1cb9435bb440844f05afa1e1f0acb334a76` passes eight browser cases, then
fails the authenticated Chromium case at the raw main selector: loading
`<main role="status">` overlaps `<main aria-label="Board workspace">`. This is a
strict-mode test failure, not evidence of a timeout or broken Board behavior.

The entry helper uses the unique semantic main role and an accessible level-one
heading count; hidden loading headings do not count, and the Board header title
can remain outside main. URL, authentication, title, error and document-persistence
checks are retained. The existing Board opener now selects its accessible Open
link plus exact href instead of the first of two links. No application, security,
workflow, dependency, timeout, retry, skip or error-filter change is introduced.

A focused real-browser regression retains both main elements and both headings,
then hides the loading status explicitly while preserving the old DOM subtree.
It passes in Chromium, Firefox and WebKit with one worker; the same helper is
used by authenticated smoke. Full real authenticated browser/native acceptance
at the new exact commit remains pending. #21 below is still successful evidence
for its original SHA, not a substitute for validating this test change. Separate
uncommitted Apache-audit documentation is preserved and excluded from this fix.

## Final native acceptance — 2026-11-16

[Native CircleCI release-machine-ci #21](https://app.circleci.com/workflow/fb7f1bdd-b38e-4f34-947e-7a0d318273cb/job/a344e292-252d-438f-9258-14679aca6c3d)
is **SUCCESS**. The API identifies pipeline `45fa3c09-3f38-421a-8101-2d7e9ecb46ca`,
workflow `fb7f1bdd-b38e-4f34-947e-7a0d318273cb`, job
`a344e292-252d-438f-9258-14679aca6c3d`, checkout branch
`codex/redesign-009-release-hardening` and full SHA above. The checkout log
independently confirms that exact SHA and a clean tree. Every job step succeeds.

| Required gate          | Verified result from #21 logs                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fresh install/platform | `npm ci`; Node 24.22.1; direct Docker on fresh Ubuntu 24.04; local-only configuration/helper checks                                                                                                                |
| Migration from zero    | Fresh Docker Supabase; all 53 repository versions verified, with real Auth, Storage and pgcrypto prerequisites                                                                                                     |
| SQL/RLS                | All 30 suites / 1,138 assertions pass against real local Supabase; the isolated run separately passes the same count                                                                                               |
| Upgrade                | Pre-integration upgrade preserves organization, Task and Board/object content and authorized writes; identity updates remain denied                                                                                |
| Worker/web/demo tests  | Worker: 5 files / 36 tests; web: 267 files / 1,531 tests; demo: 64 tests, zero failures                                                                                                                            |
| Real Auth/JWT          | OWNER/MEMBER/VIEWER password login, Auth-verified identity/membership/Core reads; OWNER/MEMBER persisted task writes; VIEWER writes and MEMBER/VIEWER management denied; sessions signed out                       |
| Static/security        | Lint, both typechecks, formatting/docs, 675 dependency license entries / 23 fonts, tree/history secret scans and high-severity dependency audit pass                                                               |
| Production builds      | Worker TypeScript build and Next.js production build pass                                                                                                                                                          |
| Browser E2E            | 9/9 pass, one worker, zero retries: public, authenticated workflow and responsive/reduced-motion checks in Chromium, Firefox and WebKit; every page error remains fatal                                            |
| Seed/cleanup/baseline  | Both complete real seeds verify all fixtures, explicit Memory and private image. Both exact-ID tenant/Auth/Storage cleanups and unchanged control baselines pass; final control cleanup confirms no seeded orphans |
| Final hygiene          | `git diff --check` and always-run stop of only the VM-owned stack pass                                                                                                                                             |

The seven previously documented moderate development-only dependency findings
remain; the passing high-severity audit is not a zero-vulnerability claim. No AI,
external provider or hosted database is used by this run. No gate is skipped or
waived. #21 supersedes #19's failed browser result and closes the complete native
CI gate; #17 remains earlier focused round-trip evidence.

This acceptance update changes Markdown documentation only. The tested SHA stays
the release candidate; any following documentation-only commit is an evidence
record, not a newly CI-tested runtime candidate. Validate its Markdown, links,
diff and unchanged non-documentation tree locally. No expensive suite or new
remote run is required solely for those prose changes. A later application,
test, schema, workflow, dependency or other executable change requires fresh
verification appropriate to that new candidate.

## Remaining manual publication checks

- The full clean-clone **signup → organization → onboarding → Core** walkthrough
  is still pending on a suitable supported host. #21 proves seeded organization
  bootstrap, real login/JWT/Core and browser workflows, not browser signup or
  onboarding completion. Windows Docker/WSL remains disabled by owner instruction;
  this outstanding check is neither passed nor waived.
- Physical Windows NVDA and any required physical-device coverage remain
  unperformed; automated axe/keyboard/browser checks are not that evidence.
- The maintainer must verify GitHub Private Vulnerability Reporting and its
  SECURITY.md link, dependency graph/Dependabot, available secret scanning/push
  protection, branch protections, required **native release** check and reviewer/
  CODEOWNERS enforcement. Committed configuration does not establish live settings.
- Review historical author email and earlier sample business/domain references
  intentionally before exposing Git history. Secret scans passed; no history
  rewrite or metadata/privacy approval is inferred from that result.
- Confirm distribution/source-offer and third-party notice obligations for the
  actual release artifact. Public service operators separately need appropriate
  terms/privacy, retention/operator information and provider approvals. Logo
  redistribution is already authorized; these are not a new logo-permission gate.
- For a public Google-enabled deployment, confirm the applicable OAuth consent/
  verification requirements, including Drive's restricted metadata scope. Prior
  isolated live provider QA is not public Google verification. These deployment
  requirements do not mean credentials are required to use Core/source installs.
- Obtain explicit publication/merge/tag/visibility authorization after the open
  checks. None of those actions is performed by acceptance closure.

Engineering/release-pipeline acceptance is **PASS**. Public-release readiness
remains **NO** until the applicable manual checks and authorization are recorded.

## Final branch and public-history reconciliation — 2026-11-16

Native #21 is independently reverified successful at the exact tested SHA above.
After a fresh fetch, `origin/codex/redesign-009-release-hardening` still points
there. Local acceptance commit `cdd223862801b3689da5fbf15112dc81bb5b00c5` is its
only later release commit and changes exactly seven Markdown files. This final
reconciliation commit adds only documentation on top; its exact head is reported
in the PR/handoff. No other branch commits are silently cherry-picked or merged.

Local main and origin/main both remain at
`5b7e76a0fe6a4e80f17e14c04b119a84b43668a9`. It is the release branch's merge base
and ancestor, with zero main-only commits. Before reconciliation there are 30
release-only commits and 664 changed files relative to main; this is the entire
accumulated V2 release, not merely the last CI repair. Main's original checkout
has 58 tracked changes and 25 untracked files outside `.worktrees`. Their status,
tracked/index diffs and untracked content hashes are captured privately and
compared without resetting, cleaning, stashing or overwriting them.

`git merge-tree --write-tree origin/main HEAD` finds no conflicts and returns
the release tree. Recommend a normal reviewed **merge commit**, preserving the
tested candidate and subsequent documentation commits in ancestry. Do not mix
the original main checkout's local edits into this PR. The exact source head is
not the future GitHub merge SHA: after an authorized merge, read the PR's actual
`merge_commit_sha`, confirm it equals origin/main and run the complete native
release pipeline with both branches set to main at that exact SHA. A temporary
PR test-merge SHA is provisional; do not claim it or the source SHA as a validated
post-merge result. No merge has been performed by this task.

GitHub's API reports that the repository is **already public** at inspection;
visibility is unchanged. Review covers all **31 advertised remote branch heads,
zero remote tags and 121 commits reachable from those heads**. Local-only refs
and stashes are kept separate from the advertised public scope. The full local
reachable-history Gitleaks scan also passes. The current candidate review finds
zero secrets, committed environment/private QA files, known private references
or raster metadata findings; remote history has no environment/QA artifact paths.
These scans are not a guarantee that every historical string is intended public.

Residual remote-history findings, deliberately not republished as raw values:

- One personal author/committer mailbox needs approval; GitHub's standard service
  committer identity is not classified as a personal address.
- Earlier brand/domain examples occur in Board controls/link tests, Growth and
  learning docs and `docs/OPEN_SOURCE_RELEASE.md`; hosted-project references occur
  historically in PROJECT_STATE and `docs/BOARDS_ENVIRONMENT.md`. They are privacy/
  metadata review items, not a finding of credentials or tenant records. Current
  release-tree cleanup does not remove old Git objects.
- Only two advertised heads contain commits outside the release ancestry:
  `cci/preflight/demo-seed-20261116-a` (three diagnostic commits) and
  `codex/open-source-readiness` (one older independent preparation commit at
  `7783b5df1d1f2042628c7bd3bb65d4c3f4f6387a`). The latter ships an Apache-2.0
  LICENSE, distinct from this AGPL-3.0-only release, and needs explicit historical
  licensing/distribution review. Neither branch is merged, deleted or rewritten.
- Merging this PR would not remove old refs or their privacy/licensing contents
  from the already-public repository. Any later history/ref cleanup needs its
  own explicit plan and authorization; no force push or blanket ref push is used.

Prepare the release PR as a draft while the manual gates above remain open.
Its source tree changes only in documentation after #21, so validate prose,
links, diff, public-artifact checks and exact non-Markdown tree identity locally;
do not repeat expensive runtime suites merely to record the evidence. Mandatory
post-merge validation applies to the actual new main SHA before release.

## Earlier verification records

The following entries describe earlier candidates and environment limits; their
pending native-CI statements are superseded by #21 above, not retroactive PASSes.
The separately identified signup/onboarding and physical-accessibility gaps remain.

### Full native #19 and browser navigation isolation — 2026-11-16

[Native release #19](https://app.circleci.com/workflow/59bf625c-bc8e-4588-ae1d-d7743d9380ad/job/0afa91af-600d-4bf3-b3d6-f4cb17f1f323)
at `ea521df3d16c38ef506829c0f3201e07014a5f29` passes install, static/security
gates, web/worker/demo tests, isolated/upgrade/native SQL, both seed preparations,
real Auth/JWT checks and production builds. Native SQL passes all 30 suites /
1,138 assertions. Browser QA is eight PASS / one FAIL: authenticated WebKit
reports seven Home-prefetch access-control diagnostics. Final round-trip cleanup
is not reached; the always-run owned-stack stop succeeds. No full PASS is claimed.

The test replaced Home's document immediately after an SPA login, then repeatedly
used document navigation for its route inventory. A load state already reached
by that document does not wait for new SPA work, as described by
[Playwright's load-state contract](https://playwright.dev/docs/api/class-page#page-wait-for-load-state).
An owned loopback-only probe reproduces the same WebKit error when a same-origin
fetch starts during document replacement: no API request reaches the server.
The no-replacement controls return successful data without errors in Chromium,
Firefox and WebKit. This matches the independently reproduced
[WebKit loader issue](https://github.com/microsoft/playwright/issues/43120);
it does not demonstrate a product CORS/authorization failure.

The smoke test now checks every direct entry in a fresh authenticated tab and
uses actual Home → Tasks → task detail → Boards navigation for the workflow.
It additionally verifies unchanged document time origin through that workflow.
Every page's errors remain fatal; no filtering, retry, browser skip, prefetch
disablement, dependency or application change is introduced. Real three-engine
acceptance and final cleanup on the next exact native candidate remain required.
Local validation passes all 64 demo regressions, lint, both typechecks, browser
test discovery, formatting, 190 local links and workflow/Bash checks. The local
probe is mechanism evidence; it does not replace real authenticated browser QA.

### Real demo round-trip verified — 2026-11-16

[Native diagnostic #17](https://app.circleci.com/workflow/9ce63cc6-05b4-4ddc-bedc-5c7c2e429f0c/job/cb038336-61d6-4d9c-a918-9e2123aa397c)
succeeds at exact diagnostic commit `6ac08ac7501bc70a82c90ba6663b4ac6b25cb34c`.
Fresh Docker, all 53 migrations and real platform prerequisites pass. The logs
confirm two complete seeds/fixture verifications, explicit company Memory,
private assets, two exact-ID cleanups, tenant/Auth/Storage absence, unchanged
control/global baselines, and final exact control cleanup without orphans.
Actual OWNER/MEMBER/VIEWER logins, Auth-verified JWTs, Core writes/read-only denials
and manager restrictions pass. No AI, external provider or hosted backend is used.

This is real Supabase evidence, separate from the 64 local demo regressions using
installed SDKs with synthetic HTTP and actual SQL roles. All 30 local SQL suites
pass 1,138 assertions; lint/typechecks/builds, formatting/links, secrets and workflow
checks pass. No production grants/RLS/migrations, application code or dependencies
change. The complete release-machine-ci workflow on the resulting 009 candidate
and other outstanding checklist items remain required; this focused diagnostic
alone does not authorize public release.

### Inventory transport and full controller audit — 2026-11-16

Native [diagnostic #12](https://app.circleci.com/workflow/f54717f2-23ff-4938-88b8-4ef24c35f97c/job/5874bb30-7e97-4c7e-9391-e1a2bfb27064)
at `8a182d9` passes fresh Docker/53-migration prerequisites, then fails before the
seed. The CLI's successful non-agent JSON response is a row array; reading its
nonexistent `.rows` returns undefined. Catalog `[0]` then throws. The response
contract and complete [repair audit](DEMO.md#inventory-transport-and-baseline-validation)
are recorded without treating that failure as empty or permission-denied data.

The decoder now validates both documented shapes, pins non-agent JSON and keeps
complete private process diagnostics. Catalog/table coverage, keys, provenance,
tenant identities and control/Auth/Storage snapshots fail closed on missing or
malformed data. Actual round-trip plus Auth-smoke source executes under all real
SQL grants/RLS in the regression. It caught later own-user membership reads and
protected task-ID insertion: existing directory RPCs and database-generated IDs
replace those assumptions. Cleanup inventory remains exact and supports safe
reconciliation of the same recorded smoke IDs. Baseline changes are rejected
before deletion and checked again after cleanup.

All 63 demo tests, seven release-helper tests, lint/typechecks and 30 SQL suites /
1,138 assertions pass locally. Synthetic Auth/Storage/process transport is not
live Supabase evidence. The diagnostic branch advances normally to `eeab043`;
native CLI/v3 trigger calls return 404, so owner-started native execution at that
exact SHA is requested. No real seed/cleanup/baseline PASS is claimed, and no
hosted data, production grants/RLS/migrations or dependencies are changed.

Owner-started [native #15](https://app.circleci.com/workflow/c908ab90-f9ba-4528-aa47-826c6d3096ce/job/0b626199-39e9-4daf-a06b-515497a0053e)
at `eeab043` confirms inventory decoding/baseline capture, then fails at MEMBER
logout because the new validator incorrectly expects `data` from the SDK's
error-only signOut result. This is corrected explicitly without relaxing query
data validation. The complete controller now runs installed Auth/Storage SDKs
over fenced synthetic HTTP and actual SQL permissions. All 64 demo tests and
seven release-helper tests pass; builds, formatting/190 links, secret and workflow
checks pass. Full real seed/cleanup/baseline acceptance remains pending a new
native run; #15's partial execution is not a round-trip PASS.

### Complete demo privilege audit and round trip — 2026-11-16

Native job `3e01d041-5273-47dd-a911-fd4525d9927c` at `e5fe80e` confirms the next
42501 is the service client's membership insert. The [complete audit](DEMO.md#identity-and-permission-audit)
now covers every operation, role, permission path, exact-ID inventory and cleanup.
Team creation follows OWNER invitation and each user's acceptance. Research
fixtures use existing bounded service RPCs, followed by explicit cancellation
before synthesis; administrative SQL writes are removed. Operational writes stay
under OWNER. One authored private image exercises real Storage cleanup. No
application grants, RLS, migration, dependency or lockfile changes are made.

Nineteen demo tests pass, including two complete seed/cleanup executions using
actual migrations/grants/RLS with synthetic Auth/Storage transport. All 30 isolated
SQL suites pass 1,138 assertions across 53 migrations. These results are not real
Supabase/Auth evidence. Full local web/worker suites, lint/typechecks, production
builds, upgrade, formatting/links and license checks pass. The native round-trip
gate adds complete seed/verification/
cleanup/reseed, exact Auth/tenant/Storage absence and unchanged control content.
Real Auth/JWT/role and browser checks still run against the second fixture before
final guarded cleanup. All prior full release gates remain mandatory.

Authenticated CircleCI reads now work. The CLI's explicit native trigger returns
404, and cancellation returns 403. Diagnostic snapshot `8a182d9` is retained on
`cci/preflight/demo-seed-20261116-a`; its automatic run chose the older compatibility
workflow. The owner has been asked to start the native `release-machine-ci`
definition explicitly. Real complete seed, cleanup and final native acceptance
remain pending; hosted data and local Windows virtualization are untouched.

The initial preflight snapshot predates the final inventory-key normalization,
Storage identity denial checks and shared verification SQL regression. Validate
the final 009 candidate, not that snapshot. Official CircleCI configuration,
Bash/owned-cleanup checks and candidate-tree secret scanning pass. The existing
`npm audit --audit-level=high` gate passes; seven moderate findings remain in the
unchanged lint-tool dependency chain via minimatch
([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)). No dependency
or security threshold is changed for this repair.

### Demo exact-organization verification — 2026-11-16

The remote branch and CircleCI release failure match `227c7cf`; the owner reports
Docker/migrations/SQL now pass. The seed then fails `verify exact fixture
organization` with 42501: its service-key administration client directly selects
`public.organizations`, whose intended application read path is authenticated
membership RLS. The fictional owner is already signed in and its bootstrap RPC
has returned the exact newly recorded organization ID.

The shared verifier now queries through that owner, filters only by the recorded
UUID, and checks returned UUID, creator UUID and name. Cleanup authenticates the
owner before the same ownership query. All existing backend/account checks,
exact row inventory comparison, owner-confirmed atomic organization deletion,
exact Auth deletions and absence checks remain intact. No production grants,
RLS, migrations or application behavior changes are needed.

Thirteen focused Node tests pass, including seed-through-verification and cleanup
source execution with synthetic transports and in-memory files. They refuse wrong
returned organization/creator IDs, missing identities, altered row inventories,
wrong account identities and backend mismatch before any deletion. Thirteen
organization SQL assertions pass, including actual owner-RLS success, foreign-ID
isolation and service-role table denial. Full isolated SQL passes 30 suites /
1,138 assertions / 53 migrations. The demo tests run after the existing sequential
worker/web npm test gates, with no dependency or lockfile change. Full live seeding
and remaining release gates require the next exact CircleCI candidate; neither
hosted data nor local Docker/virtualization is used for this repair.

### Fresh Supabase SQL fixture roles — 2026-11-16

The owner reports the direct CircleCI machine run at `06ecb41` successfully
starting real Docker Supabase, verifying local postgres administrative setup,
Auth/Storage/pgcrypto and all 53 migrations. Its SQL gate exposes a test-role
defect, not evidence of broken domain RPCs. Removing only the isolated bootstrap's
blanket `service_role` public-table grant reproduces all seven reported suites.
Ask Council's original 37 assertions pass with that grant; without it, argument
subqueries fail with 42501 before specialist/completion/follow-up functions run,
and downstream history assertions cascade. The other six suites fail on protected
table inspection. Both variants identify session/current user as postgres before
the suites. Their explicit BEGIN/SET LOCAL ROLE/RESET/ROLLBACK behavior is the same;
the isolated runner's extra between-suite reset cannot repair an in-suite read.
Neither test ordering, psql nor the native `supabase test db` command is the cause.

Capture fixture UUIDs under postgres with transaction-local `qa.*` settings and
pass those IDs into the original role-scoped calls. Reset to postgres for private
state inspection, restoring service_role before its next application operation.
Worker credentials remain in their existing service-owned temporary fixture;
authenticated users still cannot read that fixture. No function, RLS policy,
production grant, migration, connection strategy or CI executor/runtime changes.
The isolated bootstrap now omits its unsupported blanket table grant; explicit
production integration adapter grants remain effective.

All 255 original focused assertion labels/order and 171 public-function role
references are retained. Seven focused runs pass in order: 38/21/54/59/32/29/23
assertions. Release-security passes 104, including eight catalog privilege checks,
eight actual 42501 service-role reads, administrator restoration and preservation
of all six explicit integration-table SELECT grants. Those new denial checks
reject the original permissive bootstrap with 16 expected failures. Full isolated
SQL passes **30 suites / 1,134 assertions / 53 migrations**; upgrade also passes.
The new candidate still requires the native SQL rerun and remaining actual
Auth/JWT/Core, web/worker, build and browser release gates. Nothing is inferred
passed from the isolated result. Hosted backends and Windows Docker are untouched.

### Direct CircleCI machine release gate — 2026-11-16

The owner selected a direct CircleCI pipeline after the GitHub Actions
compatibility run reported `permission denied for table worker_registrations`
and cascading TAP plan errors. This is not treated as evidence to change RLS or
fixtures. The unchanged isolated baseline remains 30 suites / 1,115 assertions;
reproduction and classification on the supported machine executor remain required.

`.circleci/config.yml` uses one `ubuntu-2404:current` machine VM, direct local
Docker (no remote-Docker executor), Node 24.22.1 through pinned official Node orb
7.2.1, and `npm ci` with a new temporary cache. It asserts the checked-out commit
equals `CIRCLE_SHA1`, rejects inherited backend/provider configuration and saved
Supabase containers/volumes, and uses the pinned 2.115.0 CLI's ordinary Docker
startup. `SUPABASE_EXPERIMENTAL_STACK=0` is explicit. No dependency, SQL, fixture,
RLS or migration change is part of this pipeline addition.

The database wrapper captures real local status without printing keys. It
requires loopback URLs, the postgres database/user and the configured local port.
A read-only Docker/psql preflight records connection/session roles, worker-table
owner/grants and fixture privileges, checks real Auth/Storage/pgcrypto, and compares
the entire applied migration ledger to repository files. The existing complete
`supabase test db` gate then uses that same explicit local postgres URL. No custom
bootstrap, grant repair, role alias or database patch is introduced. Failures
remain fatal and their output is sanitized without hiding SQL/TAP errors.

The existing fictional demo creates three real Auth users and bootstraps its
organization through the owner's authenticated RPC. The new CI-only smoke logs
in all three roles, verifies JWT identities with Auth, checks scoped Core reads,
OWNER/MEMBER Task writes, VIEWER denial/persistence and OWNER-only management.
Its clients use the public key and real password-grant sessions. No JWT is
fabricated, persisted or printed, and service-role access is not used for these
assertions. This gate supplements all original SQL/RLS and browser tests.

All GitHub Actions gates remain intact. CircleCI runs the same package scripts,
plus the local connection/JWT prerequisites, with no parallel jobs/runners.
Always-run cleanup stops only a stack whose fresh-start intent this job recorded.
No raw logs, dotenv, demo credentials or traces are uploaded. The pipeline never
links a hosted project, invokes a provider or changes Windows virtualization.
Official CircleCI CLI 1.15.0 config/public-orb validation passes. Seven local
guard/redaction tests, YAML and all run-step Bash syntax, referenced scripts/
package commands, simulated startup exits and cleanup ownership, lint and both
typechecks pass. Application build inputs and the GitHub workflow are unchanged;
formatting, 188 relative links, candidate-tree secret scanning and diff checks
also pass. All validation runners are sequential. Application
runtime suites are required in the remote job rather than
repeated locally for this CI-only change. Remote machine execution remains
unverified. The owner must change the CircleCI UI configuration path to
`.circleci/config.yml`; adding the file does not switch the compatibility pipeline.

### REDESIGN-009.1 remote startup diagnosis — 2026-11-16

CircleCI passed installation and worker tests at `7aa7924`, then reported only
exit 1 for Supabase start. Both streams were redirected without a failure-log
handler. The follow-up prints sanitized failure output and preserves its exit
status. Runner identity, Linux/architecture/glibc, tool versions, native-variable
presence and bounded artifact-host reachability are now diagnostic outputs.
Reachability responses do not prove archive downloads or checksum verification.
Raw startup logs stay ignored/private; debug credential dumps are not enabled.

The locked CLI is 2.115.0. Actual installed help identifies top-level `start` as
container startup, even with `SUPABASE_EXPERIMENTAL_STACK=1`; the tagged
[experimental start source](https://github.com/supabase/cli/blob/v2.115.0/apps/cli/src/next/commands/start/start.command.ts)
uses a different `--mode` contract. The current documented
[native runtime](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes)
requires experimental-stack selection and explicit `--runtime native` to prevent
fallback. That is absent from this repository's command/config. The existing
step title therefore does not establish native execution. No CLI upgrade or
runtime substitution is made before observing the actual remote error.

The documented native requirements are Linux amd64/arm64 with glibc >=2.35 and
system tar, verified service archives from GitHub/release-assets or Supabase's
S3 fallback, and a non-root Postgres account. A root workaround is conditional
on the actual runner UID, which is not yet known. CircleCI's actual platform,
artifact results, Postgres/Auth startup and all 53 migrations remain unverified;
none is inferred from local isolated SQL results. All downstream database,
fictional bootstrap and authenticated browser gates remain required. The next
candidate needs a complete CircleCI run and evidence-based failure classification.

The owner disabled WSL/Virtual Machine Platform after a Windows boot failure.
They must not be enabled for this task. Docker-dependent full local Supabase
authenticated clean-install checks are **pending**, not passed or waived.
Isolated PostgreSQL tests, database CI, documentation and independent work continue.

Remote GitHub Actions execution is pending an authorized push. The supported
hosted dry run identified exactly one required correction,
`20261115000100_board_explicit_browser_grants.sql`. The owner authorized it and
the isolated fictional demo. The correction is applied; all 52 hosted versions
match. Read-only checks verify stable-ID insert, ownership/lock columns and both
Board RPCs; identity updates and broad anonymous grants are denied.

## Initial findings and repairs

The baseline had no project LICENSE or community/CI files. The maintainer confirmed
public redistribution of the project-created logo with no extra attribution.
Original code now uses AGPL-3.0-only; separate font/dependency licenses remain.
[Third-party review](THIRD_PARTY.md) records conditions and the lockfile inventory.

Gitleaks 8.30.1 initially scanned all reachable history with zero findings.
This is not by itself a private-information audit or a final-candidate certificate. Initial
review found a private-business domain used as a Board input placeholder/test
example; it is replaced with the reserved example.com domain. Internal development
project identifiers are removed from current documentation. Historical author
metadata includes a personal email address; the maintainer must decide whether to
retain that metadata. Historical commits also retain the earlier sample-domain/
business-name references in a placeholder, tests and an engineering note; those
are flagged for maintainer review, without treating them as customer records.
No history rewrite or automatic author-email change is made.

The baseline npm audit reported 17 findings, including critical/high Next.js,
image-library and validation issues. Reviewed compatible updates include Next.js
16.4.6, sharp 0.35.5, Zod 4.6.7, fast-xml-parser 5.12.0, Vitest 4.1.12 and related
patches; no forced/major-version upgrade was used. Seven moderate development-only
findings remain through typescript-eslint's minimatch 10.2.6. The advisory concerns
attacker-controlled patterns with optimizationLevel >=2; the installed consumer
uses only `{dot:true}` with project-owned lint configuration, and no application
module imports minimatch. It is not reachable through product requests. Do not
expose a lint service to untrusted patterns. A patched upstream dependency should
replace this exception; a forced major override is not assumed safe. The final
audit must report the remaining count accurately. CI fails at high severity while
still displaying moderate findings.

Task source inspection found unbounded initial DOM rendering of all matching rows
and separately queued Server Action reads for secondary detail. The list retains
all matching summaries but initially renders 50 rows with explicit progressive
display. Independently authorized uncached GET reads separate detail/comments/
execution/provenance from the mutation queue. Provider reads remain bounded and
outside Core detail. Same-fixture measurements below verify the resulting change.

The fresh catalog contains 75 public tables, including 71 organization-keyed
tables, all with RLS enabled. Application security-definer functions pin an empty
search path. New catalog/credential ACL regression coverage adds 86 assertions;
existing role/tenant/archive/plugin/revocation suites remain enabled. This is
catalog evidence, not by itself proof of all application behavior. The fresh SQL
runner loads all migrations unchanged with real pgcrypto and pgTAP, no crypto
stubs or public privilege aliases.

Representing Supabase's default grants exposed an actual foundation defect:
`boards` and `board_elements` retained table-wide anon/authenticated privileges,
overriding intended column grants. The original identity-update denial assertion
failed. A read-only hosted ACL query confirms the same broad grants. RLS still
filters rows, but it does not replace least-privilege table/column ACLs.

The new forward-only correction revokes those broad grants and restores explicit
authenticated SELECT and supported insert/update columns, including stable IDs
for existing image-upload retries. It changes no records, RLS policies, RPCs or
applied migration. Anonymous reads now fail with 42501; the two existing denial
assertions require that stronger result. The original identity denial assertion
remains intact. Six new assertions cover public-table maintenance privileges,
anonymous access, column-only writes and provenance.

All **30 SQL suites / 1,115 assertions** pass over **53 migrations** after the
correction. The pre-008 upgrade preserves an organization, Task, Board and object
content, verifies permitted authenticated edits, and denies identity updates.
The release security suite has 86 assertions, including real authenticated SQL
creation and direct stable-ID/geometry writes after the grant correction. Native
Supabase full-stack clean-install execution remains separate.

The authorized hosted demo contains exactly three fictional accounts and one
isolated organization. Before browser QA, all primary keys were recorded in the
ignored manifest: 55 rows across 30 demo tables, including automatic relations/
activity. Seed writes journal preallocated and returned IDs and can resume the
same fixture without creating another account or organization. Immutable research
uses exact-ID operator SQL because private constraint helpers intentionally deny
direct service-role insertion; no grant was weakened. Its job/run are cancelled,
with authored fictional Evidence, not a successful provider/model run.

Automatic approval review rejected a broad pre-existing-data fingerprint query.
It was removed before execution. The safer baseline records only aggregate
organization/account/provider-connection counts, with no existing IDs, actor
metadata or contents. Those counts match after excluding the exact demo IDs.
This is not a full content fingerprint comparison. All application mutations are
restricted to recorded demo identities; guarded cleanup and final verification
remain required after QA/media. No AI or external provider has been invoked.

The public production build passes with optional services absent. Chromium and
Edge public semantic/axe checks pass; Firefox passes with normal browser process
permissions after a sandboxed engine crash. A Windows WebKit diagnostic proves
ordinary link Tab navigation differs from explicit `tabIndex=0`; skip links now
use explicit zero and the error main target accepts focus. The final production
rerun passes all 12 public/authenticated/responsive checks across the four engines.
Automated axe checks are not physical NVDA or WCAG certification.

## Actual UI and Task performance evidence

The production application was tested against the authorized fictional development
workspace, with optional AI/providers unconfigured. Chromium, Edge, Firefox and
Windows WebKit passed authenticated route/detail and placement-cancellation smoke
checks. Public production checks cover semantics/axe, skip-link focus, themes,
reduced motion and responsive entrypoints in all four engines. WebKit navigation
waits for in-flight prefetches before document teardown; page-error assertions
remain enabled. This is Windows WebKit, not physical Safari-device certification.

A further 64 authenticated combinations passed: Home, Task detail and Company edit
at 320/390/430/768/1024/1200/1440/1920px in both themes; Notes, Experiment, Memory
and Integrations at 390/1440px in both themes. There was no horizontal overflow,
no browser exception and no WCAG-tagged axe violation at the sampled audit widths.
Memory's two unnamed filter comboboxes were corrected and regression assertions
added. Task detail failure/retry and keyboard return to the list pass. Accessibility
snapshots and keyboard checks do not substitute for physical NVDA testing, which
remains unavailable; screen-reader coverage is limited.

The same 200-Task/55-comment fixture, Windows host, Chromium 158.0.8127.18,
1600×900 viewport and development Supabase backend were used for the accepted
008 commit and this production build. Each build was freshly installed/built;
three sequential document-entry and detail-opening samples were collected per
build. Current ran before baseline; backend/host warm state and internet variance
were not reset. These small samples are observations, not an SLA or controlled
cold/warm p95 benchmark. Decoded document bytes exclude compressed wire size and
separately downloaded JS.

| Measurement                                           | Accepted 008          | Release candidate               |
| ----------------------------------------------------- | --------------------- | ------------------------------- |
| Initial matching rows rendered                        | 200                   | 50, explicit progressive reveal |
| Task document decoded bytes, each sample              | 656,412               | 275,882                         |
| Document navigation through network idle, ms          | 1,902 / 1,889 / 2,022 | 1,935 / 1,827 / 1,772           |
| Open Task through related-work + discussion ready, ms | 8,679 / 8,837 / 8,818 | 3,840 / 3,302 / 3,320           |

Decoded Task document size fell 58.0%; median related/detail readiness fell from
8,818ms to 3,320ms. This fixture differs from the earlier reported 1.57MB/~5.5s
sample, so those older numbers are not treated as a comparable baseline. Complete
summary transfer remains, with deferred full detail/comment bodies. Both initial
Task documents contained zero QA comment bodies. Current detail/execution/
provenance bodies were 725/304/571 bytes; the bounded 50-comment page was 14,835
bytes. Real HTTP pagination returned 50 then 5 unique comments, retaining their
actual timezone offset, microsecond timestamp and UUID tie ordering.

Board capture exposed unnecessary private-channel teardown on equivalent RSC
refresh objects. Component-local canonical directory/primitive identity now keeps
the subscription stable across saves, while role/account/org/board changes still
replace it. Three permanent regression cases and the existing collaboration tests
pass. A replacement recording fails immediately if Offline appears; it passed
through real drag creation and persistence. Eight reviewed screenshots, two GIFs
and two successfully decoded/seeked masters are documented in [Media](MEDIA.md).

The same Board was progressively expanded to 200/300/500 real persisted objects,
with exact UUID journaling and one sequential browser sample per size. Navigation
through interactive canvas plus connected Presence took 2,010/1,834/2,173ms;
decoded document sizes were 378,764/545,814/880,014 bytes. These are single hosted
samples with uncontrolled network variance, not before/after speedup claims.
Keyboard movement persisted and survived reload; pan/zoom changed no saved
geometry; placement cancellation, Section presentation and 390/1024/1440px reflow
passed at all three sizes. No interaction regression was observed.

Two recorded fictional users received the same real private-channel update and
the original content was restored. Presence returned to one after the second
context closed. A fictional VIEWER had read-only Task detail and no creation
toolbar on the Board. The full regression tests retain tenant/revocation checks;
this one-organization live smoke is not itself a cross-tenant proof.

Board axe scanning found an invalid label on the decorative cursor container;
it is now hidden from the accessibility tree, with identities still available
in the header. At the sampled low canvas zoom, seven inline text targets in each
theme trigger automated target-size findings. Each was individually mapped to a
same-page Layers selection target and Properties Content editor; measured minimum
dimensions were 24px or greater (the Content editors were 295×80px). This uses the
[SC 2.5.8 Equivalent exception](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html),
not a claim that tiny canvas text becomes a large pointer target. Raw findings
are retained; any other violation fails the check. Physical NVDA remains untested.

## Earlier local and hosted verification

The final demo cleanup uncovered an additional release defect. The existing
organization-deletion RPC failed with a creator-membership FK error; that
transaction rolled back, and no accounts were deleted. All four exact private
image paths/Storage UUIDs had already been removed and verified absent. The
complete final inventory records 1,096 rows across 33 new demo tables.

Additional forward migration `20261115000200_atomic_organization_deletion.sql`
repairs populated-tenant deletion: 16 validated root organization cascades,
133 deferrable tenant-reference changes and narrow immutable-history cascade
guards. Existing reference columns/parents, update actions and initial modes
are preserved; no existing rows change on deployment. Normal immutable-history
updates/deletes still fail while their organization exists. The same active
OWNER, exact-name and row-lock checks remain. All 30 suites / 1,115 assertions
and the upgrade path pass, including new populated Core/Research/Performance/
Council deletion and unrelated-tenant preservation cases. The supported linked
dry run listed only this file. The owner separately approved deployment, which
is complete. All 53 hosted versions and Board column/RPC checks match.
Guarded cleanup then verified every inventoried demo row, the exact organization,
all three Auth accounts and all four private Storage assets absent. Approved
non-demo aggregate counts match before/after. The password and task-only hosted/
browser credential copies are removed. No broader existing-data fingerprint is
claimed. See ADR-057.

Final sequential runtime verification passes 267 web files / 1,531 tests and 32
worker tests. Lint, both typechecks, worker/web production builds, all 30 SQL
suites / 1,115 assertions, the pre-008 upgrade, dependency/font inventory, formatting,
relative links and redacted tree/history secret scans pass. npm audit reports
seven documented moderate development-only findings and zero high/critical
findings. An initial sandbox registry connection failure returned no audit result;
the rerun with registry access passed the high-severity gate.

A new temporary clone, outside the existing checkout's ancestor dependency paths,
starts with no inherited modules, environment file or build output. `npm ci`,
copying the committed `.env.example` placeholders, format/docs/license checks,
both typechecks and worker/web production builds pass. Eight public browser checks
pass across Chromium, Edge, Firefox and WebKit using that production server, with
no database, hosted credential, provider or demo. Its tracked tree remains clean.
This proves the independent install/configuration/build/public-entrypoint path;
it does not claim the pending native authenticated signup/organization/onboarding
path ran. The final handoff records one exact candidate SHA; task-local evidence
is stamped with it. Runtime/test/schema/package inputs remain unchanged after
the full regression run; final documentation records that evidence.

The current outstanding maintainer actions are listed under
[remaining manual publication checks](#remaining-manual-publication-checks).
Native #21 closes the remote pipeline gap in these earlier records; it does not
close the separately unexecuted signup/onboarding or manual publication checks.
