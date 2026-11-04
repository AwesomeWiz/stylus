# Native Stylus entities in Boards

REDESIGN-005, 2026-11-05. PASS; manual NVDA and other-engine checks remain explicit limits.

## Public Core contract and trusted registration

`apps/web/src/core/entities/public.ts` owns strict reference, projection, metadata,
provider and registry contracts. The trusted application composition host
`plugins/board-entities.ts` registers Core Tasks and Marketing-owned adapters.
`plugins/index.ts` exposes the server registry. Core Boards import that public
host and Core contract; they never import Marketing persistence or private
modules. Marketing declares its read capabilities in its existing manifest.
Static registration validates namespace ownership, unique type IDs, bounded field
definitions, safe internal openers and provider creation/validation pairs. This
is compiled trusted code, not remote discovery or executable client metadata.

```ts
const reference = {
  entityType: "core.task",
  entityId: "00000000-0000-4000-8000-000000000001",
  organizationId: "10000000-0000-4000-8000-000000000001",
};
```

These documentation UUIDs are illustrative. No tenant IDs belong in reusable
templates. Saved `ENTITY_CARD` objects contain only `content.reference`, empty
style and optional `metadata.conversionId`. They retain normal Board geometry,
ownership, lock and lifecycle. No title, status, excerpt, alias or privileged
snapshot is persisted. SQL validates tenant/shape and immutable reference
identity; insertion, duplication and clipboard writes also resolve fresh server
authority. Existing unavailable cards can still be moved or archived under normal
Board permissions.

## Binding and openers

| Type | Binding | Canonical opener |
| --- | --- | --- |
| `core.task` | Current Task; existing 14-day completion/archive semantics | `/tasks?task=<id>&view=all` or `archive` |
| `marketing.research-evidence` | Exact immutable row UUID + `runId` + `evidenceId`; no invented version | Research with exact run/evidence selection and EVID anchor |
| `marketing.reel-idea` | Current Reel Idea | Ideas with validated `item` selection |
| `marketing.competitor` | Current Competitor | Existing Competitor detail route |
| `marketing.campaign` | Current Campaign | Campaigns with validated `item` selection |
| `marketing.creative-brief` | Current human Creative Brief, distinct from immutable Reel Brief versions | Human briefs with validated `item` selection |
| `marketing.research-note` | Current existing manual Research Note | Manual Research with validated `item` selection |

The first six are searchable picker categories. Manual Research Note is a
conversion-result provider required by the existing human notes domain; it is not
Evidence and is not an additional picker category. It can be opened, resolved,
duplicated and copied after creation.

Selected Marketing records are freshly fetched when absent from the visible list,
including archive-state changes. The existing workspace displays their fields and
existing edit controls. Exact older Evidence runs are loaded beyond the recent-50
history boundary, with the selected existing Evidence disclosure opened. Normal
links preserve modifier-click/new-tab behavior. Same-tab navigation checks Board
unsaved work; no canonical object is edited from the card itself.

## Reads, authorization and lifecycle

The private read-only `POST /api/boards/entities` transport enforces same-origin
browser Host/Origin, streamed 32 KB input and private/no-store responses. Every
request checks current account/organization membership, active Board and enabled
plugins. Providers query only that organization under RLS. VIEWER reads permitted
cards but receives no creation capability. Mutations recheck editor role and
target-domain authority separately; a Board reference grants no new authority.

Resolve requests contain at most 50 references. The registry deduplicates/group
queries by type and validates each projection/opener. Search uses bounded 25-item
UUID-keyset pages and escaped literal text. There is no per-card subscription,
whole-organization preload or signed-URL snapshot. Evidence projections retain
exact source identity, modality and available retrieved/published provenance;
missing information is not invented.

A Board-local external store holds projections outside saved rows/Flow data.
Cards and Layers subscribe per reference; Board search derives an ephemeral title
index. Focus/visibility refresh clears projections before loading, explicit refresh
does the same, and a visible-tab 30-second refresh bounds ordinary staleness.
Requests are sequential and generation-checked; failures purge privileged titles
and openers. There is no cross-request/user/org cache or persisted title cache.
Revoked, disabled, missing and deleted records render a generic unavailable state;
provider failures expose no provider bodies. Archived authorized records retain a
clear archived label and real opener. Re-enabling Marketing resolves the same
reference identities.

Native cards use existing selection, Layers, Groups, Sections, arrange, lock,
duplicate, undo/redo and presentation. Native Layers cannot be renamed into stale
aliases. Clipboard transfer contains only validated references and geometry,
strips conversion receipts, rejects cross-organization paste and reauthorizes on
insertion. Duplication copies a reference, never its target record. Static Board
templates remain free of tenant references.

## Explicit creation and durable recovery

Contextual preview forms support Sticky -> Task, Sticky -> Reel Idea, selection ->
Task and selection -> manual Research Note. Plain text from 1-30 explicitly
selected Text/Sticky/Shape/Arrow/Link objects is extracted in deterministic order,
with a visible bounded source preview. Images, hidden descendants, comments,
native projections and whole-Board retrieval are excluded. Registered fields use
existing domain validation; reviewed UTF-8 input is bounded before allocation.
Task owner/deadline/priority and existing Idea/Note fields remain editable before
submission. Opening a form or changing a type executes nothing.

Source objects stay on the Board. Native placement seeks free geometry beside
the selected content. Optional replacement mode is deferred. No conversion adds
Company Knowledge, memory or AI execution.

`board_entity_conversions` stores an own-creator, tenant/Board-scoped receipt with
reviewed input, source IDs and server-allocated target/card UUIDs. The attempt UUID
is stable across submission retries. Preparation locks the active Board and
rejects a changed payload under the same key. Target-domain RPCs freshly validate
role/plugin/source authority and create their canonical target plus `CREATED`
receipt state in one transaction. Existing Task/Marketing domain services route
through those RPCs, retaining normal table constraints and activity/lifecycle
triggers. Ordinary CRUD is unchanged.

Board linking is a separate normal atomic operation. If it fails, the target and
receipt remain. Retry reuses the same target/card IDs; a lost successful response
finds the existing card without overwriting its geometry.
An explicitly archived conversion card is never resurrected by recovery; making
a new reference requires explicit existing-item insertion. Reconciliation preserves
newer collaborator rows rather than adopting an older recovery snapshot. The picker exposes the
creator's latest 20 conversion receipts for explicit reload recovery. Preview
fields are frozen after a creation attempt, except validation failures before
receipt allocation. A deleted created target is never recreated on retry. Board
deletion nulls its receipt link and retains canonical records. Receipt reads are
own-creator/editor only and direct receipt writes are denied.

## Boundaries and verification

Generic Board mechanics, typography/colors, voting and presentation architecture
remain frozen. Native vote eligibility is deferred; existing supported Board
types and Group voting retain their semantics. Existing comments/reactions remain
Board-local and presentation uses the same renderer. No AI calls, automatic
Knowledge promotion, public sharing, entity task-system copy or new Marketing
workflow is introduced.

Three forward migrations add the enum, Core receipts/reference validation and
domain-owned conversion RPCs. They preserve existing records and introduce no
reset, DROP or TRUNCATE. All 42 local/remote versions match. The full web suite
passes 227 files / 1,292 tests; all six actual-SQL Board suites pass 246 assertions
in isolated PGlite. Lint, worker/web typecheck and production web build pass.
Hosted authenticated/API/browser tests verify all six types/openers, four
conversions, repeated attempts, failed linking, lost success responses, reload,
deleted-target refusal and own/foreign/revoked/plugin-disabled boundaries.
Existing voting/presentation and native comments/reactions/manipulation pass.
Sixteen both-theme responsive cases and touch/keyboard/focus checks pass.

Three production direct-entry samples per fixture observe median canvas readiness
of 1,846ms baseline vs 1,483ms current for 500 ordinary objects and 1,527ms for
500 objects including 50 native cards. All 50 authorized projections take median
4,423ms; each load uses one discovery plus one 50-reference resolve request.
Resolution adds no observed Long Tasks; native selection/search medians are
31.8/21.7ms. Existing canvas virtualization remains enabled. Small samples are
neither cold/warm percentiles nor speedup/SLA claims. Manual Windows NVDA and
other browser/device engines were not exercised.

Exact cleanup verifies four QA accounts, two organizations, four Boards and their
inventoried canonical/source/run/job/dependent rows are absent. Evidence/source
immutability triggers remain enabled. No AI/worker execution or uploaded private
asset was used. Task helpers are stopped. Reports/screenshots/scripts stay ignored
and are never shipped. PROJECT_STATE records the final delivery and limits.
