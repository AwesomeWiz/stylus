# Stylus — UI Patterns V2

Status: DEFINED; implement only in the approved follow-up task. The current
application is not assumed to implement these patterns.

[Product Experience](STYLUS_V2_PRODUCT_EXPERIENCE.md) owns route/feature direction
and phases; [Design System](DESIGN_SYSTEM.md) owns tokens, geometry and typography.
This document defines reusable interaction behavior without creating a second
feature specification.

## Persistent workspace and navigation

Authenticated ordinary pages share AppShell in a persistent workspace layout.
Public auth, organization setup and onboarding have their own focused shells.
Board editing uses BoardShell outside ordinary workspace chrome. Share verified
request context, never treat persistent UI as server authorization.

Global destinations are Home, Tasks, Boards, enabled Marketing and Settings.
Use Next Link for internal routes; retain browser Back/Forward, modifier-click
and direct deep links. Active navigation reflects nested destination ownership.
Keep every moved feature discoverable through its parent before removing its
old global link. No fake search control: remove the inert global field until a
real permission-filtered search has approved scope.

Use semantic navigation landmarks, active-page attributes and a skip link to
main. On mobile, navigation is an accessible drawer with close control, keyboard
focus containment and sensible focus placement after selecting a route. On
ordinary route completion, update title and focus the new main heading; do not
move focus for every filter or background refresh.

## Authentication identity

**Calm where people work. Expressive where the product speaks.** REDESIGN-004.1
uses a full-height CSS architectural tile field and one content card beside
login/signup. Desktop is approximately 55/45; tablet has a narrower static field;
below 768px only a small static geometric accent accompanies the form. Setup,
recovery and invitations retain their informative focused shells.

Tiles are decorative, `aria-hidden`, unfocusable and independent of account or
application state. Fine desktop pointer proximity influences a local neighborhood
with bounded depth/tilt/directional lighting. Refs and direct style updates avoid
React renders; easing stops when settled and after leaving. Media/visibility
changes cancel frames and reset styles; listeners are removed on unmount. CSS
also enforces static reduced-motion/coarse-pointer behavior. No idle loop, WebGL,
network input, logging, persistence or analytics is involved. Auth remains usable
without enhancement. The content card is ordinary readable text, not interactive
art. Full wordmarks switch using the pre-hydration theme class without recoloring.

Login/signup omit redundant explanatory subtitles. Useful field hints, error
recovery, validation, safe returns, confirmation and password-manager semantics
remain unchanged. Page descriptions should explain state or non-obvious behavior,
not repeat titles; retain empty-state, read-only and risk guidance.

## Page headers and local navigation

One compact page title, optional short description, one primary action and a
small group of secondary actions. Titles do not sit inside decorative cards.
Local navigation identifies workspace sections; view selectors identify states
of the same data. Use links for route changes, tabs with correct keyboard/ARIA
semantics for in-place panels and buttons for actions. Do not assign `tablist`
without complete tab behavior.

Marketing has five local destinations: Overview, Ideas, Studio, Research,
Campaigns. Research contains Competitors; Studio contains Ask Council and
Outputs; Overview/Campaigns expose Performance. Settings supplies member-readable
organization/knowledge/configuration navigation with role-gated management.
Exact retained URLs and visibility are in the product route matrix.

## Attention and compact lists

Home is a prioritized attention list, supported by recent meaningful activity and
role-aware existing create actions. Use real organization data, deduplicate
items and explain why each needs attention. Counts support lists; they do not
become a row of unrelated colored feature cards.

List rows put title first, then status and key ownership/time metadata. Search,
filter and sort share a compact toolbar. Keep URL state for views and selections;
Back restores the list. Distinguish no records from no filter matches. Tables
need real header/cell associations; a list/table hybrid needs a coherent list
semantics model rather than visual columns with misleading ARIA.

Tasks retains lifecycle, deadline timezone and Completed/Archive behavior. A
selected task opens a right detail panel with local loading and discussion
fetched only for that task. Direct links must work outside current list filters.
Activity/linked-work panels are shown only when supported by actual relations.

## Detail panels, inspectors and dialogs

Use a nonmodal right panel when a desktop list should remain usable. Provide a
title, explicit close control and keyboard path back to the invoking row.
Represent selection in the URL where useful. On narrow screens, use a full-screen
modal panel with a clearly labeled Back/Close action and focus containment.

Use dialogs for bounded creation, confirmation and focused form work. Preserve
unsaved values after validation/network errors; prevent duplicate submit and
announce pending/result state. Restore focus to the opener or a surviving nearby
control. Escape closes only the top active overlay; avoid nested modal layers.
Destructive actions retain their specific confirmation and authorization rules.

Properties describes the active object. Nothing selected may expose Board
details on request; selection does not open a permanently empty panel. Layers,
Properties and Comments use one panel slot on Boards, preserving context when
switching.

## Current Board interaction contract (REDESIGN-004.3)

Desktop uses simultaneous default-open Layers left and Properties right, with
independent local account preferences and visible restore controls. View and
Ctrl/Cmd+Shift+Backslash toggle both. Comments replaces Properties in its slot;
tablet/mobile open only one modal panel. Creation tools float at bottom-center
with roving focus and named flyouts; selected-object quick controls hide during
drag/resize/save. This supersedes the historical vertical-tool/single-slot
foundation description below.

Layers owns structure/navigation, Canvas spatial manipulation, Properties
attributes, bottom tools creation, context menus operations and keyboard speed.
Native Layers drag has explicit between-row/container/root drop feedback,
delayed expansion and edge scroll. World coordinates survive reparenting; invalid
ownership/locks are rejected atomically. F2/double-click renames the display
label inline without overwriting actual object text. Keyboard tree state,
selection, parent/child indicators and Locate remain synchronized.

REDESIGN-004.3.2 adds a 320px Properties dock and shared Board-local popovers.
Typography has a full-width searchable family picker, paired weight/size and
line-height/letter-spacing fields, preset/custom input and inline validation.
Escape while editing restores confirmed values. Palette/HEX popovers use one
swatch; empty Appearance sections are omitted. Modal popovers stay inside their
sheet's focus scope. Escape restores the opener, outside click/focus dismisses,
and Tab leaves a listbox for the next local control.

Single-click on Group content selects the Group; first double-click drills into
the native topmost child, then an intended subsequent text activation edits.
Properties/Layers follow that child, revealing ancestors without refitting.
Escape returns to parent then clears. Compatible sibling Shift selection is
supported; cross-context selection exits predictably. Enter and Layers supply
keyboard alternatives. Selecting never saves; locks still apply. Layers may
insert/extract ordinary Group children with unchanged identities/world geometry.
Wheel X/Y pans, Shift-wheel is horizontal, modified wheel/pinch zooms, Space/H
pan without object mutations. Link normalization belongs only at explicit input;
stored URLs retain strict HTTP(S)/no-credentials validation and never auto-fetch.

Text content uses bounded family/weight/spacing/alignment/decorations and
fixed/auto-height controls. Sticky Enter saves, Shift+Enter adds a line; Text
Ctrl/Cmd+Enter saves; Escape cancels. Alt/Option drag creates one undoable copy
intent. Guides and snapping are local; Ctrl/Cmd bypasses snapping while dragging.
Group means manipulation; Section means organization. Reactions mean social
feedback, use the specifically approved small emoji set with labels/counts and
directory identities, and are distinct from structured voting (deferred).

Object discussion badges show open-root counts without loading bodies. Resolve
and Reopen preserve history, with resolved threads disclosed explicitly.
Board-local search shows bounded results/Locate without becoming global search.
Section Locate fits its bounds; reduced motion removes travel. No Board content
is silently promoted to Knowledge. See [Boards](BOARDS.md) for scope and limits.

## Boards and canvas (historical foundation)

REDESIGN-004 and REDESIGN-004.2 implement the native foundation and
stabilization; [Boards](BOARDS.md) records actual limits, keyboard behavior and
verification. Native Stylus entity cards, conversions, AI, votes/reactions and
comment resolution remain future contracts. The landing page uses responsive
cards with real metadata and deferred, freshly authorized bounded content
previews. Empty/unavailable boards use neutral fallbacks; image glyphs avoid
signing private images for thumbnails.

The list uses normal AppShell and offers compact previews, actual metadata and
focused templates. The editor switches to BoardShell: main sidebar/search
absent, compact header, full canvas, left creation tools, optional right context
and bottom-right zoom/fit controls. Open-main-navigation is an overlay, not a
return to permanent global chrome. Save and channel connectivity remain
distinct. Layers and Properties have visible tabs; Comments replaces the same
optional slot. Desktop panels are nonmodal; narrower panels are modal and mobile
uses the full width. Layers retains collapsed descendants and allows
Shift-selection, rename, lock/unlock, contextual arrangement and Locate without
a second hierarchy model.

Tool icons have accessible names, focus-visible tooltips and selected states.
Shapes is a named menu with basic geometry. Creation tools return to Select
after one insert unless deliberately locked. Shortcuts operate only when canvas
focus is appropriate, respect text editing and have a disable/help path.

Selection is a set. Custom clicks own Shift toggling; React Flow selection
changes apply only during marquee. Shift-marquee preserves earlier selection.
Right-click, Shift+F10 and a visible action menu expose applicable commands with
keyboard focus and Escape return. Internal Copy/Cut/Paste is scoped to the open
board and never reads system clipboard text. Help uses grouped keycaps;
grid/minimap live in View.

Group = manipulation; Section = organization. Groups have no persistent frame;
Sections are visible named regions. Create Section from selection preserves
world coordinates and focuses its name after confirmation. Overlap never
silently reparents. Resize bounds without scaling children; moving carries owned
children atomically. Alignment uses rotated visual bounds; distribution spaces
outer edges. Properties shows applicable controls, explicit decimal parsing and
Enter/blur commit, Escape restore and inline validation. No native numeric-step
popups or manual Save object action. Arrange/alignment controls use named icons
and tooltips.

Persist at interaction completion, not pointer frequency. A failed operation
restores confirmed state/history, retaining unrelated and received remote work.
Safe retry reuses identities; conflict recovery freshly reads latest state
inside the board. No routine failure requires a page reload. Safe categories
distinguish authorization, locks, limits, conflict, validation and
infrastructure/schema faults. Undo remains local and conflict-aware; remote
changes never become local undo.

Images support nondestructive crop/fit and authored descriptions/source
metadata. Batch upload/paste gives per-file progress and recovery within private
Storage policy. A URL never grants implicit retrieval. Rich previews use
approved safe adapters only and fall back to ordinary links.

Native Stylus cards resolve canonical entities through public Core/plugin
contracts and reauthorize on insertion/open/read. Unavailable references reveal
no stale restricted fields. Conversion previews mapped fields and requires a
separate explicit submit; retries must not duplicate canonical work. AI acts on
an explicitly reviewed bounded selection, with new execution separately scoped.
Neither insertion nor conversion creates permanent Knowledge automatically.

Canvas has accessible Layers hierarchy and Properties alternatives to dragging,
plus named zoom/fit controls. Screen-reader announcements cover
selection/results/errors, not pointer motion. Full keyboard and template/native
entity contracts are in the product spec; the canvas is not exempt from NVDA QA.

## Collaboration and comments

Keep authenticated organization/board-qualified private channels, slow Presence,
throttled cursors, authorized directory identity and deterministic user colors.
One person with several tabs counts once. Presence is not edit history and is
never represented by fabricated online indicators.

Comments remain contextual in a right panel: board/object/section, shallow
replies, validated mentions and explicit resolution when introduced. Preserve
existing author/manager permissions. Comment focus can reveal its object without
destroying working selection. Missing or archived context is a recoverable state,
not a permission bypass. Voting/reactions are separate P1 work; winning never
automatically creates records.

## Studio, evidence and outputs

Studio offers Create, Ask Council and Outputs. Idea -> Evidence -> Create ->
Review -> Output is a user-navigation model, not a new AI workflow contract.
Show one active workspace and optional context. Names/icons/status distinguish
review specialists; disclose detailed safe output/history when requested.

Create, Strategic Review and Ask Council keep independent server workflows,
limits, context rules and persistence. A stage selection never runs a model.
Research browsing does not authorize additional evidence input to Create.
Ask Council is advisory and cannot implicitly start Research or production.

Present production briefs as readable structured artifacts with exact version,
source, evidence, uncertainty and decision context. Human Creative Briefs and
generated Reel Brief versions remain distinct. Research report, evidence,
opportunity, source and inference are visibly different concepts. External text
is escaped untrusted data, never instruction authority.

## Loading and feedback

Show immediate pending acknowledgement, retain shell/selection and load within
the relevant content boundary. Use destination-shaped skeletons and local
Suspense where appropriate after authorization. Never blank the whole app during
routine navigation or show stale private content under a new organization's name.

Load comment/history/secondary context on demand. Errors in a panel do not erase
the useful list. Cancelled or failed transitions clear pending indicators. Real
job/AI progress comes from persisted status; unknown progress stays unknown,
without invented percentages. Static skeletons replace motion when requested.

## Empty, unavailable and error states

Empty states explain purpose, value and one permitted next step. Keep them small
and contextual. First-use, no matches, read-only, archived and source-unavailable
states need different copy/actions. Do not offer VIEWER an enabled mutation.

Errors name a safe concrete cause when known, preserve working input and give a
targeted retry/recovery path. A queued offline-worker job is not a failed
navigation. Partial safe AI output remains visible after later-stage failure.
Do not expose credentials, raw provider errors, private paths, foreign entity
names or traces. Generic unavailable responses remain appropriate where details
would reveal unauthorized data.

## Responsive, keyboard and motion contract

Desktop uses full workspaces; tablet collapses navigation/context; mobile focuses
one pane with full-width detail/comments and deliberate canvas Select/Pan modes.
Keep every action available through named menus rather than tiny crowded icons.
Reflow at 320 CSS px; do not shrink essential text or force all desktop columns.
Respect touch targets, safe-area insets and on-screen keyboard height.

Preserve focus, semantic landmarks, skip links, NVDA operation, keyboard menus,
dialog/panel management and shortcuts that do not hijack inputs. Motion is short
and functional; reduced motion uses immediate changes. Verify both light/dark
contrast and text alternatives for visual content.

## Acceptance boundary

The product spec defines phase gates. Each UI change requires relevant behavior,
authorization/tenant/plugin and accessibility checks alongside lint, typecheck
and applicable build verification. A visual reorganization must not broaden
memory access, overwrite immutable history or add implicit side effects.

## Board color gestures and presentation (REDESIGN-004.3.3)

Visual color popovers float left of desktop Properties without changing its
width; clamped narrow overlays remain inside the Properties modal. Saturation/
brightness, hue, alpha, HEX and presets share one confirmed value. Raw pointer
movement previews only the selected object. Completed gestures/Enter/outside
commit one operation; Escape cancels the unfinished gesture to the latest
confirmed color. Shape None uses transparent HEX. Native EyeDropper requires an
explicit action and falls back to ordinary controls when unsupported/unavailable.
Pick from Board remains deferred. Nested popup Escape must not close the sheet.

Presentation uses existing Sections and the same canvas. Keep title/progress,
previous/next/exit and optional fullscreen. Arrows, Space/Shift+Space navigate;
Escape exits. Respect reduced motion, ordinary button activation and bounded
endpoints. Hide editing controls and guard all mutation input paths, while safe
links and canonical remote updates remain readable. Exit restores editor context.
Voting is a distinct visible decision session, with explicit bounded configuration,
own allowance, deterministic results and an explicit end confirmation. Reactions
remain social feedback. Never announce every remote cursor or vote to the page.
