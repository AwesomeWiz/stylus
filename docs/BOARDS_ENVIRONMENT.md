# Boards environment and migration verification

REDESIGN-004.2 · 2026-11-03.

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
