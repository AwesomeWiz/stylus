# Boards V2 interaction and creative usability

REDESIGN-004.3 · 2026-11-03 · PASS; local and real authenticated verification complete.

REDESIGN-004.2 stabilizes this foundation. The owner authorized the configured
Stylus backend for this task; the two missing forward migrations are now
applied. [Environment findings](BOARDS_ENVIRONMENT.md) records the exact
migration plan, real authenticated verification and isolated test scope.

Boards is Core's visual workspace for turning research, inspiration and ideas
into decisions and executable work. The public URLs remain `/whiteboards` and
`/whiteboards/[boardId]`; SQL/module names stay unchanged. This phase creates
board-native objects only. It adds no AI execution, Marketing-private imports,
canonical entity cards, conversions, votes or memory promotion. REDESIGN-004.3
adds bounded reactions and reversible comment resolution.

## Current interaction hierarchy (REDESIGN-004.3)

Layers provides structure/navigation; Canvas provides spatial manipulation;
Properties provides detailed attributes; the bottom toolbar provides creation;
context menus provide contextual operations; keyboard shortcuts provide the
fastest power-user path. Group means manipulation, Section means organization,
Reaction means social feedback, and Vote means a structured decision. Voting is
deferred.

Desktop starts with 256px Layers left and 288px Properties right. They collapse
independently, with device/account-scoped boolean preferences. View and
Ctrl/Cmd+Shift+Backslash toggle distraction-free mode; visible restore controls
remain. Tablet/mobile use one modal panel rather than two squeezed docks.
Comments occupies the Properties slot and retains loaded discussion/selection.
The horizontal bottom toolbar uses grouped tools, upward Shapes and More menus,
named focus tooltips and roving focus. View owns grid, snapping, minimap and Help.

Layers supports native row drag with explicit insertion/container/root targets,
500ms hover expansion and gradual edge scrolling. Reparenting preserves IDs and
world geometry, moves Groups as units and rejects invalid partial/nested
ownership. Integer layer gaps avoid unrelated changes where possible; a dense
reorder requiring more than 200 updates is rejected with recovery guidance.
Double-click/F2 renames inline, Enter/valid blur saves, Escape cancels. Display
labels use bounded metadata for content objects; actual text/alt stays separate.
The keyboard tree supports arrows/Home/End/Enter/Space, Shift selection and
Shift+F10, explicit expansion state, parent/child selection and Locate.

Canvas candidates retain authored and measured dimensions, stable unchanged
node/data identities and resize controls through saving. Pointer frames update
only local positions; release submits one atomic operation. Confirmation/own
echo does not remove and reinsert the node. Locked selected objects stay fixed.
Atomic actions return their bounded result without re-rendering the whole editor;
an account/organization-scoped boolean refreshes the list once on return. It
stores no Board content and supplies no authorization.

Text/Sticky content uses Geist, Lora or Geist Mono; application chrome remains
Geist. Licensed self-hosted Latin assets load only when used, with no runtime
CDN/preload. See the [font sources and limits](../apps/web/public/fonts/boards/README.md).
Controls cover family, real weights 400–700, size 8–256, alignment, line height,
letter spacing, true Lora italic, underline/strikethrough, color, vertical
alignment and fixed/auto-height sizing. Auto-height uses local selected-face
measurement and one content/geometry intent; remote changes cancel stale
measurement. Sticky Enter saves/Shift+Enter inserts a line; Text Ctrl/Cmd+Enter
saves; Escape cancels. Shape/Arrow geometry remains bounded; arrows add labels,
direction and a larger transparent hit target, without attached relationships.

Smart guides precompute up to 128 nearby nonmoving targets once per gesture.
They show aligned edges/centers and horizontal equal-gap hints; optional object
snapping uses a six-screen-pixel threshold, independent grid snapping uses 24
Board units, and Ctrl/Cmd temporarily bypasses snapping. Guides never persist.
Alt/Option drag copies Text/Sticky/Shape/Image/Group locally and saves all new
identities as one undoable intent, retaining original geometry and image assets.
Ctrl/Cmd+D keeps the existing 24-unit offset; repeated-offset memory is deferred.
Selection quick actions expose relevant text/color/image, duplicate, lock,
comment, Group/Section and reaction controls, hiding during manipulation/saving.

Reactions are a small explicitly requested social emoji set (Like, Love, Great
idea, Interested, Celebrate), separate from Lucide application controls. Each
person/object/kind has one idempotently set active state. Members edit; VIEWER
reads. Exact counts and bounded directory-resolved participants refresh on the
private Board channel, with optimistic rollback and own-echo reconciliation.
Archived targets hide feedback; removed members lose access while former-member
feedback remains historical; account deletion cascades its reactions. There is
no anonymous feedback model or automatic winning-object conversion.

Root discussion threads can Resolve/Reopen without deleting content. Fresh role
checks protect state changes; replies cannot be resolved separately. Object
badges use bounded open-thread counts without fetching bodies; opening Comments
loads the existing paged discussion. Resolved threads disclose on demand and
Locate retains exact target identity. Local Board search covers names and safe
text/notes/alt, showing the first 50 matches with an exact count. It uses no
server/global index. Locate focuses Section bounds and respects reduced motion;
presentation mode and free-floating comment pins are deferred.

Image preview signing now waits for visible or selected objects, still in
freshly authorized batches of at most 25. Existing paste/drop, independent retry,
private originals, replacement identity, crop/fit and history remain. Reactions
and open-thread summaries similarly use a reviewed visible/selected projection
of at most 200 object IDs; no bodies or privileged snapshots enter Board JSON.

The two forward migrations add `board_reactions`, `resolved_at`/`resolved_by`,
their constraints/RLS/indexes and four scoped read/set RPCs. Existing records and
applied migrations are preserved. See [database contracts](DATABASE.md) and
[environment verification](BOARDS_ENVIRONMENT.md). The historical foundation
sections below retain their original verification evidence; the interaction
contract above supersedes their earlier vertical-toolbar/single-panel and
unresolved-only discussion descriptions.

## List, creation and shell

The list stays in AppShell and uses responsive cards: one column on mobile, two
on tablet, three on desktop and four on large screens. Cards show real title,
recorded template (otherwise “Board”), directory-resolved owner/updater and
local updated time. Deferred viewport-triggered previews freshly authorize each
active board, read at most 128 deterministic objects and render simplified real
geometry, text and colors. Image objects use an image glyph; no signing or
external fetch blocks the list. Empty/unavailable previews use a neutral
dot-grid/type fallback. These are miniature content projections, not screenshots
or invented tenant content.

Creation retains seven native templates: Blank Board, Brand Moodboard, Campaign
Board, Reel Storyboard, Research Synthesis, Competitor Inspiration and
Brainstorm / Workshop. Initialization still creates Sections and owned notes
atomically; Blank creates no objects. Rename/archive and VIEWER read paths
remain.

The editor is outside `(workspace)` and AppShell. BoardShell shares the verified
workspace context and public plugin navigation host, but loads no global
notifications/search. Its client boundary is keyed by organization, board,
account ID and role. The compact header contains overlay main navigation, Back,
title editing, unique collaborator display, Comments, save state and Board menu.
A skip link reaches the canvas; header/main/heading semantics and document title
remain available. Closing navigation restores canvas focus without fitting or
moving its viewport. Failed/unconfirmed work warns before leaving; there is no
offline durability promise.

## Objects and operations

| Type          | Persisted behavior                                                                            |
| ------------- | --------------------------------------------------------------------------------------------- |
| TEXT / STICKY | Bounded plain text and existing formatting; default text follows theme foreground             |
| SHAPE         | Rectangle, Rounded Rectangle, Circle, Diamond; legacy ellipses remain readable                |
| ARROW         | Simple horizontal arrow or line; no attached-connector relation is introduced                 |
| IMAGE         | Private asset path, description/caption/source metadata, fit/crop/aspect settings             |
| LINK          | Manual title, HTTP(S) URL and optional note; no fetching, scraping, HTML or embeds            |
| SECTION       | Named root container, explicit ownership, bounds and persisted collapse state                 |
| GROUP         | One-level logical container, optionally within one Section; children retain world coordinates |

All objects retain independent UUIDs, world geometry, audit provenance and
archive state. A nullable `parent_id` has a composite organization/board/object
foreign key. Sections cannot nest; Groups cannot contain Groups/Sections.
Ordinary objects cannot own children. Overlap does not reparent. Use “Move to
section” in Properties or the context menu. A container supports at most 199
descendants; one operation touches at most 200 objects including implicit
descendants.

`apply_board_operation` freshly authorizes an active board and
OWNER/ADMIN/MEMBER, locks that board, validates bounded explicit projections,
and commits all rows or none. Direct table writes retain RLS and repeat
ownership/lock validation; their trigger also takes the board lock. Moving a
Section/Group translates descendants atomically. Changing container dimensions
changes bounds and leaves child geometry alone. The client submits one operation
at drag/resize completion, never each pointer frame. Groups are invisible
manipulation containers until selected; Sections are visible named organization
regions. Frame rendering stays behind owned children while preserving the
block's stored layer order relative to other objects.

Selection retains all selected identities. Group/ungroup preserves world
coordinates. Alignment uses visible selection bounds, including axis-aligned
envelopes of rotated objects. Locked objects stay fixed and may anchor
alignment. Distribution requires at least three unlocked objects and spaces
outer edges evenly. Same width/height uses the largest selected dimension,
preserving locked image aspect and Circle geometry; containers/arrows are
excluded. Four layer commands, duplicate and lock/unlock persist. Locked objects
remain inspectable; locked descendants prevent a partial container move.
Archiving a Section explicitly offers keeping children at board root or
archiving the ownership tree. Duplicate remaps local identities and ownership,
retains image assets, and does not duplicate comments.

Local patch history stays bounded at 75 operations. Multi-object intents occupy
one entry and one transaction. Remote rows never enter local undo; a remote
change invalidates operations touching that identity. Active edits queue remote
updates, then database timestamps choose the committed winner. Unchanged
duplicates, strictly older events and stale resurrection after archive are
ignored. PostgreSQL microseconds are retained; changed rows sharing a
transaction timestamp reconcile in delivery order. Failed saves roll back the
failed intent and its history change to confirmed state while retaining received
remote changes and unrelated history. The board remains usable and no routine
failure requires a page reload. Safe Retry reapplies the same identities. An
intervening collaborator change disables unsafe retry; “Reload latest state”
runs a freshly authorized snapshot read inside the board. Authorization, lock,
operation limit, conflict, validation, schema and infrastructure errors have
safe separate codes/messages. Server diagnostics log codes only. The header owns
Saving/Saved/Couldn’t save; a successful later operation or dismissal clears the
local failure. A failed intent is not left as a permanently dirty draft.
Focus/reconnect reads reconcile only when no local change raced with the read.
Layout state is never mutation authority.

## Images, links and deferred reads

The existing private `board-images` bucket and PNG/JPEG/WebP, 10 MB-per-file
policy remain. File picking, batch drop and paste accept up to ten queued files.
Each file shows queued/uploading/uploaded/error status with independent retry;
these are real action states, not fabricated byte percentages. Browser decoding
uses natural proportions where supported. Uploads carry a stable preallocated
identity so a lost response can be retried without creating a second object. The
Server Action body limit is 11 MB to transport one allowed 10 MB image.

Replace updates the same object and retains position, size, caption, source and
comments. It records previous paths and never deletes a committed original. Undo
and duplicate may still reference those assets. Only an uncommitted new upload
is cleaned up on persistence failure; permanent garbage collection is deferred.
Crop is CSS presentation over the retained original, with zoom 1–4 and focus
coordinates 0–100. Contain/cover, aspect lock, descriptions and captions are
available in Properties. Source URLs are metadata, never fetch permission.

Initial server data contains the active board, complete ID-keyset object pages
of 1,000 and the authorized directory, with **zero comment bodies and zero image
signing requests**. The canvas renders before authenticated image-preview reads.
Those reads freshly validate expected organization/active board and sign at most
25 current-board paths per batch using the supported Storage batch API. URLs
expire after one hour, stay in component state, and are never persisted/shared
across accounts. Missing/expired previews have local retry; stale results cannot
replace a different current asset path. Signing failure does not delete an
asset.

Comments load on opening their panel: newest 200, deterministic timestamp/UUID
cursor for earlier records and bounded missing-parent recovery. Existing shallow
replies, structural mentions, archive permissions, notifications and activity
remain. A missing selection is explained instead of silently posting a selected
thread to board scope. Layers and Properties have visible tabs and Comments
replaces the same panel slot; desktop is nonmodal, tablet is an overlay and
mobile is a full-width modal sheet. Selection and loaded discussion survive
panel switching. Comment resolution is not introduced in this phase.

## Controls, Properties, Layers and accessibility

Desktop tools are vertical and grouped: Select/Pan; Text/Sticky/Shapes/Arrow/
Section/Image/Link; More/history. Tooltips, roving focus, named Shapes and
one-shot creation remain. Mobile uses Select/Pan/Add/More. Bottom-right zoom and
fit controls are independent of the View menu's dot grid/minimap toggles. React
Flow supplies a restrained zoom-aware SVG dot grid, never a DOM grid. Viewports
remain local to account/organization/board and never change saved dimensions.

Click selects one; Shift-click toggles one. Custom click selection is the sole
authority for clicks, while React Flow selection changes are consumed only
during marquee gestures. Shift-marquee preserves the earlier selection.
Ctrl/Cmd+A selects roots. Escape clears selection/exits a tool. Properties/Layer
switching preserves selection. This fixes the former double-update between React
Flow and custom click handlers. Group selection still normalizes child clicks to
the Group.

Right-click and Shift+F10/Context Menu open bounded keyboard menus. A visible
Selection actions button supplies the same touch/keyboard alternative. Menus
respect object type, count, locks and ownership: single-object operations;
compatible Group/Ungroup, alignment/distribution/size; Section
rename/collapse/select contents/ explicit archive options; empty-canvas
insertion, paste, fit and view toggles. Arrow keys/Home/End, submenu navigation
and Escape/focus return are supported. Only implemented clipboard/actions
appear. Internal Copy/Cut/Paste/Paste here remain in component memory scoped to
the current board, copy local objects and retain private image references; they
read no system clipboard text. Existing image paste remains. Leaving the board
discards the internal clipboard.

Properties edits the selected object's applicable transform/content/image/link/
appearance controls. Transform fields use text with explicit finite
decimal/range parsing, display at most two fractional places and retain internal
precision. Enter or blur commits; Escape restores the confirmed value; invalid
input is inline. There is no native number-step popup or Save object button.
Alignment, distribution, matching size and four arrangement actions use named
icons/tooltips. Irrelevant control groups are hidden. Lock/read-only and
transient pending states remain clear.

Group = manipulation (“Move and edit several objects together”). Section =
organization (“Organize related work inside a named area”). Create section from
selection wraps compatible unlocked roots/Groups with padding in one operation,
preserves children/world coordinates and focuses the name after confirmation. F
activates a drag-sized Section tool. Hovering a dragged object over a Section
gives feedback and an explicit Move to section hint; overlap never silently
reparents.

Layers reuses the ownership outline with type icons and high-to-low stacking:
Section > Group > objects, plus loose roots. It supports select/Shift-select,
local hierarchy expand/collapse, F2/double-click rename, lock/unlock, contextual
arrangement and section reassignment, and Locate. Collapsed canvas Section
content remains reachable by expanding its Layers hierarchy. No second hierarchy
persistence, visibility model or unvalidated hierarchy dragging is introduced.

Canvas shortcuts: V/H/T/N/F tools; Space pan; Enter insert/Properties; arrows 1,
Shift+arrows 10; Ctrl/Cmd+C/X/V internal clipboard; D duplicate; G/Shift+G
Group/ Ungroup; brackets backward/forward and Shift+brackets back/front;
Z/Shift+Z or Y history. Modifiers are Ctrl/Cmd for these commands. Delete
archives only from canvas focus. Fields/links/buttons suppress canvas shortcuts;
Tab has no canvas trap and single-key tools can be disabled. Help is a compact
grouped keycap reference.

Selection/saving/error announcements stay polite. Panels share one slot: desktop
nonmodal, tablet overlay, mobile full width; narrow dialogs trap and restore
focus. Reduced motion remains respected. Manual Windows NVDA and physical-device
checks remain target-environment acceptance, not claimed automation.

## Realtime and verification limits

Existing authenticated private `board:<organizationId>:<boardId>` subscriptions,
directory-resolved names/roles, unique-user/multi-tab normalization, stable
active-set collaborator colors, slow Presence and throttled cursor Broadcast
remain. Cleanup unsubscribes on board/account/organization changes. Connection
state is separate from database saving; reconnect reconciles missed rows.

REDESIGN-004.2 adds real authenticated QA against the authorized development
backend. The supported CLI migration ledger/dry-run showed only the two existing
`202611020001*` migrations missing; both were applied without schema reset,
DROP, TRUNCATE or deletion of unrelated records. Required columns, enum/object
behavior, `apply_board_operation` and `create_board_from_template` are verified.

An isolated QA account/organization/boards/private image exercise actual RPCs,
signed-in Next actions and browser interactions, including reload persistence
and network-failure rollback/retry. Permanent PostgreSQL/pgTAP suites pass 93
assertions in isolated PGlite. The hosted CLI pgTAP runner requires unavailable
Docker; this is distinct from successful real hosted mutation verification. No
production latency or broad device-performance claim is made. Final test/browser
counts and fixture disposition are recorded in PROJECT_STATE and the environment
notes.

`node scripts/check-boards-schema.mjs` is a developer-only read diagnostic using
local environment credentials. It reports safe schema compatibility/missing
names and never auto-migrates or exposes keys. End-user errors reveal no SQL
details.

## REDESIGN-004.3 verification and limits

Full web 202 files / 1,142 tests, Board coverage 37 / 217, lint/typecheck/build,
four SQL suites / 138 assertions and final scoped checks pass. Real production
Chrome QA covers both themes/eight widths, all seven required drag cases, actual
Layers/Alt operations, comment/typography reload, private image workflows and
offline rollback/retry. Ten hosted API checks independently verify fresh roles,
revocation and tenant boundaries. All isolated fixtures and checked local helpers
were cleaned up. See PROJECT_STATE and [environment notes](BOARDS_ENVIRONMENT.md).

The 1,000-object / 20-image-object fixture uses one shared private image. All
previews load; feedback projection limits do not starve image signing. Three
uncontrolled production full-document samples reached first nodes in
6,181 / 3,647 / 7,070 ms, with 91,835 transferred / 1,599,172 decoded document
bytes. A 100-pointer-move probe wrote zero operations but recorded two Long Tasks
(104 and 50 ms). This remains a measured large-document profiling opportunity;
no general speedup, p95 or performance-budget pass is claimed. Manual NVDA and
Firefox/Safari remain unperformed. Local font subsets use system fallback for
other scripts. Voting, presentation and attached connectors remain deferred.

## Recommended REDESIGN-005 boundary — not started

Prioritize public Core entity-reference, resolver, opener and creation contracts
for Task, Research Evidence, Reel Idea, Competitor, Campaign and Creative Brief;
Marketing registers through that public host. Resolve every reference with fresh
tenant/plugin/entity authority, exact immutable versions where applicable and a
generic unavailable state without stale excerpts. Deliver native insertion and
explicit conversion previews with idempotency and recovery before optional P1
breadth. Reuse existing creation APIs; failed board linking must reattach an
already-created record. Reuse the reactions and comment resolution delivered in
004.3; scope bounded visible voting separately. Establish authorized selection/context-preview
contracts; new AI execution, follow/history, anonymous voting and exact-version
storyboard execution need their own explicit bounded acceptance. No board action
promotes Company Knowledge or grants another memory domain.

## Implementation map

- `app/(workspace)/whiteboards` owns list/loading/error presentation in
  AppShell; `app/whiteboards/[boardId]` and its parent loading/error boundaries
  own immersive direct entry. Existing URLs remain canonical.
- `components/whiteboards` separates BoardShell/navigation/chrome, canvas/tools/
  nodes, Layers/Properties/comments and document/collaboration/image/upload
  hooks. `components/ui/dialog.tsx` only adds an optional scoped class variant
  so board sheets meet narrow-screen target sizes without restyling other
  dialogs.
- `modules/whiteboards` owns bounded schemas, atomic actions, templates, pure
  operations/history, precise timestamp comparison and authorized deferred
  reads. `lib/supabase/database.types.ts` reflects the new columns/RPCs;
  `next.config.ts` permits transport of one existing-policy image.
- Two `202611020001*` migrations and the two board pgTAP suites own persistence
  verification. Focused component/server/operation tests and the existing
  workspace route contract cover the revised boundary; unrelated tests remain
  enabled.
- PROJECT_STATE, CODEX_TASKS, CHANGELOG and the Roadmap/Architecture/Database/
  Decisions/UI Patterns documents record delivery and its limits. Temporary QA
  harnesses, reports and screenshots remain ignored rather than shipped.
