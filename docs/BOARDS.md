# Boards V2 interaction and creative usability

## Voting, Section presentation and visual colors (REDESIGN-004.3.3)

2026-11-04 · PASS. Full web **220 files / 1,266 tests**, lint, typecheck and
ordinary production build pass. Final scoped formatting/link/scope/secret/artifact
and diff review are recorded in PROJECT_STATE. This phase adds visible decisions and local
presentation to Core Boards. It adds no native entity cards, AI, memory promotion,
public sharing or slide model. URLs and canonical Board objects are unchanged.

### Voting

The Board-header collaboration control opens a focused configuration/results
surface. Editors choose 1–5 votes per person (default 3) and eligible Text, Sticky,
Image, Shape and Group types. Multiple allocations to one object are allowed.
Sections, connectors and locked/inherited-locked objects cannot receive new votes.
One session may be active per Board. VIEWER reads; editor starters or OWNER/ADMIN
may explicitly confirm ending. Ended casts/removals reject; completed records
remain audited, with the latest session shown rather than a new analytics UI.

`board_voting_sessions` and versioned `board_votes` slots are tenant/Board scoped.
RPCs lock the Board and freshly validate membership/role/object authority. A slot
belongs to its authenticated actor, not a client-supplied voter. Current request
UUIDs are idempotent; slot versions reject delayed/concurrent overwrites. Inactive
tombstones allow safe budget reuse. Own allocations on archived/locked targets
can be reclaimed while active. A real overlapping-request test confirms only one
of two casts can take the same slot; the stale request promptly returns PT409.

The existing private Board channel sends session revision invalidations. Counts
are freshly read, never accepted from cursors/Presence/Broadcast. A Board-local
external store overlays only one pending own allocation and rolls back only that
overlay on failure, retaining newer remote counts. After uncertain writes, refresh
precedes another submission. Object badges subscribe independently; canonical
rows, undo history and Flow node data do not change for votes. Directory identities
are resolved locally; unavailable objects never display a stale title/excerpt.

Visible/selected summaries use independently authorized batches of at most 200,
published only when session identity/revision agree. Results have deterministic
100-item keyset pages; equal totals share dense rank and UUID breaks display ties.
Each result offers Locate and up to 20 unique participant IDs resolved through the
current directory. Own records cap at five. Access denial purges private counts.

Background reads use `POST /api/boards/voting` with a 16KB streamed body cap,
Origin/Host check, private/no-store responses and a 20-second client timeout.
The route delegates to the existing fresh server authorization and bounded output
validation. This avoids queuing projections ahead of saves in Next's browser
Server Action queue. Start/cast/end remain scoped actions/RPCs. A known absent
session is rediscovered through channel/focus events, not every pan.

### Section presentation

The header Present control starts at the selected active top-level Section,
otherwise the first in Layers' high-to-low stored order (UUID ties). No Sections
shows focused guidance. Presentation retains the same mounted Flow canvas and
existing Section-fit path, with title/progress, Previous/Next/Exit and optional
fullscreen. Left/Right, Space/Shift+Space and Escape are documented in Help.
Ordinary button/link keyboard activation remains; endpoints do not wrap.

Editor chrome, selection, creation, drag/resize, paste/drop and mutation shortcuts
are guarded. Canonical safe links remain usable, including inside Groups. No
permission is expanded. The editor's panels, selection, revealed/collapsed context
and viewport restore on exit. Presentation fits do not overwrite device-local
editor viewport storage. Fullscreen is explicitly requested; its failure leaves
windowed presentation usable, and browser fullscreen exit returns to the editor.
Reduced motion uses immediate fits; ordinary fits use the existing short duration.

Remote content remains live without refitting the viewport. Reordering preserves
the active identity; removing it chooses the nearest surviving Section with a
notice, or exits if none remain. This is local view state: no public URL, persisted
slide copies, themes, animation editor or presentation-specific schema.

### Visual color picker

One reusable control serves Text ink, Sticky fill/ink, Shape fill/stroke and Arrow
ink. Desktop opens a floating popover immediately left of Properties without
resizing/reflow. Collision-aware tablet placement and a clamped mobile overlay
stay inside existing modal focus scopes. The first Escape closes only the nested
picker and restores its swatch focus; a later Escape can close the sheet.

Saturation/value square and handle, hue, alpha, HEX and presets synchronize in
both directions. Keyboard arrows and larger Shift steps provide a square input
alternative. HEX3/4/6/8 uses existing bounded styles; Shape None commits transparent
HEX. Actual per-object previews use a local store, so raw pointer frames write
neither history nor the database. Completing a gesture, submitting HEX or normal
outside dismissal commits one existing Board operation. Escape cancels the
unfinished preview to the latest confirmed paint; prior completed gestures remain
committed. Failure clears the overlay and retains canonical rollback/recovery.

Native EyeDropper is feature detected, explicitly invoked and abortable; failure
or unsupported browsers retain normal controls/HEX. Its RGB sample preserves the
current alpha. Native OS sampling is not claimed from headless QA; deterministic
API success and unsupported paths are covered by component tests.
**Pick from Board is deferred**: a safe sampling/input-mode contract is separate
scope. There is no fake sampling button or arbitrary image/canvas fetch.

### Evidence and limits

Two reviewed forward migrations were dry-run/applied through the supported CLI:
`20261104000100_board_voting.sql` and
`20261104000110_board_voting_conflict_response.sql`. The latter preserves the
applied first migration while replacing application-conflict SQLSTATE 40001 with
PT409 to avoid the observed hosted retry timeout. All39 local/remote versions
match. Existing `template_key`, `parent_id`, `locked`, operation/template RPCs,
new columns and all four voting RPCs were explicitly verified. No reset,
DROP/TRUNCATE, seed/role application or unrelated data deletion occurred.

All five permanent Board pgTAP suites pass in isolated PGlite: **201 assertions**,
including **63 voting assertions**. SQL cases include roles/tenants/revocation,
direct writes, budget/slot reuse/idempotency, target/ancestor locks, archival,
ending, ties, participant uniqueness/caps and 105-result pagination. Hosted RPC
smoke passes ten lifecycle/concurrency/security groups. Real two-user browser QA
passes live counts, own allocations, injected failure/rollback, ending/results,
presentation/input/fullscreen/restore, Section content/reorder/archive/restore,
color preview/one-save gestures/reload, VIEWER, safe links and touch navigation.
The final private read route passes real member, foreign, revocation and signed-out
proxy-boundary checks. Both themes pass 320/390/430/768/1024/1200/1440/1920 px,
including popover bounds, focus restoration, modal containment and control targets.

The 500-object comparison uses ordinary production builds at 1440×1000 on Windows,
Ryzen 7 3750H/8 logical CPUs/about 7 GiB RAM, Node 24.22.1 and headless Chrome 156.
Three samples per phase compare the verified 004.3.2 baseline. Lightweight drag,
Layers and Section-focus samples recorded no Long Tasks in either build; React
instrumentation produced cold outliers that did not recur in the lighter probe.
Voting diagnostics rendered **zero object bodies** per individual update; color
preview rendered **one affected body**. Known image URLs and mounted nodes remain
stable across votes. Presentation transitions use the same viewport/index path;
only normal offscreen virtualization changes visible objects.

A server trace identified projection actions ahead of saves. After the private
read-route correction, three valid drag/save observations were **3.124/2.462/1.825s**
against baseline **3.101/2.550/1.895s**. One 51ms Long Task occurred in the final
current trace; it was not a repeated hot-path regression. These small, network-
dependent samples include input, fixed settle time and persistence; they are not
SLAs or general speedup claims. Invalid-origin diagnostic runs are excluded from
acceptance. Existing large initial-render/marquee limits remain; no broad cache,
new index, database rewrite or CRDT system is introduced.

Task cleanup inventoried exact identities/ownership before removing four test
users, two organizations, three Boards, 522 objects, three private assets, 25 votes
and 11 sessions, then verified row/asset absence and user 404 responses. Task-only
server/browser helpers are stopped. Temporary helpers, credential inventory,
traces and screenshots remain ignored under `.next/cache/redesign-004-3-3-qa`.
Manual NVDA, native OS EyeDropper sampling and other browser/device engines remain
separately recorded target-environment checks; no such session is fabricated.


## UI and input polish (REDESIGN-004.3.2)

2026-11-04 · PASS. Full web 211 files / 1,206 tests; lint, typecheck and production
build pass. Relevant coverage includes 46 Board files / 281 tests. Scoped
formatting, links, secret/artifact, scope and diff checks pass.

The Properties dock is now 320px. Typography uses a full-width searchable family
picker, paired Weight/Size and Line height/Letter spacing controls. Numeric
presets and custom values share the same fields: Enter/blur commits, Escape while
editing restores the confirmed value, and invalid input stays inline. Font size
and letter spacing are board pixels; line height is a unitless multiplier.
The [15-family font manifest](../apps/web/public/fonts/boards/README.md) records
categories, actual supported weights, true italics, licenses and exact hashes.
Only used faces load; searching/opening the picker never requests unused faces.
The UI font is unchanged.

Board-local selects use named popovers with arrow/Home/End navigation, Escape
focus restoration, outside-click dismissal and a keyboard path to the next
property. Narrow-screen popovers remain inside the existing modal focus scope.
Appearance is absent when empty. Text ink, Sticky fill and Shape fill/stroke use
one compact swatch, a preset palette and validated HEX, including alpha. Sticky
fill changes preserve customized ink. No recent-color/font storage is added.

Single-click on a Group child selects the Group. First double-click on a visible
child selects that exact child without entering text edit; a subsequent intended
double-click edits Text/Sticky. Native DOM hit testing resolves overlaps. Enter on
a selected Group enters its highest-layer child; accessible Layers navigation
remains available. Escape from a child selects its Group, then clears; sibling
Shift-click adds/removes children. A cross-context click exits to an ordinary
root/Group selection. Properties and Layers follow canonical selection, expanding
ancestors without refitting the viewport. Selection alone never saves. Child
movement/resizing retains ownership, and inherited locks still block mutations.

Layers can insert ordinary objects into a Group or extract them to a Section or
board root without changing world coordinates/IDs. A Group frame expands to
include an inserted object; that bounds change does not translate old children.
Group, Section, reorder and rejected drops have distinct cues. Existing bounded
atomic operations, lock rules and nesting constraints remain authoritative.
The local render index projects frame offsets and stored order to positive
integer CSS layers. Fractional `z-index` is invalid CSS; this projection keeps
frames behind owned children after negative-valued reorders as well. Stored
layer values are never rewritten merely for rendering.

Link forms accept bare domains and normalize them to HTTPS at the input boundary.
Stored/action schemas still require full HTTP(S) URLs without credentials; unsafe
schemes remain invalid. Titles are preserved and URLs do not trigger fetching.
Wheel/touchpad X/Y pans directly, Shift-wheel pans horizontally, Control/Meta-wheel
or pinch zooms, and Space-drag/H Pan remain. Panels keep their own scrolling.
View closes on outside/canvas click, Escape, focus leaving or another Board
popover; its stable checkable labels expose visual/input controls without routine
connection diagnostics.

Verification and measured limitations are recorded in PROJECT_STATE. Schema,
tenant authorization, plugin/memory boundaries and existing public URLs are
unchanged; this task adds no AI or REDESIGN-005 functionality.

Production-bundled authenticated Chrome comparison against starting commit
`9e678586dd34b87dcd1e8fcc0712fc8aad0ffd58` uses identical isolated 200/300/500
mixed-object fixtures (20/30/50 image objects), 1440×900, the same account/backend
and sequential runs. Each build completes 24 phases per fixture, including real
mutation/Realtime/comment transport. Only browser Long Task/frame/layout observers
are active; diagnostic React/CPU hooks are disabled in this comparison.

| Objects | First nodes before / final (ms) | Largest initial task before / final (ms) |
| --- | --- | --- |
| 200 | 1420 / 1472 | 101 / 79 |
| 300 | 1435 / 1455 | 119 / 142 |
| 500 | 1756 / 1658 | 232 / 202 |

Single phase samples vary: final 500-object Section focus has a 56ms task, and
marquee has four 59–68ms tasks; the single baseline instead records a 52ms pointer
task. Follow-up matched empty-pane marquee selects the same 92 objects with zero
writes in all five runs/build: nine tasks total before (max86ms), eight after
(max75ms). Seven repeated Layers collapse/expand operations per build record one
task each, 136ms before and 99ms after. Seven native Group-child drill-ins record
zero Long Tasks and retain mounted node DOM identity. This does not establish a
general speedup or p95; initial rendering and large selection remain measured
costs. No new repeatable interaction regression was identified.

Font network QA observes zero additional requests when opening/searching the
15-family picker, exactly the five selected representative family files across
all categories, and zero Board font requests on the Geist-only 500-object fixture.
The full two-theme 390/768/1024/1200/1440/1920 Properties matrix checks paired
field alignment, 320px desktop dock, reflow, popup bounds, modal containment and
keyboard focus/Tab. Authenticated native editing checks include overlapping and
negatively reordered children, Group locks, text drill/edit separation, resize,
reparenting, exact colors/links, wheel/Space/H input, reload and zero selection
writes. Hardware touchpad feel, additional browser engines and manual Windows
NVDA remain target-environment checks; synthetic wheel/pointer/touchpad-compatible
Chrome input is not a manual assistive-technology session.

All exact task fixtures are removed and absence verified: two accounts, one
organization, four boards, 1,014 elements, three comments and seven private assets.
No unrelated records, migrations, tables or database configuration were changed.

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

Desktop starts with 256px Layers left and 320px Properties right. They collapse
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

Text/Sticky content uses the 15-family curated library; application chrome remains
Geist. Licensed self-hosted Latin assets load only when used, with no runtime
CDN/preload. See the [font sources and limits](../apps/web/public/fonts/boards/README.md).
Controls cover family, its supported weights within 400–700, size 8–256,
alignment, line height, letter spacing, supported true italic,
underline/strikethrough, color, vertical
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
Flow and custom click handlers. REDESIGN-004.3.2 extends ordinary Group-normalized
clicks with explicit child drill-in and sibling selection as described above.

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

## Large Board performance (REDESIGN-004.3.1)

The historical 104/50 ms observations had no saved stacks. Repeating their
1,000-object probe before changes identified a 104.885 ms React commit and a
51.858 ms browser task containing 32.26 ms Paint and 5.108 ms Layout. CPU samples
showed broad React host/SVG updates, Lucide rendering and React Flow wrapper
updates after metadata/selection changes. Geometry, guide lookup and search
normalization were not dominant in those tasks. These are reproduced paths,
not a claim to reconstruct the original unsaved stacks.

Stable event callbacks now read the latest committed state without changing
every node's props. Save state blocks new gestures at the event boundary while
retaining node/control identity. Canvas and Layers share one canonical object
index; Locate uses exact current geometry and ownership. Layers memoizes row
controls and retains its structure projection until ownership/order changes.
Search normalizes changed searchable fields only, retains its hidden tree and
still caps displayed matches at 50. Desktop sidebar collapse retains that tree.
Browser offscreen rendering containment avoids unnecessary row layout/paint;
all logical rows remain in DOM and the accessible tree. No JavaScript row
virtualization or dependency was added. The root list uses a presentation role
so Chrome exposes Section roots as tree items.

A follow-up Section-focus trace found text nodes constructing validation errors
for every absent optional typography field. Missing values now use the same
validated defaults; supplied values retain validation. Per-text style derivation
is memoized. Guide/snapping algorithms, image authorization/signing, atomic
operations, undo/redo and realtime conflict handling are unchanged.

The before/after benchmark uses ordinary production builds with identifier
mangling disabled equally, sandboxed headless Chrome at 1440×900 and the same
authenticated hosted fixtures. Each 100-object block has a Section, a Group and
98 mixed Text/Sticky/Shape/Image/Link/Arrow objects within supported ownership.
Fixtures contain 200/300/500 objects and 20/30/50 private image objects. Each
fixture/phase has one before and one final after sample; these are observations,
not medians, p95, SLAs or a claim about every device. CPU/React profiling builds
were used separately for attribution because their logging adds overhead.
The paired search phase uses the same no-match query in both builds; separate
final-build checks exercise 356 matches with exactly 50 displayed results in
three trials, each without Long Tasks. Those are functional/current-build
observations, not an additional before/after speedup claim.

Maximum Long Task milliseconds below: `—` means none at or above 50 ms, not zero
execution time. Each cell is before → after.

| Phase | 200 objects | 300 objects | 500 objects |
| --- | --- | --- | --- |
| Initial document/render | 108 → 221 | 144 → 163 | 213 → 190 |
| 100 pointer moves | — → — | 82 → — | 109 → — |
| Layers hover / scroll | — / — → 59 / — | 65 / — → — / — | 96 / 87 → — / — |
| Search / clear | — / 72 → — / — | — / 83 → — / — | 95 / 175 → — / — |
| Locate / Section focus | — / 73 → — / 52 | 62 / 66 → — / — | 107 / 94 → — / — |
| Pan / zoom | — / — → — / — | 50 / — → — / — | 82 / 59 → — / — |
| Single / multi-object drag | 91 / 77 → — / — | 112 / 106 → — / — | 191 / 167 → — / — |
| Marquee | 112 → — | 72 → 73 | 180 → 92 |
| Properties commit | 79 → — | 150 → — | 230 → — |
| Sidebar collapse/reopen | 80 → — | 98 → — | 133 → — |

All 72 final phases complete without browser exceptions. At 500, reaction toggle,
comment open/resolution, panel switching and remote move/rename have no Long
Tasks; their baseline maxima were 83/53/54/64/71/72 ms. Properties drafts remain
local. Marquee Long Task counts fall from 12 to 4 at 300 and 16 to 3 at 500;
remaining work includes selection-dependent React Flow controls and browser
rendering. Drag-frame maximum observed gaps at 500 fall from 217 to 33 ms; these
are frame gaps, not a platform-independent dropped-frame count. First-node
observations are 1,570 → 2,517 ms, 1,994 → 1,538 ms and 1,753 → 1,493 ms. Initial
render remains expensive and variable; no general navigation speedup is claimed.
Layout-shift observations remain during initial private-preview loading and
Section selection/Properties changes. Stable chrome and drag identities are
checked separately; a zero-CLS claim is not made.

Real authenticated seven-case drag verification preserves node/grid/selection/
handle identity and one operation per release. A held action blocks a second
pointer mutation; marquee writes nothing; reload retains all 500 objects.
The final ordinary build passes 36 accessible-tree/keyboard/native Layers/
responsive checks, 26 drag checks including native Shift-click and six private
image/matching-search checks. All 50 private previews load; unrelated selection
retains the URL. Full web 205 files / 1,150 tests, focused Board 40 / 225,
lint/typecheck/build and scoped checks pass; the full serial rerun changes no
assertions/timeouts after an initial default-worker timeout. Exact isolated
hosted fixtures and checked helpers were cleaned up. Details are recorded
in PROJECT_STATE. Manual NVDA, Firefox/Safari and physical-device timing remain
unperformed. No schema or server authorization change is required.

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
