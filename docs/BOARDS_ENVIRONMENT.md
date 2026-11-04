# Boards environment and migration verification

## REDESIGN-004.3.3 development verification

The expressly authorized Stylus development backend remains
`otdofpjgccvnkcvkcjxx`. Its initial 37-version ledger matched the repository.
Reviewed dry runs identified only `20261104000100_board_voting.sql`, then the
necessary forward correction `20261104000110_board_voting_conflict_response.sql`.
Both were applied with the supported CLI. Final inspection matches all 39 local/
remote versions through `20261104000110`. Neither file resets, drops, truncates
or rewrites existing data; no seed/role file or unrelated migration was applied.

The correction changes only stale application-version errors from 40001 to PT409,
preserving authorization, locks, records and grants. A real overlap test exposed
the original hosted transaction-retry timeout; after correction, exactly one
same-slot request succeeds and the stale request promptly returns 409. Current
idempotency and delayed/reused-slot rejection also pass against the hosted RPC.
The applied original migration was not edited.

Read-only schema probes explicitly verify `boards.template_key`, element
`parent_id`, `locked`, geometry/content/style/metadata/archive columns, both new
voting tables and their fields. Actual authenticated fixtures/mutations exercise
`create_board_from_template`, `apply_board_operation` and all four new voting
RPCs: start, cast/remove, end and read. Permanent local SQL suites run actual
repository migrations in isolated PGlite with the minimal Supabase bootstrap:
34 foundation + 59 V2 + 24 reactions + 21 resolution + 63 voting = 201 assertions.
Hosted tests separately verify real RLS/RPC/private Realtime transport; local
SQL emulation is not presented as a hosted pgTAP run or a database reset.

Four isolated users, two organizations and three Boards contain 21, 500 and 1
objects respectively; three private assets serve images. Two authenticated
browsers verify visible voting convergence, own allocations, injected optimistic
failure recovery and ending. API cases cover budget/concurrency, UUID/version
idempotency, role/tenant/anonymous/direct-write denial, locks and revocation.
The final private read route additionally verifies member 200, foreign/revoked 403
without data, private/no-store headers and signed-out proxy denial. Real Board
operations verify color gesture commits/reload and remote Section changes.

Cleanup verifies exact user email/UUID, organization name/creator, complete Board/
asset inventory and memberships before removal. Only those task records were
removed: four users, two organizations, three Boards, 522 elements, three private
assets, 25 votes and 11 sessions. Queries verify all scoped Board/vote/reaction/
comment/organization rows and assets absent, with user 404 responses. Task-only
Chrome/local servers are stopped; unrelated data/accounts and development
processes remain untouched. Credential inventories and traces are ignored under
`.next/cache/redesign-004-3-3-qa`. See [Boards](BOARDS.md) for browser/performance
scope and native OS/NVDA/other-engine verification limits.


REDESIGN-004.2 / REDESIGN-004.3 · 2026-11-03.

## REDESIGN-004.3 development verification

Section 39 of the attached 004.3 brief expressly authorizes the configured Stylus
project for development, isolated authenticated tests and forward feedback /
comment-resolution migrations. The linked ledger started with both 004 Board
foundation migrations already applied. Reviewed dry runs identified only
`20261103000100_board_reactions.sql`, then
`20261103000110_board_comment_resolution.sql`; each was applied unchanged using
the repository CLI workflow. They contain no DROP/TRUNCATE/reset and preserve
all existing Board/content rows. The final ledger matches both files. Read-only
API inspection confirms the reaction table, resolution columns and all six
Board operation/template/feedback/count RPCs.

Two isolated users, two organizations and three boards test real application
actions, private images and two-user feedback. One fixture has 1,000 objects,
including 20 image objects referencing one shared private asset; it does not
represent 20 distinct images. Temporary passwords, credentials, screenshots,
traces and runners remain ignored locally. Real VIEWER/revocation/foreign/
anonymous checks pass in addition to permanent SQL tests. The four pgTAP suites
pass 138 assertions in isolated PostgreSQL/PGlite; this is not hosted pgTAP or a
substitute for actual network verification.

Production-bundle Chrome QA covers the seven required drag cases with real
atomic saves, no frame-level disappearance/node replacement/grid/selection loss,
stable handles, no confirmation jump and one operation after release. A
MutationObserver records synchronous DOM reorders of the same connected node;
they are not claimed to be zero DOM mutations. Full editor RSC content is absent
from the atomic move response (observed 21,921 bytes before versus 666 after on
the small QA fixture). These are scoped observations, not hosted latency SLAs.
The two-theme/eight-width layout matrix, image workflows, rollback/retry,
Layers/Alt duplication, comment history and typography reload checks are
recorded in PROJECT_STATE. Manual NVDA and additional browser engines remain
explicit target-environment limits.

Cleanup verified the exact two users, two organizations, three boards, 1,034
active/archived elements, one comment and six private assets. Only those task
records were removed, then absence verified. Existing organization-deletion
audit-FK ordering required deleting the inventoried QA Board rows before the
owner deletion RPC; unrelated data remained untouched. Task-local helpers were
stopped and generated files restored.

The sections below retain the earlier 004.2 migration/verification history.

The owner explicitly authorized project **Stylus**, `otdofpjgccvnkcvkcjxx`, as
the active development backend for this task, superseding the earlier production
restriction. Isolated test accounts/organizations/boards and reviewed pending
forward migrations are authorized. No reset, DROP, TRUNCATE, database recreation
or deliberate destruction of unrelated data was performed.

## Exact migration plan and application

The linked CLI ledger matched repository migrations through `20260825002020`.
Only these two existing source migrations were missing:

1. `20261102000100_board_v2_element_types.sql`: adds SECTION/GROUP/LINK enum
   values in a separate committed migration before their use.
2. `20261102000110_board_v2_foundation.sql`: adds nullable
   `boards.template_key`, nullable `board_elements.parent_id`,
   `locked default false`, tenant-scoped parent constraints/index, bounded
   object validation, container movement/ownership triggers, and authenticated
   atomic operation/template RPCs.

Both files were read and inspected before mutation. Neither contains DROP,
TRUNCATE, reset or record-deletion statements. Existing object identity, history
and audit provenance are preserved. The supported
`supabase db push --linked --dry-run` listed exactly these two files, no seeds
or roles. `supabase db push --linked --yes` applied both unchanged, followed by
ledger verification. No applied migration source was rewritten and no third
migration was needed.

Authenticated API schema inspection confirms `template_key`, `parent_id`,
`locked`, `apply_board_operation`, `create_board_from_template` and the existing
comment RPC. Actual creation of Sections/Groups/Links, movement, ownership and
lock behavior also verify the required enum/trigger/constraint contracts. The
original missing RPC/column mismatch explained the reported universal
persistence failure.

## Real persistence and test boundaries

A single explicitly named QA account/organization owned three isolated QA boards
and one private test image. Setup uses an admin-created confirmed test account,
then normal password sign-in and authenticated organization/template/operation
RPCs. Application mutations run as that user under normal permissions and RLS.
Unrelated existing accounts, organizations and boards are never targeted.

The direct authenticated RPC suite passes 18 checks: create/edit, move/resize,
duplicate, lock denial/unlock, layers, Group/Ungroup, alignment/distribution,
Section creation/membership/movement, archive/restore and reloaded exact
geometry, text and ownership. Browser QA signs in through the real application
and exercises actual Next actions and Supabase transport, including
Shift/marquee selection, context actions, Properties, Layers and network-failure
rollback/retry.

The two permanent pgTAP suites pass 93 assertions against actual repository SQL
in isolated PostgreSQL/PGlite. `supabase test db --linked` was attempted but its
runner requires unavailable Docker; it did not run hosted pgTAP. Successful real
hosted RPC/browser verification is separate from this local SQL test execution.
Final browser counts are recorded in PROJECT_STATE. All test fixtures were
removed after verification: one account, one organization, three boards and one
image. The existing owner-deletion RPC first failed with the board
creator-membership foreign key because membership cascade ran before board audit
references were removed. Its transaction rolled back. Cleanup verified exact
ownership, names and the three inventoried board IDs, removed only those test
board rows, then used the owner-deletion RPC and removed the test account.
Unrelated data was not targeted. The pre-existing organization-deletion ordering
issue remains separately scoped.

## Developer diagnostic

Run `node scripts/check-boards-schema.mjs` with the local environment
configured. The read-only check requires the configured URL and service-role
key, prints only project host and safe compatibility/missing names, and fails
clearly when schema is outdated. It never auto-migrates or logs credentials.
Inspect the CLI ledger and reviewed dry run before any future authorized
migration. Keep all local credentials and QA artifacts ignored. REDESIGN-005
remains unstarted.
