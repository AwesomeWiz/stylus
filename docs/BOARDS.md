# Boards V2 foundation

REDESIGN-004 · 2026-11-02 · Required local verification complete; target-environment checks remain.

Boards is Core's visual workspace for turning research, inspiration and ideas
into decisions and executable work. The public URLs remain `/whiteboards` and
`/whiteboards/[boardId]`; SQL/module names stay unchanged. This phase creates
board-native objects only. It adds no AI execution, Marketing-private imports,
canonical entity cards, conversions, votes, reactions or memory promotion.

## List, creation and shell

The list stays in AppShell. Compact rows show title, recorded template (otherwise
“Board”), real directory-resolved owner/updater and viewer-local updated time.
Former members are labeled honestly. No synthetic thumbnails or live-presence
claims appear in the list. Existing rename/archive actions and VIEWER read paths
remain. Creation presents seven named, illustrated initialization definitions:
Blank Board, Brand Moodboard, Campaign Board, Reel Storyboard, Research Synthesis,
Competitor Inspiration and Brainstorm / Workshop. Template diagrams illustrate
starting structure, not existing tenant content. Initialization creates Sections
and explicitly owned notes in one transaction; Blank creates no objects.

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
Ordinary objects cannot own children. Overlap does not reparent. Choose Section
membership explicitly in Inspector. A container supports at most 199 descendants;
one operation touches at most 200 objects including implicit descendants.

`apply_board_operation` freshly authorizes an active board and OWNER/ADMIN/MEMBER,
locks that board, validates bounded explicit projections, and commits all rows or
none. Direct table writes retain RLS and repeat ownership/lock validation; their
trigger also takes the board lock. Moving a Section/Group translates descendants
atomically. Changing container dimensions changes bounds and leaves child
geometry alone. The client submits one operation at drag/resize completion,
never each pointer frame. Frame rendering stays behind owned children while
preserving the block's stored layer order relative to other objects.

Selection retains all selected identities. Group/ungroup preserves world
coordinates. Alignment uses selection bounds. Distribution requires at least
three unlocked objects and spaces outer edges evenly. Same width/height uses the
largest selected dimension, preserving locked image aspect and Circle geometry;
containers/arrows are excluded. Four layer commands, duplicate and lock/unlock
persist. Locked objects remain inspectable; locked descendants prevent a partial
container move. Archiving a Section explicitly offers keeping children at board
root or archiving the ownership tree. Duplicate remaps local identities and
ownership, retains image assets, and does not duplicate comments.

Local patch history stays bounded at 75 operations. Multi-object intents occupy
one entry and one transaction. Remote rows never enter local undo; a remote
change invalidates operations touching that identity. Active edits queue remote
updates, then database timestamps choose the committed winner. Unchanged duplicates, strictly older events and stale resurrection after archive
are ignored. PostgreSQL microseconds are retained; changed rows sharing a
transaction timestamp reconcile in delivery order. Failed saves retain
the draft and retry the same IDs. If a collaborator changes a failed intent,
retry/undo cannot replay it over that change: reload is required. Focus/reconnect
reads reauthorize and reconcile snapshots only if no local change raced with
the read. Layout state is never mutation authority.

## Images, links and deferred reads

The existing private `board-images` bucket and PNG/JPEG/WebP, 10 MB-per-file
policy remain. File picking, batch drop and paste accept up to ten queued files.
Each file shows queued/uploading/uploaded/error status with independent retry;
these are real action states, not fabricated byte percentages. Browser decoding
uses natural proportions where supported. Uploads carry a stable preallocated
identity so a lost response can be retried without creating a second object.
The Server Action body limit is 11 MB to transport one allowed 10 MB image.

Replace updates the same object and retains position, size, caption, source and
comments. It records previous paths and never deletes a committed original.
Undo and duplicate may still reference those assets. Only an uncommitted new
upload is cleaned up on persistence failure; permanent garbage collection is
deferred. Crop is CSS presentation over the retained original, with zoom 1–4 and
focus coordinates 0–100. Contain/cover, aspect lock, descriptions and captions
are available in Inspector. Source URLs are metadata, never fetch permission.

Initial server data contains the active board, complete ID-keyset object pages
of 1,000 and the authorized directory, with **zero comment bodies and zero image
signing requests**. The canvas renders before authenticated image-preview reads.
Those reads freshly validate expected organization/active board and sign at most
25 current-board paths per batch using the supported Storage batch API. URLs
expire after one hour, stay in component state, and are never persisted/shared
across accounts. Missing/expired previews have local retry; stale results cannot
replace a different current asset path. Signing failure does not delete an asset.

Comments load on opening their panel: newest 200, deterministic timestamp/UUID
cursor for earlier records and bounded missing-parent recovery. Existing shallow
replies, structural mentions, archive permissions, notifications and activity
remain. A missing selection is explained instead of silently posting a selected
thread to board scope. Inspector, outline and Comments occupy one panel slot;
desktop is nonmodal, tablet is an overlay and mobile is a full-width modal sheet.
Selection and loaded discussion survive panel switching. Comment resolution is
not introduced in this phase.

## Controls and accessibility

Desktop/tablet creation tools are vertical: Select, Pan, Text, Sticky, Image,
Link, Shapes, Arrow, Section and More/history. Mobile uses Select/Pan/Add/More;
Add exposes named tools and all six Shapes choices. Creation is one-shot.
Toolbars have accessible names, visible focus tooltips and roving arrow/Home/End
focus. Bottom-right controls expose numeric zoom, zoom in/out, fit board and fit
selection. The optional minimap is off by default and hidden on small screens.
Device-local viewport storage contains only x/y/zoom and is scoped by account,
organization and board. Zoom never changes saved dimensions.

With canvas focus: V/H/T/N/F choose tools; Enter inserts at center or inspects a
selection; Space temporarily pans; Escape exits tool mode/closes context. Arrows
move by 1 unit, Shift+arrows by 10. Ctrl/Cmd+D duplicates, Ctrl/Cmd+G groups,
Ctrl/Cmd+Shift+G ungroups, Ctrl/Cmd+Z undoes, Shift+Z/Ctrl+Y redoes. Delete only
archives when the canvas itself has focus. Ctrl/Cmd+A selects root objects.
Shortcuts ignore fields/links/buttons; single-key tools can be disabled. Tab is
not trapped in the canvas. Help documents these behaviors and save limitations.

The outline provides ordered nested type/name/text/position/dimensions and
lock/collapse state. Collapsed children remain reachable. Shift-select builds a
selection, Locate reveals context without changing saved collapse state, and
Inspector supplies text/geometry/ownership/manipulation alternatives to dragging.
Selection counts/saving/errors announce politely; cursors do not. Narrow panels
trap focus and close back to the canvas; desktop panels permit a path back.
Reduced motion removes animated travel. Manual Windows NVDA remains a separately
recorded target-environment check.

## Realtime and verification limits

Existing authenticated private `board:<organizationId>:<boardId>` subscriptions,
directory-resolved names/roles, unique-user/multi-tab normalization, stable
active-set collaborator colors, slow Presence and throttled cursor Broadcast
remain. Cleanup unsubscribes on board/account/organization changes. Connection
state is separate from database saving; reconnect reconciles missed rows.

Local browser QA uses sandboxed headless Chrome and production-bundled **actual
components**, with only Next transport/server actions/Supabase Realtime replaced
by explicit synthetic fixtures. It covers blank/populated/template/1,000-object/
20-image boards; list/empty/VIEWER; mouse, keyboard and touch-style input; both
themes; 320/390/430/768/1024/1200/1440/1920 px; modal focus, outline, manipulation,
comments, upload failure/retry/paste/drop/replacement, reconnect and viewport
restore. This proves local component behavior, not live authenticated network
transport, deployed Storage, hosted latency or a manual NVDA session.

The permanent board pgTAP suites run against actual repository SQL in isolated
PGlite PostgreSQL with pgTAP and a minimal Supabase auth/storage/realtime bootstrap:
34 existing assertions plus 59 V2 assertions pass. Docker/Podman/local Supabase
are unavailable; hosted data is untouched. The runner is local and ignored under
`.next/cache/redesign-004-qa`; standard CI/deployed Supabase migration and transport
smoke checks remain necessary. Existing SQL fixtures now use policy-compatible
UUIDs, correct plan count and separate actor-denial/recipient-success notification
assertions; no authorization assertion was weakened.

Three local samples per fixture observed first canvas paint after fixture mount
at 22–24 ms blank, 32–51 ms template, 44–48 ms for 20 images and 221–240 ms for
1,000 objects. These small client-only samples omit authorization/network/hosted
timing and are not before/after speedup claims or SLAs. A short 100-pointer-move
probe on 1,000 objects persisted zero operations and observed no Long Task
entries. Memoized object renderers and indexed ownership remain independent of
cursor/viewport state. Web lint/typecheck/production build and the full web suite (186 files / 1,063
tests) pass. Focused board/architecture coverage is 24 files / 149 tests. Scoped
formatting and final diff/artifact checks are recorded in PROJECT_STATE.

## Recommended REDESIGN-005 boundary — not started

Prioritize public Core entity-reference, resolver, opener and creation contracts
for Task, Research Evidence, Reel Idea, Competitor, Campaign and Creative Brief;
Marketing registers through that public host. Resolve every reference with fresh
tenant/plugin/entity authority, exact immutable versions where applicable and a
generic unavailable state without stale excerpts. Deliver native insertion and
explicit conversion previews with idempotency and recovery before optional P1
breadth. Reuse existing creation APIs; failed board linking must reattach an
already-created record. Then scope comment resolution and bounded visible voting/
reactions explicitly. Establish authorized selection/context-preview contracts;
new AI execution, follow/history, anonymous voting and exact-version storyboard
execution need their own explicit bounded acceptance. No board action promotes
Company Knowledge or grants another memory domain.

## Implementation map

- `app/(workspace)/whiteboards` owns list/loading/error presentation in AppShell;
  `app/whiteboards/[boardId]` and its parent loading/error boundaries own immersive
  direct entry. Existing URLs remain canonical.
- `components/whiteboards` separates BoardShell/navigation/chrome, canvas/tools/
  nodes, outline/Inspector/comments and document/collaboration/image/upload hooks.
  `components/ui/dialog.tsx` only adds an optional scoped class variant so board
  sheets meet narrow-screen target sizes without restyling other dialogs.
- `modules/whiteboards` owns bounded schemas, atomic actions, templates, pure
  operations/history, precise timestamp comparison and authorized deferred reads.
  `lib/supabase/database.types.ts` reflects the new columns/RPCs; `next.config.ts`
  permits transport of one existing-policy image.
- Two `202611020001*` migrations and the two board pgTAP suites own persistence
  verification. Focused component/server/operation tests and the existing workspace
  route contract cover the revised boundary; unrelated tests remain enabled.
- PROJECT_STATE, CODEX_TASKS, CHANGELOG and the Roadmap/Architecture/Database/
  Decisions/UI Patterns documents record delivery and its limits. Temporary QA
  harnesses, reports and screenshots remain ignored rather than shipped.
