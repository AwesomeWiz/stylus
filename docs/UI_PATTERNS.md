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

Quiet work surfaces allow expressive moments of identity at authentication,
onboarding and selected first-run/brand moments. REDESIGN-003.1 implements only
login/signup. Share one abstract SVG system with a calm, unchanged form. Full
desktop composition is approximately 55/45; tablet uses a smaller static field;
below 768px the form leads with only a small static brand accent. Setup, recovery
and invitation shells remain focused without the identity field.

Artwork is decorative, `aria-hidden`, unfocusable and independent of account or
application state. Pointer position is ephemeral local presentation data: never
log, persist, transmit or use it as analytics. Fine desktop pointers can move
layers slightly and reveal secondary lines through a soft mask, without moving
the form. No idle animation loop is required. Reduced motion, coarse pointers,
hidden tabs and unsupported media-query APIs keep the static composition; cancel
frames and remove listeners on unmount. Login/signup validation, return-path
security, confirmation and password-manager hints remain the existing contract.

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

Inspectors describe the active object. Nothing selected may expose Board details
on request; selection does not open a permanently empty inspector. Comments and
inspector use one panel slot on Boards, with context preserved when switching.

## Boards and canvas

The list uses normal AppShell and offers compact previews, actual metadata and
focused templates. The editor switches to BoardShell: main sidebar/search absent,
compact header, full canvas, left creation tools, optional right context and
bottom-right zoom/fit controls. Open-main-navigation is an overlay, not a return
to permanent global chrome. Save and channel connectivity remain distinct.

Tool icons have accessible names, focus-visible tooltips and selected states.
Shapes is a named menu with basic geometry. Creation tools return to Select
after one insert unless deliberately locked. Shortcuts operate only when canvas
focus is appropriate, respect text editing and have a disable/help path.

Selection is a set. Groups/sections, alignment, distribution, layers, locks and
duplication act on that set through bounded authorized operations. Resize a
section without scaling its content; move it with its children; keep outline
membership explicit. Do not treat an overlapping rectangle as a secure parent.
Persist at interaction completion, not pointer frequency. Undo remains local
and conflict-aware; remote changes never become another user's undo operation.

Images support nondestructive crop/fit and authored descriptions/source metadata.
Batch upload/paste gives per-file progress and recovery within private Storage
policy. A URL never grants implicit retrieval. Rich previews use approved safe
adapters only and fall back to ordinary links.

Native Stylus cards resolve canonical entities through public Core/plugin
contracts and reauthorize on insertion/open/read. Unavailable references reveal
no stale restricted fields. Conversion previews mapped fields and requires a
separate explicit submit; retries must not duplicate canonical work. AI acts on
an explicitly reviewed bounded selection, with new execution separately scoped.
Neither insertion nor conversion creates permanent Knowledge automatically.

Canvas has an accessible object/section outline and inspector alternatives to
dragging, plus named zoom/fit controls. Screen-reader announcements cover
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
