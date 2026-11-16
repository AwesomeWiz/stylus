# Public beta release audit

Status: **in progress; not approved for publication**. Starting commit:
`72b990e221a2c353697f8edb5f64466d115feb6c`. Exact release-candidate commit and final
validation evidence will be recorded after the release tree is stable.

The [checklist](RELEASE_CHECKLIST.md) distinguishes completed work and open gates.
REDESIGN-009.1 authorizes normal task-branch pushes for remote CI; no merge, tag
or visibility change is authorized. A workflow file is not remote CI evidence.
The candidate must be evaluated at its exact SHA.

## Environment limits

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

## Maintainer actions before publication

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

- Review the exact candidate, complete missing required runtime/remote CI gates
  and all final scans; no failing gate is waived by this checklist.
- Enable and verify Private Vulnerability Reporting and its SECURITY.md link.
- Enable dependency graph/Dependabot and available secret scanning/push protection.
- Configure branch rules and required release-verification check; require review
  and CODEOWNERS review where appropriate. A CODEOWNERS file alone enforces nothing.
- Review Git author email metadata intentionally before publication.
- Review operator-specific legal/privacy text, Google verification and source-offer
  responsibilities for the actual public service. No general compliance guarantee.
- Only after authorization: push for remote CI, review the run, merge and publish
  the candidate, then create an explicitly approved beta tag/release.
