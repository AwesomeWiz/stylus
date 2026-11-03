# Stylus V2 Product Experience

REDESIGN-001 · 2026-11-01 · Documentation specification complete; implementation pending.

Audit baseline: freshly fetched `origin/main`, commit
`5b7e76a0fe6a4e80f17e14c04b119a84b43668a9`. Work branch:
`codex/redesign-001-v2-foundation`. The original checkout has unrelated local
changes; those changes are excluded from this audit and this documentation commit.
The five supplied reference files were read from the original checkout's
untracked `docs/design-references/` directory and remain untouched there.

This is the canonical product direction for V2. [Design System](DESIGN_SYSTEM.md)
owns reusable visual rules; [UI Patterns](UI_PATTERNS.md) owns shared interaction
contracts. Existing [Architecture](ARCHITECTURE.md), [Security](SECURITY.md),
[Marketing](MARKETING.md), and [decisions](DECISIONS.md) continue to describe the
implemented system. V2 proposals below do not assert shipped behavior or authorize
the next implementation task.

## 1. Executive direction

**Calm where people work. Expressive where the product speaks.** Stylus is a calm, professional operating
system where startup teams turn planning, knowledge, collaboration and marketing
intelligence into executable work. Expression belongs in the team's content,
images and decisions. Application chrome stays neutral and predictable.

REDESIGN-004.1 supersedes the original cyan/system-font proposal with cobalt
`#4F5BD5`, self-hosted Geist and the approved blue–coral logo. Keep Light/Dark/System, Lucide,
the existing component foundation and modular monolith. Improve the product's
hierarchy and workflow rather than applying a new coat of color. Core work must
remain useful when AI is disabled or an optional worker is offline.

Recommend five global destinations: **Home, Tasks, Boards, Marketing, Settings**.
Marketing appears only while enabled. Settings is a utility at the sidebar foot.
The other four are everyday work destinations. This preserves a clear path to
knowledge and administration without showing infrastructure alongside daily work.

## 2. Current UX problems: evidence and limits

Source findings are verified against the baseline above. Visual judgments are
source-based design assessments; no browser screenshots, NVDA session, user study
or live production timing was performed.

| Concern | Finding | Evidence and implication |
| --- | --- | --- |
| Too many global destinations | CONFIRMED | `components/layout/navigation.ts` has 12 Core/Platform/System links. The Marketing manifest contributes eight more; Example adds one when enabled. That is 20 with Marketing, 21 with both plugins. |
| Duplicated Marketing navigation | CONFIRMED | `components/marketing/marketing-page.tsx` repeats eight manifest destinations and adds Performance, giving nine local links. Global and local navigation compete. |
| Pastel feature identity | CONFIRMED | Marketing Overview assigns coral/mint/lilac/cream by statistic index. Home quick actions have unrelated tones; Settings and Studio use large pastel sections. Colors do not consistently encode state. |
| Home is only a feature launcher | PARTIALLY CONFIRMED | `components/home/home-dashboard.tsx` already uses real overdue/due-soon/assigned tasks and activity. The useful attention model exists; metric strips, colored shortcuts and reading surfaces dilute it. No fake data was found here. |
| Tasks is a technical table | PARTIALLY CONFIRMED | `components/tasks/task-workspace.tsx` already has compact list rows, accessible completion and views. Fixed metadata widths and a large filter form need refinement. Detail is an edit Dialog, not a right panel. |
| Boards lacks product-specific value | CONFIRMED for missing integrations | `board-list.tsx` uses repeated generic icon previews and generic owner labels. The editor supports drawing and collaboration, but no template, sections or native entity workflow was found. Whether users find it useful is NOT VERIFIED. |
| Board creation tools are unclear | PARTIALLY CONFIRMED | `whiteboard-toolbar.tsx` already uses Lucide Shapes and accessible names/native titles. The horizontal toolbar and singular “Shape” control hide the rectangle/ellipse choice in selection actions. Comprehension needs user testing. |
| Main shell consumes canvas space | CONFIRMED | `app/whiteboards/[boardId]/page.tsx` keeps AppShell, its 256px desktop sidebar and 64px global topbar. `whiteboard-workspace.tsx` adds its own header. |
| Creative work reads like AI machinery | CONFIRMED | Studio stacks creation, five-stage review and history; specialist details default open when results exist. `strategic-review-panel.tsx` uses five columns and specialist accents. This makes stages and records compete with the production artifact. |
| Auth is generic centered form | CONFIRMED | `components/auth/auth-shell.tsx` centers a rounded bordered card on a full lilac surface. It contains no product narrative or two-column composition. |
| Internal architecture is prominent | CONFIRMED | AI, Jobs, Workers and Apps are global destinations. Example Plugin contributes a normal link despite being a development fixture. |
| Search appears functional | CONFIRMED usability gap | Topbar renders `SearchInput` without search behavior. A search-looking field promises more than it supplies. |
| Slow navigation mechanisms | CONFIRMED in source; magnitude NOT VERIFIED | Plain sidebar anchors, page-owned shells, broad onboarding loading and eager comments are detailed in section 33. |

Paths in the table are relative to `apps/web/src/`. Relevant inspected tests
include shell/navigation, TaskWorkspace, board toolbar/workspace, board Realtime,
memory authorization and Marketing architecture boundaries. Existing tests prove
parts of current behavior, not V2 acceptance.

## 3. Reference interpretation

All five supplied files were read in full. They are analysis inputs, never
instructions to copy their tokens, fonts, assets, wording or layouts.

| Local reference | Observation in supplied file | V2 interpretation | Explicit exclusions |
| --- | --- | --- | --- |
| `linear-enriched.md` | Dark surface ladder, tight app rows, restrained accent; much of the extraction describes marketing | Compact navigation, clear operational hierarchy and fast feedback | Electric lime, exact darkness, variable weight 510, giant marketing type |
| `notion-enriched.md` | Neutral surfaces, flat borders, uniform typography and example database/sidebar primitives | Flexible workspace objects, spacing hierarchy, compact task rows, progressive detail | Proprietary NotionInter, 96px headlines, branded avatars and pill grammar |
| `sarvam-india-s-full-stack-sovereign-ai-platform.md` | A short marketing token extraction, including implausible radius `3.35544e+07px`; no authenticated login composition is evidenced | Use the request's Sarvam-inspired two-column storytelling/form principle as a design proposal | Season Mix/Matter assets, copy, illustrations, extraction artifacts; no claim that this file proves the login layout |
| `miro-enriched.md` | Mostly marketing: dotted canvas metaphor, yellow/blue branding, 40px cards and gradient wash | The requested canvas-first shell, separate creation/collaboration/navigation controls and startup templates | Gradient wash, yellow branding, proprietary Roobert, 40px cards, breadth of generic workshops |
| `figma-enriched.md` | Mostly marketing: neutral ground lets user work supply richness; examples contain inconsistent pill guidance | The requested FigJam-style clarity of selection, contextual tools, sections and compact collaboration | figmaSans, multicolor mark, exact editor geometry or an unsupported claim that editor behavior was observed |

Editor behaviors drawn from the brief are proposed product choices, not findings
about reference applications. No live reference sites or proprietary assets were
needed. Conflicting extracted brand rules are intentionally discarded.

## 4. V2 product principles

1. Put attention and the next useful action ahead of aggregate counts.
2. Organize by team intent: work, ideas, evidence and outputs.
3. One global shell, local navigation only where a workspace needs it.
4. Open detail without destroying context; disclose history and diagnostics on demand.
5. Preserve canonical objects; a linked card is not another database copy.
6. Show evidence, assumptions and uncertainty distinctly; never imply unsupported capabilities.
7. A selection or explicit submission authorizes bounded work. Opening a screen does not.
8. Server authorization, tenant isolation and memory boundaries survive every visual change.
9. Make keyboard, NVDA, touch and reduced-motion behavior part of acceptance.
10. Respond immediately, then stream or load authorized content within stable chrome.

## 5. Design System V2 direction

Use the existing semantic CSS tokens, UI primitives and Radix-backed dialogs.
Add focused variants only when an implementation needs them; no new component
library or independent page-specific design system. REDESIGN-004.1 supplies
licensed self-hosted Geist without a runtime font dependency.

The numeric visual contract lives in [Design System](DESIGN_SYSTEM.md). This
specification defines its product application. V2 supersedes the earlier
expectation that pastel section blocks establish normal page rhythm; ADR-039's
collaborator identity allocation remains intact (see ADR-040).

## 6. Color

Directionally, normal application chrome is about 90% neutral, 7% Stylus accent
and 3% semantic color. These are review heuristics, not CSS quotas. Cobalt signals
primary action, selection or navigation. Red/amber/green communicate status with
text or icons. Human collaborator colors and user-authored board colors are
separate intentional systems.

Use the tested light/dark cobalt action pairs in Design System; artwork colors are not automatically suitable for small button text. Replace feature-index pastel
fills with neutral surfaces during the relevant implementation phase. Rare
editorial callouts must have a stated purpose and accessible theme pairs. Never
color-code specialists as their main identity.

## 7. Typography

Use self-hosted Geist with system sans fallbacks (REDESIGN-004.1). Page titles are compact; weight, alignment
and whitespace establish hierarchy. Dense rows and metadata remain readable.
AI output uses the same body scale and bounded reading width as human prose.
Review findings become titled sections, citations and decisions rather than JSON
or long unbroken text. Canvas labels are legible at normal zoom with an equivalent
text inspector independent of graphical scaling.

## 8. Spacing

Use the 8px-derived scale and shared layout values in Design System: 24px desktop
page margins, 16px mobile margins, 32px major section separation, compact list
rows and 24px drawer/dialog padding. Allow 4px/12px subdivisions for icon/label
relationships. A canvas has no normal page margins; its controls use shared edge
offsets and safe-area insets.

## 9. Surfaces

Three neutral levels suffice: application background, content surface and
temporary overlay. Lists and text sections often sit directly on the page with
a divider. Use a card only to group a selectable object, isolated interaction or
distinct entity. Studio reading content and Home sections do not each require
an outer card.

## 10. Radius and shadow

Use shared small control, panel and dialog radii. Shadows identify overlays only;
normal sections stay flat. No glass, glow, dashboard gradients or floating-card
grid as the application identity. Board images keep content-appropriate crops;
their toolbar chrome follows the application rules.

## 11. Application shell

Proposed route composition preserves URLs:

```text
RootLayout (theme and document only)
  Public/setup route groups -> AuthShell / OnboardingShell
  Authenticated boundary -> identity + current membership + narrow setup gate
    Workspace route group -> WorkspaceLayout -> persistent AppShell
      Home / Tasks / Boards list / Marketing / Settings
    Canvas route group -> BoardShell -> /whiteboards/[boardId]
```

Route groups are a future file organization proposal, not additional URL
segments. Validate Next layout persistence during implementation; do not put
the editor inside AppShell and merely hide its sidebar with page CSS. Both
shells share server-authorized identity resolution, but BoardShell never loads
global notification or search UI merely to hide it.

Desktop sidebar: 224px expanded, optional 56px collapsed, neutral surface.
Topbar: 48px, opaque, compact breadcrumb/workspace context, notifications and
account access. Organization/account labels stay unambiguous. Collapse is a
device preference, not tenant data or authorization.

Use Next Link for internal navigation, preserve modifier-click/open-in-new-tab
behavior and native anchors for external/download links. Active area derives
from the current path, including nested Marketing and Settings destinations.
Keep scroll position for list/detail interactions; Back restores filters,
selection and the previous list position.

Global search remains an evaluated capability: REDESIGN-002 removes the inert
input from normal chrome. A real permission-filtered search or command surface
needs separately approved scope. Existing per-area search stays available;
no fake search field or unimplemented keyboard command is shipped.

Content widths: operational lists use available width; ordinary overview/settings
content caps at 1200px; prose caps at 72ch; Studio uses workspace columns; canvas
uses all available width. Nested navigation belongs to its workspace, never as
a second list of the same destinations globally.

## 12. Information architecture

The five-destination hypothesis is recommended. Tasks and Boards serve Core
collaboration independently of Marketing. Marketing contains its own business
workflow. Settings houses organization context and configuration. Knowledge
remains reachable through Settings -> Knowledge and a contextual company-context
link from Studio; it is not buried behind an administrator permission.

Marketing local navigation: **Overview, Ideas, Studio, Research, Campaigns**.
Research contains Reports, Evidence, Manual notes and Competitors. Studio contains
Create, Ask Council and Outputs. Performance is a named secondary link under
Overview and Campaigns; the standalone route remains. This retains an important
implemented capability absent from the original five-tab hypothesis.

Activity is primarily Home's recent activity with “View all activity.” No
implemented function is deleted. Visibility changes never expand or restrict
server permissions implicitly.

## 13. Complete route/navigation matrix

This inventories all 30 `page.tsx` routes in the baseline, plus the three
non-page entrypoints below. Query state is preserved on all retained routes.
“Move” means change discoverability and parent navigation while keeping the
current URL initially. Target labels are not claims that new routes exist.

| Current route | Current label | V2 location | Visibility | Action | Rationale |
| --- | --- | --- | --- | --- | --- |
| `/` | Home | Home | KEEP PRIMARY | Keep; refine attention hierarchy | Daily starting point |
| `/tasks` | Tasks | Tasks | KEEP PRIMARY | Keep views, filters and `task`/`create` links | Core execution |
| `/activity` | Activity | Home -> View all activity | KEEP SECONDARY | Move global entry to Home | History supports attention |
| `/whiteboards` | Whiteboards | Boards | KEEP PRIMARY | Rename label only initially | Broader visual startup work |
| `/whiteboards/[boardId]` | Board title | Boards -> BoardShell | KEEP SECONDARY | Retain URL; immersive shell | Canvas needs space |
| `/company/profile` | Company Profile | Settings -> Organization -> Company | MOVE UNDER ANOTHER AREA | Retain profile and edit links | Canonical organization context |
| `/memory` | Memory | Settings -> Knowledge -> Company knowledge / Memory | MOVE UNDER ANOTHER AREA | Retain both distinct concepts | Knowledge is deliberate context |
| `/ai` | AI | Settings -> AI -> Policy / Run history | MOVE UNDER ANOTHER AREA | Member-readable; management role-gated | Configuration and diagnostics |
| `/jobs` | Jobs | Settings -> Advanced -> Jobs | HIDE FROM NORMAL NAVIGATION | Retain member-readable route and contextual workflow links | Infrastructure is secondary; existing access remains |
| `/workers` | Workers | Settings -> Workers | ADVANCED / ADMIN ONLY for management | Retain permitted member read access and queued-work help links | Optional compute setup |
| `/apps` | Apps | Settings -> Integrations -> Apps | MOVE UNDER ANOTHER AREA | Retain read access; OWNER/ADMIN enablement | Trusted module configuration |
| `/team` | Team | Settings -> Team | MOVE UNDER ANOTHER AREA | Retain directory, invitations and accepted-link state | Membership administration |
| `/settings` | Settings | Settings index -> Account | KEEP PRIMARY (utility) | Add local settings navigation | One configuration home |
| `/apps/marketing` | Overview / Marketing Overview | Marketing -> Overview | KEEP PRIMARY as Marketing entry | One global Marketing item; local Overview | Remove duplicated plugin navigation |
| `/apps/marketing/reel-ideas` | Reel Ideas | Marketing -> Ideas | KEEP SECONDARY | Keep intake, archive and explicit Studio handoff | Ideas exist before AI |
| `/apps/marketing/creative-studio` | Creative Studio | Marketing -> Studio -> Create / Outputs | KEEP SECONDARY | Workflow-first composition | Creation and artifact review |
| `/apps/marketing/council` | Ask Council | Marketing -> Studio -> Ask Council | MOVE UNDER ANOTHER AREA | Keep URL, `conversation` and independent advisory flow | One Studio entry, distinct workflow |
| `/apps/marketing/research` | Research | Marketing -> Research -> Reports / Evidence / Notes | KEEP SECONDARY | Clarify report/evidence/opportunity hierarchy | Grounded decisions |
| `/apps/marketing/competitors` | Competitors | Marketing -> Research -> Competitors | MOVE UNDER ANOTHER AREA | Retain archive state and profile links | Research context |
| `/apps/marketing/competitors/[competitorId]` | Competitor name | Research -> Competitors -> Detail / Reel analyses | KEEP SECONDARY | Keep exact competitor/Reel/analysis identity | Media provenance and versions |
| `/apps/marketing/campaigns` | Campaigns | Marketing -> Campaigns | KEEP SECONDARY | Connect existing records; phase new relations explicitly | Objectives to execution |
| `/apps/marketing/creative-briefs` | Creative Briefs | Studio -> Outputs -> Human Creative Briefs | MOVE UNDER ANOTHER AREA | Retain manual CRUD separately from Reel Brief versions | Similar name does not mean identical entity |
| `/apps/marketing/performance` | Performance (local navigation only) | Overview -> Performance; Campaigns -> Performance | KEEP SECONDARY | Keep route, snapshots and learnings | Preserve implemented learning workflow |
| `/apps/example` | Example Plugin | Settings -> Integrations -> Development -> Example | REMOVE FROM PRODUCT SURFACE (normal work nav) | Keep registered/enabled diagnostic route and existing permissions | A test fixture is not a business destination |
| `/login` | Sign in to Stylus | Public AuthShell | KEEP SECONDARY (public) | Two-column composition; retain validated `next` | Focused access |
| `/signup` | Create your account | Public AuthShell | KEEP SECONDARY (public) | Same composition and confirmation behavior | Coherent entry |
| `/organization/new` | Set up your organization | Authenticated setup | KEEP SECONDARY (setup) | Keep atomic organization/owner setup | Not a workspace destination |
| `/onboarding/[step]` | Step title / review | Setup; Company edit handoff | KEEP SECONDARY (setup/edit) | Preserve step slugs, `edit=1`, resume and role waiting state | No onboarding regression |
| `/invite/[token]` | Join organization / Invitation unavailable | Invitation AuthShell | KEEP SECONDARY (token entry) | Preserve login/signup return and exact acceptance | Secure team entry |
| `/auth/error` | We could not confirm your account | Authentication recovery | KEEP SECONDARY (error entry) | Keep actionable safe recovery | No account enumeration |

| Non-page entrypoint | V2 treatment | Security boundary |
| --- | --- | --- |
| `/auth/confirm` | KEEP SECONDARY callback; no nav entry | Preserve token verification and validated return path |
| `/api/worker/[operation]` | HIDE FROM NORMAL NAVIGATION; unchanged broker | Scoped outbound worker credentials and active lease |
| `/api/cron/serverless-jobs` | HIDE FROM NORMAL NAVIGATION; unchanged scheduler endpoint | Existing scheduler authentication and atomic claim |

No route is slated for deletion in REDESIGN-001. DEPRECATE / REDIRECT is reserved
for a later explicitly tested URL change, not required by the naming decision.
Notifications, task views, board comments, Studio run history and company edit
steps are reachable states within these routes, not missing standalone pages.

## 14. Authentication

REDESIGN-004.1 finalizes the identity: **Calm where people work. Expressive
where the product speaks.** A desktop two-column AuthShell pairs a full-bleed
architectural CSS tile field and one concise content card with a focused
360–400px form, approximately 55/45. Warm neutral/cobalt planes have controlled
apricot/mint/butter/sky accents and separately authored dark values. This
supersedes the REDESIGN-003.1 contour/reveal artwork. No live tenant data, fake
metrics, proprietary reference assets or external artwork is used. Self-hosted
Geist and the approved full wordmark establish identity. Bounded local depth,
tilt and directional shadows settle without an idle loop; reduced motion keeps
a complete static composition. No WebGL or graphics dependency is required.

Right: approved theme-specific full wordmark, concise title, existing signup name field where required,
email, password, explicit labels, existing validation, pending action, primary
submit and sign-in/sign-up switch. No giant floating card. Preserve password
manager/autocomplete support, confirmation state, generic authentication errors
and safe `next` handling. Do not introduce SSO/password-reset claims or new auth
behavior in this visual task.

Below 768px, form first with only a small static brand accent; do not run the full
desktop visual. Tablet uses a reduced static field. Setup, invitation and auth
recovery reuse focused variants without the identity field.
Organization setup copy should reflect existing invitations rather than claim
they are a future phase (a source-confirmed stale sentence).

## 15. Home

Answer “What needs my attention now?” using existing organization-scoped data.
Lead with a compact overdue/due-soon/assigned list, then relevant Marketing work
and meaningful recent activity. Do not add a new persisted “today's priorities”
feature; derive the initial order from existing tasks and show the ordering.

Deduplicate tasks across attention groups. Show the reason for attention, owner
and due time. A task opens its canonical detail with a useful Back path. Use
viewer-local timezone consistently; the current Home date helper explicitly
formats UTC, unlike Tasks, so harmonization belongs in REDESIGN-003.

Keep notifications in the topbar with a clear unread state; avoid duplicating a
second notification inbox. Quick create is one compact role-aware action menu
for existing task/board/Marketing flows. VIEWER receives read paths. Real counts
may support a heading, but four colored metric cards must not lead the page.
When Marketing is disabled, omit its attention area without an empty upsell.

## 16. Tasks

Retain My tasks, All tasks, Upcoming and Completed as visible views; keep Overdue,
Archive and the existing Calendar discoverable through More views. Today can be
a due-date filter, not a new lifecycle. Saved views are deferred until repeated
user demand establishes a need. Preserve the 14-day Completed/Archive rule.

Use a compact list/table hybrid: completion/status, flexible title, assignee,
due date, restrained priority. Search, filter and sort share one toolbar; advanced
filters disclose on demand. On mobile, title/status stays primary; assignee and
due date wrap to a second line. Expose metadata in detail rather than shrinking
the font or adding horizontal columns.

Open a 480px right detail panel at desktop; use a full-screen dialog on mobile.
The URL retains `task`, view and filters. Direct links fetch an authorized task
even if it falls outside the current filtered list. The panel contains title,
description, status, owner, deadline, priority and discussion; activity/linked
work appear only where supported by existing data or an explicitly scoped later
integration. No fake activity timeline or second task model.

List data excludes comment bodies and full discussion. Fetch selected-task
detail/comments only after opening, with local skeleton and isolated retry.
Validate task plus current organization server-side on every detail request;
membership revocation cannot rely on a cached layout. Load bounded pages with
deterministic ordering, retain deadline refresh correctness and prevent a late
response for task A appearing under task B.

## 17. Boards: value and priorities

Adopt the user-facing name **Boards**: “A visual workspace where startup teams
turn research, inspiration and ideas into decisions and executable work.”
Keep the existing `whiteboards` module, table names and routes initially.
Naming alone requires no migration.

| Priority | Product scope | Delivery boundary |
| --- | --- | --- |
| P0 — Foundation | Immersive BoardShell; sidebar hidden; vertical tools; clear Shapes; Frames/Sections; first-class images; multi-select; group/ungroup; alignment/distribution; same-size; layers; lock; duplicate; fit/zoom/minimap; focused templates; Stylus entity insertion and explicit convert-to-work | Editor mechanics in REDESIGN-004; native entity insertion/conversion in REDESIGN-005 after public contracts exist |
| P1 — Collaboration | Voting, restrained reactions, refined contextual comments with resolve, follow collaborator and meaningful board history | REDESIGN-005 may deliver comments/voting/reactions first; follow/history need separate bounded acceptance if too large |
| P2 — Intelligence | Selection summary, clustering, themes, action items, concept comparison, contradictions, selected content -> Reel Ideas, storyboard from Reel Brief, image palette extraction | REDESIGN-005 defines contracts/selection foundations only; executing new AI workflows requires explicit additional approval and security tests |

P0 means launch importance, not permission to cross Core/plugin boundaries in
REDESIGN-004. Keep scope bounded; no UML, large wireframe/sticker/GIF libraries,
embedded music, conferencing, complex presentations or hundreds of shapes.

## 18. Board list and templates

Implementation update (REDESIGN-004.2): the landing page now uses responsive
cards with real owner/template/update metadata and deferred authorized native
content previews. Empty/unavailable previews use a neutral fallback; private
images use glyphs without signing. Properties and Layers supersede the editor's
Inspector/outline labels below. [Boards](BOARDS.md) owns current behavior and
verification; the original audit and later-phase proposals remain historical.

The list remains in AppShell. Provide compact preview/list options, title,
template/type, last update, actual owner and meaningful collaborator metadata.
An edit collaborator list is not live Presence; label them distinctly. Do not
invent preview images or people. Existing boards without a template display
“Board,” not an inferred type. Preview generation must retain private access and
exclude expiring signed URLs from persistent metadata.

Creation starts with a name and one of seven focused templates. Show a small
preview and purpose; Blank is always available. Template creation is an explicit
authorized bounded action, not implicit record generation on page open.

| Template | Starting structure | Purpose |
| --- | --- | --- |
| Blank Board | Empty canvas, short insertion hint | Free visual work |
| Brand Moodboard | References, palette notes, type direction, selected direction | Align identity using images and notes |
| Campaign Board | Objective, audience, evidence, concepts, selected work | Connect campaign thinking to canonical work |
| Reel Storyboard | Hook, Setup, Value, Payoff, CTA sections | Plan scenes and production |
| Research Synthesis | Evidence, themes, contradictions, opportunities | Preserve evidence vs interpretation |
| Competitor Inspiration | References, abstract patterns, differentiation | Learn without copying creative expression |
| Brainstorm / Workshop | Prompt, ideas, grouped themes, final selection | Converge on explicit decisions |

No template creates Tasks, Ideas or permanent Knowledge automatically. Zero
boards: a short explanation and “Create board” with template choice, or a
VIEWER-safe explanation. Avoid the current oversized empty canvas-shaped box.

## 19. Immersive Board editor and manipulation

**BoardShell** fills the viewport below a compact board-specific 48px header.
Main sidebar and “Search Stylus” are absent. Header: open main navigation (overlay),
Back to Boards, editable title, unique collaborators, Comments, save/sync state
and More. Closing the navigation overlay restores canvas focus without moving
the viewport. Leaving with unsaved work offers recovery; do not claim offline
durability that the current system does not provide.

Separate three control zones: creation on the left, contextual controls on the
right/on selection, navigation at bottom-right. Keep all controls above safe-area
insets. Inspector and Comments share the right panel slot; opening one preserves
the other's context rather than stacking two narrow columns.

Creation toolbar, top to bottom: Select, Pan, Text, Sticky, Image, Link, Shapes,
Connector/Arrow, Section, Insert from Stylus, More. Each Lucide control has an
accessible name, keyboard-visible tooltip and optional displayed shortcut.
Use roving focus within the toolbar. Creation is one-shot and returns to Select
unless the user deliberately locks a tool; a help panel explains this.

Shapes uses `Shapes` plus chevron and visible menu labels: Rectangle, Rounded
Rectangle, Circle, Diamond, Line, Arrow. Basic geometry only. Connector can attach
to objects; its relationship persistence is a future implementation concern,
not permission to store unvalidated arbitrary JSON.

**Sections (P0):** explicit labeled regions with owned child identities. Create,
rename, resize, move, collapse and duplicate. Moving moves children in one bounded
operation; resize changes bounds without scaling text/images. Dropping an object
inside prompts/indicates membership; overlap alone must not silently reparent it.
Prevent ownership cycles and ambiguous multi-section membership. Collapse hides
the region's content visually but keeps it reachable in the accessible outline.
Archiving a section offers an explicit choice to keep or archive its children.
Duplicate copies local objects but keeps native cards linked to their original
canonical entities. Section AI and section voting follow P2/P1 contracts.

**Images (P0):** batch drag/drop and clipboard paste within the existing PNG,
JPEG, WebP and 10MB-per-file policy; bounded batches with per-file progress and
retry. Retain original private assets. Resize with aspect lock, nondestructive
crop, contain/cover, replace, caption/alt description, source URL, lock, duplicate
and layer order. Replace preserves the object identity, comments and caption;
source history is not silently rewritten. A source URL is metadata, not permission
to fetch. Cleanup must not remove assets still referenced by another object.

**Links (P0/P1):** P0 is a safe manual title, URL and optional note. P1 previews
only through a permitted, bounded, server-side source adapter using existing URL,
DNS, redirect, content and platform policies. Never embed arbitrary HTML or
silently scrape social URLs. Unavailable preview falls back to a normal link.

**Manipulation (P0):** maintain a selection set, not only the first selected ID.
Support group/ungroup, left/center/right and top/middle/bottom alignment,
horizontal/vertical distribution (at least three objects), same width/height
where meaningful, four layer actions, lock/unlock and duplicate. Define the
alignment anchor as selection bounds; distribution spaces outer edges evenly.
Locked items are selectable/inspectable but excluded from move/resize commands
until unlocked. Groups move together; ungroup retains world coordinates.

Persist group/section/multi-object operations atomically with bounded authorized
schemas and forward migrations only when relational invariants require them.
Do not claim a successful group move if only some children saved. Preserve local
history as one operation per user intent and existing remote-conflict behavior;
no CRDT replacement or shared unlimited undo is implied.

**Navigation:** bottom-right zoom out, numeric level, zoom in, fit board and fit
selection. Optional minimap toggle, off on small screens and sparse boards.
Restore a device-local per-board viewport without persisting tenant data into a
global cross-user cache. Zoom changes never alter saved object size.

## 20. Board collaboration

Preserve authenticated private `board:<organizationId>:<boardId>` channels,
slow Presence, throttled Broadcast cursors, directory-resolved display identity,
unique-user counts, multi-tab deduplication and stable active-set collaborator
colors. Never accept a cursor-provided role/name as authority. Disconnect and
unsubscribe on board or organization change; do not retain private data in
cross-tenant client state. A reconnect indicator distinguishes channel state
from successful database saving.

Comments stay in a right panel with board/object/section context, shallow replies,
validated mentions and resolution where introduced. Existing archive and author/
manager permissions remain. Resolution is not deletion. Focusing a thread reveals
its object without losing selection; archived/missing context gets a clear label.

P1 voting: an editor explicitly starts a round on named objects/one section with
a bounded per-person vote budget. Initial recommendation is visible voting;
anonymous voting is deferred pending a defined privacy model. One active round
per scope, idempotent votes, server-enforced budget and explicit close/results.
VIEWER reads results under current read-only rules. A winning object never creates
work until a user previews and submits the conversion.

P1 reactions: a small controlled set (Like, Question, Support) rendered with
Lucide and labels/counts, not emoji decorations. One toggle per person/object/
reaction; authorization and removal behavior must be defined in that task.
Follow collaborator is opt-in, visibly active, cancelled by Escape/local pan;
“bring everyone” must never seize another user's viewport without consent.
History uses meaningful persisted changes, not a recording of cursors or Presence.

## 21. Stylus-native board objects, conversion and intelligence

“Insert from Stylus” searches authorized current-organization records: Task,
Research Evidence, Reel Idea, Competitor, Campaign and Creative Brief. Label
manual Creative Brief versus immutable Reel Brief version explicitly. Cards show
type, canonical identity/title, current relevant status and bounded metadata;
Evidence adds exact source, evidence ID, modality and timestamps. Versioned
artifacts bind to the selected exact version; live task/campaign cards resolve
current authorized state. Never duplicate canonical content into board truth.

Core owns a public entity-reference/provider contract and generic renderer.
Marketing registers its resolvers/actions through that documented interface;
Core Boards must not import `modules/marketing` or private plugin persistence.
Both insertion and later resolution recheck tenant, plugin and entity permission.
Disabled, revoked, archived or deleted references render a generic unavailable
state without leaking old titles/excerpts. Do not place a privileged snapshot in
board JSON to bypass later checks. Clicking opens the canonical entity; where
no detail route exists, use a validated entity selection in the existing area.
All six entity types need an actual opener contract before insertion is shipped.

Conversions are deliberate preview forms: Sticky -> Task, Sticky -> Reel Idea,
Selection -> Research Note/Task, Winning concept -> Reel Idea. The preview shows
mapped fields, target, provenance and what will remain on the board. Reuse Core
task or Marketing creation APIs, enforce permissions independently, prevent
duplicate submission and return a canonical reference card on success. If the
board-link step fails after record creation, recovery reattaches the existing
record rather than creates a duplicate. None of these actions promotes Knowledge.

AI is a contextual action on a reviewed selection. Preview exactly which text,
image metadata or authorized native projections will be sent, the allowed
operation and limits. No silent whole-board retrieval; no selected image is
claimed as visually understood without a supported gateway capability. New AI
operations require bounded schemas, logical model profiles, stage/call/time/
retry limits, persisted audit and an explicit application action. ModelGateway
is the only provider path. Suggestions stay working drafts until accepted.

Selection summarization, clustering, themes, action items, comparisons,
contradictions and audience-tension grouping are P2. Conversion to Reel Ideas
requires a second explicit persistence action after review. Scope every AI memory
record with organization, workspace where applicable and domain; Marketing may
request company/marketing only, Agency agency only. A board reference grants no
new domain authority. Do not auto-ingest boards or comments into memory.

Reel Storyboard uses Hook (suggested 0–3s), Setup (3–10s), Value (10–25s), Payoff
(25–30s), CTA. Timing is editable guidance, not a new constraint on existing
briefs. Each section supports visual reference, spoken copy, on-screen text,
scene notes, B-roll and timing. “Create storyboard from Reel Brief” is a later
explicit high-value integration from an exact authorized version. It neither
rewrites that brief nor runs another Council implicitly.

## 22. Creative Studio

One local Studio destination exposes **Create, Ask Council, Outputs**. Create
progresses through **Idea -> Evidence -> Create -> Review -> Output**. These are
navigation stages over existing records, not a replacement AI state machine.

Desktop: 176px stage rail, flexible primary workspace with readable prose,
optional 288px context/evidence inspector. Select a stage to focus its content;
do not permanently show every specialist result as a separate card. Tablet uses
a horizontal stage selector and context drawer; mobile shows one active pane.

Idea selects the existing Reel Idea. Evidence previews canonical Company context
and explicitly selected eligible competitor analyses. Existing Research and
Performance links may be browsed but must not be passed into Create unless a
future contract explicitly permits them. The redesigned stage name “Evidence”
does not broaden TASK-015's input projection.

Create still executes Hook -> Script -> Critic with exactly three successful
ModelGateway calls. Review is a separately initiated Strategic Review on an exact
Reel Brief version: Audience -> Brand -> Strategy -> Challenge -> Judge, five
calls maximum. Clicking a stage never starts execution. Selected review findings
appear in the center, identified by label, Lucide icon and status, not color.
Show failure at its actual stage; retain prior safe outputs and never fabricate
an approval or final artifact. Existing review verdicts are not a new human
approval workflow.

Output presents a production artifact: Strategy, Hook, Script/timing, Production,
Evidence, Review and Final decision. Display only fields actually supplied by the
versioned artifact; missing information is unknown, not invented. Distinguish
Critic verdict, Judge disposition and any future human decision. Keep exact
version, source and safe run-history links; long history is secondary.

Ask Council is a Studio advisory mode using its existing conversation route and
storage. Preserve bounded intent routing, explicit-first context, two V1
specialists with a hard three-specialist ceiling, one synthesis only after full
success, four-call/55-second maximum and exact provenance. It remains distinct
from Create and Strategic Review, never starts Research, derives Performance,
creates a brief, invokes tools, writes memory or reaches Agency. Its primary
surface is the synthesized answer; specialist perspectives disclose on demand.

Outputs groups immutable Reel Brief versions, exact Strategic Reviews and human
Creative Briefs without merging their schemas or rewriting history. “Approved”
on a manual brief remains distinct from AI verdicts. Board/storyboard handoffs
are explicit later integrations.

## 23. Marketing

Overview highlights work to continue: ideas ready for Studio, existing research
results to inspect, active campaigns and recorded publication outcomes. Use real
scoped records. Replace the four feature-colored statistics with concise counts
next to corresponding lists. Core renders a single plugin navigation contribution
through its public host, never imports Marketing internals to assemble its shell.

Ideas stays a first-class local list because manual intake is useful before AI.
Retain IDEA/DRAFT/READY, archive/restore and campaign association. “Open in
Studio” selects the canonical idea without execution. Local tabs and contextual
backlinks must cover every moved route before removing its old global link.

## 24. Research

Research has Reports, Evidence, Manual notes and Competitors as subviews. Keep
these identities distinct: a report synthesizes evidence; an opportunity is a
strategic candidate; a source identifies provenance; a manual note records human
working knowledge. None is automatically a script or permanent memory.

Lead with question/intent, source coverage and usable findings. Findings link to
exact EVID records and source. Show published versus retrieved time, modality,
source type, freshness, confidence/assumptions and unavailable source reasons.
Preserve source diversity, sample caveats and evidence versus inference labels.
Do not compare platform counts as confidence probabilities. Known zero and
unavailable stay distinct.

Competitor profile opens its existing Reel history, permitted manual uploads,
transcript/metrics and immutable analysis versions. External fetching stays behind
current approved adapters and safe-fetch policy; a profile/social link is never
crawler permission. Research Evidence -> Research Synthesis Board is an explicit
reference insertion, not duplication or automatic creative generation.

## 25. Campaigns

Campaign detail leads with objective, dates/status and existing linked ideas and
manual briefs. Link canonical Tasks, Research, publications and performance only
where a real relation exists. Additional typed relationships require separately
scoped forward migrations/API work in REDESIGN-007; title matching is not a
relationship and is never inferred as fact.

Use Core task creation/selection, not a parallel campaign task system. Show exact
Reel Brief linkage and manual observation horizons on available publications.
Retain immutable metric snapshots, missing-versus-zero semantics and descriptive
learning thresholds; redesign never invents analytics or causal attribution.
Performance remains independently discoverable from Overview as well as Campaigns.

## 26. Settings

| Local section | Contents and discoverability | Existing authority retained |
| --- | --- | --- |
| Account | Current identity and available account controls | Only implemented actions; do not invent email/password changes |
| Organization | Organization identity; Company Profile/edit path | Members read; OWNER/ADMIN manage profile |
| Team | Directory, invitations, roles | Existing role restrictions; last-sign-in OWNER/ADMIN only |
| Appearance | Light/Dark/System | Device-local preference; pre-hydration resolution |
| Knowledge | Canonical company context and explicit Memory workspace | Members can discover; existing memory write roles |
| AI | Policy, budget and safe run history | OWNER/ADMIN configure; existing member read rights |
| Integrations | Trusted Apps enablement; development fixture subsection | OWNER/ADMIN enable; members inspect as currently allowed |
| Workers | Optional compute registration/status and setup | Pair/revoke manager-only; preserve allowed member status reads |
| Advanced | Jobs and safe workflow diagnostics | Existing member/creator/role action permissions |
| Danger Zone | Organization deletion only where implemented | OWNER, exact-name confirmation, existing transactional deletion |

Moving Knowledge under Settings must not make it admin-only. Contextual links
from Studio and Research improve discoverability without changing retrieval
policy. Jobs links from a failed/queued workflow remain available to authorized
members; raw payloads/secrets stay hidden. Avoid device/provider jargon in normal
workflows except where it explains a user-actionable blocker.

## 27. Loading states

Keep shell and current selection visible while routing. Show an immediate pending
indicator on the initiating control, then destination-shaped skeletons within
the content boundary. Do not display stale previous-route content under a new
heading without a loading indication. Prevent duplicate submissions without
freezing unrelated navigation. Clear indicators on error or cancelled navigation.

Use local Suspense boundaries for secondary activity, context and history only
after authorization. A shell error is separate from a panel error. Show actual
persisted AI/job stage when available; otherwise say “Running” without fabricated
percentages or staged animation. Reduced motion replaces pulses with static
skeletons. Board saving and connectivity are separate states.

## 28. Empty states

Explain what the area is, why it matters and one permitted next step. Distinguish
first-use empty, no filter matches, no permission and source unavailable. Keep
empty messages proportionate to nearby content. Examples: Ideas -> “Capture a
Reel concept to develop in Studio”; Research -> choose a permitted research action
or add a manual note; no Task matches -> clear filters. VIEWER gets a read-oriented
message, never an enabled create action that will be rejected.

## 29. Error states

Use safe specific causes and recovery: “The optional worker is offline; this
analysis remains queued,” or “Comments could not load. Retry comments.” Preserve
unsaved form text and successful partial AI stages. Do not replace a useful
cause with “Something went wrong.” Authorization failures reveal no foreign
record titles. Keep provider bodies, stack traces, credentials and storage paths
out of error UI. Errors announce once and move focus only when needed to resolve
the failed action.

## 30. Accessibility

Target WCAG 2.2 AA and validate with Windows NVDA plus keyboard. Preserve semantic
header/nav/main landmarks, a visible-on-focus skip link, one page heading, active
navigation semantics, field labels, inline errors and visible focus. Normal text
needs 4.5:1 contrast; large text and meaningful non-text controls need 3:1. Color
is never the only status or identity signal. Use at least 40px control targets,
44px on touch; dense rows may use smaller visual glyphs inside full targets.

Dialogs trap focus, label their title/description, close predictably and restore
focus to the opener (or surviving row after deletion). Desktop nonmodal detail
panels allow a keyboard path back to the list; mobile modal panels trap focus.
Route changes update document title and move focus to the new main heading once
content is ready; shell controls retain focus during local filtering.

Canvas accessibility is explicit: provide a keyboard-reachable object/section
outline with type, name, text, position and grouping, plus inspector editing and
comments for the selected object. Select, move, resize, reorder, group and convert
must have menu/inspector alternatives to drag. Maintain logical reading order
independent of pixel coordinates, with section children nested in the outline.
Images have editable descriptions; live entity cards have text equivalents.

Proposed Board shortcuts, advertised in Help and disabled inside text fields:
V Select, H Pan, T Text, N Sticky, F Section; Space temporarily pans; Escape
ends editing/tool mode or closes a panel; arrows move selected objects by 1
board unit, Shift+arrows by 10; Ctrl/Cmd+D duplicates; Ctrl/Cmd+G groups,
Ctrl/Cmd+Shift+G ungroups; Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z redo (retain Ctrl+Y);
Delete/Backspace archives only when canvas selection is focused. Enter opens
text/inspector editing; Tab traverses controls/outline without a canvas trap.
Offer a shortcut toggle to avoid screen-reader single-letter conflicts. No
single-key shortcut is active merely because the document has focus.

Announce selection count, completed saves and errors politely. Never announce
every pointer move, remote cursor or autosave keystroke. A graphical minimap is
optional; fit controls and the outline provide equivalent navigation. NVDA QA
must include insertion, section movement, image editing, comments and converting
work; generic page checks alone are insufficient.

## 31. Responsive behavior

Breakpoints are V2 layout contracts: mobile below 768px, tablet 768–1199px,
desktop 1200px and above. Test reflow at 320 CSS px, 390/430px mobile, 768/1024px
tablet and 1440px desktop, plus zoom and on-screen keyboards.

| Surface | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| Application sidebar | 224px; collapse to 56px | Collapsed rail; drawer when content needs width | Modal navigation drawer; closes after navigation, restores appropriate focus |
| Marketing navigation | Five local labels | Scrollable labels or compact selector | Named section selector; every destination still reachable |
| Tasks/detail | Flexible rows + 480px panel | Overlay detail when list cannot fit | Two-line rows; full-screen detail with explicit Back/Close |
| Studio | Stage rail, center, optional context | Stage strip; context drawer | One stage; context and output as full-width panels |
| Boards list/editor | Normal list; immersive canvas | Immersive canvas; no global rail | Full canvas with focused inspect/comment/simple edit workflows |
| Board toolbar | Vertical left | Vertical compact, overflow tools | Select/Pan/Insert strip and More drawer; named Shapes list |
| Inspector/comments | One optional 320px right slot | One overlay panel | Full-width sheet; keyboard-safe height and close control |
| Authentication | Storytelling + form | Reduced showcase or form-only | Form-first; showcase removed |
| Lists/tables | Clear columns | Hide secondary fields into detail | Reflow to rows; labeled horizontal scroll only for inherently tabular data |

Touch uses deliberate Select/Pan modes; pinch zoom must not accidentally create
objects. Mobile supports reading, commenting and simple editing without claiming
precision parity with desktop. Complex alignment/group actions remain available
through named selection menus. Panels must not leave only a sliver of canvas.

## 32. Motion

Use 120–180ms transitions for panels and state changes where they improve spatial
understanding. Navigation feedback is immediate, never delayed for animation.
No looping decorative motion, specialist theatrics or mandatory smooth canvas
travel. Respect `prefers-reduced-motion`: static skeletons, immediate panel
changes and instant fit/follow changes. Existing global reduced-motion CSS is
retained and must cover any new transitions.

## 33. Performance findings: all ten hypotheses

Evidence is from source, not a production profile. Paths below are relative to
`apps/web/src/`. Confirmed mechanisms are plausible contributors to the reported
pause; their individual timing contribution remains **NOT VERIFIED**.

| Hypothesis | Verdict | Source evidence and qualification |
| --- | --- | --- |
| H1 Sidebar uses ordinary anchors | CONFIRMED | `components/layout/sidebar.tsx` renders `<a href={item.href}>`. Internal sidebar clicks use document navigation rather than the Link component. Marketing tabs, task views, Settings links and board cards already use Link. |
| H2 AppShell is recreated by pages | CONFIRMED | `app/layout.tsx` supplies only document/theme. Core pages render AppShell themselves; MarketingPage does too. No shared authenticated workspace layout exists in the audited route tree. |
| H3 Common shell state is repeatedly fetched | PARTIALLY CONFIRMED | New navigations resolve organization/setup/notifications again. `getNotificationSummary` makes two parallel queries. Plugin state is already React-cached per org per render request, and navigation composition is in-memory; repeated function calls do not prove repeated plugin DB queries within one request. |
| H4 Redundant auth/membership resolution | PARTIALLY CONFIRMED | `getCurrentOrganizationContext` is React-cached and calls cached `getAuthenticatedUser`; “every helper causes another Auth network call” is REJECTED within that request. But it selects membership then calls `requireOrganizationMembership`, which reselects membership and organization; `getOnboardingData` repeats that uncached membership/org helper. Proxy claims checks are a separate security boundary, not automatically removable waste. |
| H5 Full onboarding loaded just for redirect | CONFIRMED for routine Core pages | Home/Tasks/Activity/AI/Jobs/Apps/Team/Settings/Boards call `getOnboardingData`: membership/org recheck then six parallel reads of company, audience, brand, marketing, competitors and progress. Their gate needs only completion/current step plus role. Company Profile and Memory actually consume profile content; do not remove their full loader. Marketing guard and Workers do not have the same onboarding pattern. |
| H6 All task comments loaded upfront | CONFIRMED | `modules/tasks/server/data.ts` selects all organization `tasks` and `task_comments`, unpaginated, before page filtering. `app/tasks/page.tsx` passes every comment to the client while detail opens later in a Dialog. |
| H7 Insufficient loading/transition feedback | PARTIALLY CONFIRMED | Loading files already exist for Tasks, Activity, Whiteboards, AI, Memory, Jobs and Marketing. Home/Settings/Team/Workers/Apps lack their own boundary; Marketing children share its parent fallback. No persistent shell sits above these page fallbacks, and no local Suspense appears in the inspected shell/pages. Plain document sidebar navigation cannot retain shell state just because a loading file exists. “There are no loading states” is REJECTED. |
| H8 Avoidable sequential server fetches | PARTIALLY CONFIRMED | Tasks/Core pages already parallelize page data and notifications after their gate. Marketing pages await data before MarketingPage starts notifications, then AppShell awaits plugins (the guard may have memoized plugins). Membership, setup decisions and selected-object-dependent reads have real dependencies. Parallelize only independent reads after required authorization. |
| H9 Prefetching ineffective | PARTIALLY CONFIRMED | Sidebar anchors provide no Next Link prefetch opportunity. Other Link-based areas already exist. Production prefetch coverage, dynamic-route cache behavior and actual warm-route benefit are NOT VERIFIED; do not assert a particular framework TTL or promise zero network work. |
| H10 Broad mutation invalidation | PARTIALLY CONFIRMED | `modules/whiteboards/actions.ts` calls `revalidatePath('/', 'layout')` after comment creation. Marketing CRUD invalidates the changed area, Overview and Activity; Tasks invalidates `/tasks`. Root-layout invalidation has broad potential scope, but measured refetch volume and correctness of removing any invalidation are NOT VERIFIED. |

Additional inspected cost: `modules/whiteboards/server/data.ts` loads comments,
members and all elements, then signs every image individually with Promise.all
before returning editor data. Parallel signing still blocks meaningful content
on the slowest response. Studio and Strategic Review refresh routes every 2.5s
while pending. Investigate their payload/overlap later; do not replace bounded
workflow contracts with a speculative event system.

No DB execution plans, production latency, render profiles, hydration duration
or bundle sizes were measured. An index problem, slow region, provider outage
or connection bottleneck is **NOT VERIFIED**, not an inferred diagnosis.

## 34. Performance remediation

| Priority | Remediation | Proof required in implementation |
| --- | --- | --- |
| P0 | Internal sidebar Link; persistent workspace layout; immediate navigation feedback | No new document request for routine workspace transitions; shell stays mounted; Back/modifier clicks work |
| P0 | Narrow onboarding completion/current-step query for gates | No unrelated profile/competitor reads on Tasks/Activity/etc.; setup completion, resume and role waiting states unchanged |
| P0 | Share request-scoped verified context; eliminate redundant read-only membership/org lookups inside the same render | Query trace distinguishes auth, membership and org calls; mutations/direct entry still freshly authorize |
| P0 | Route/local loading boundaries under persistent shell | Slow/error routes give visible and screen-reader feedback; previous private content does not leak across org/logout |
| P0 | Lazy Task detail/comments (REDESIGN-003) | Initial task list has zero comment bodies; selected-task reads bounded and tenant-checked |
| P1 | Share shell reads per request; selective Link prefetch, safe parallel reads | Count actual DB/network operations; avoid prefetching large board, Studio or history payloads indiscriminately |
| P1 | Bounded list projections and detail/history deferral | Compare transferred bytes and list completeness; deterministic pagination/filter/archive semantics |
| P1 | Target invalidation by actual dependencies; refresh notification summary explicitly where needed | Assignment/comment/mention counts and Home attention remain correct; fewer unrelated refetches |
| P1 | Defer board image signing/comments/history where useful; evaluate supported batch signing | First usable board retains proper private access, expiry and missing-image recovery; no signed URL cache shared across tenants |
| P2 | Profile SQL/indexes, expensive render/hydration work and chunk loading | Evidence from plans/profiles justifies change; no speculative indexes or new cache services |
| P2 | Advanced authorization-safe caching and further payload/code splitting | Repeat user/org/plugin revocation tests, stale-state limits and cold/warm benchmark |

Do not remove authorization in the name of deduplication. Request-scoped
memoization is different from a cross-request cache. Do not cache user data in a
module-global variable, unscoped key or persistent shared response. Layout state
is not sufficient authority after membership/plugin changes. Revalidate server
permissions on each mutation and new data boundary; clear private client state on
org/account changes. All optimization tasks preserve RLS.

## 35. Performance measurement

REDESIGN-002 starts by capturing a baseline before changes. No baseline numbers
are fabricated in this specification. Use production build/preview, fixed data
fixtures, the same browser/device, region, account/role, viewport and network
profile. Never benchmark dev HMR as production navigation.

Representative transitions: Home -> Tasks; Tasks -> Marketing; Marketing ->
Studio; Studio -> Research; Settings index -> Team/AI; Boards list -> editor.
Run each separately with small/representative data and a larger fixture (for
example 200 tasks/1,000 comments and 100 board objects/20 private images), recording
fixture identity and counts. These are proposed benchmark fixtures, not current
org measurements.

Capture at least ten cold and ten warm repetitions per transition. Define cold
as a fresh browser context with HTTP/router caches cleared and no prior prefetch;
record server cold-start state separately because browser clearing cannot reset
hosted compute. Warm is a repeat transition in the same authenticated session;
record whether a prefetch occurred. Do not mix these distributions.

| Measurement | Future method |
| --- | --- |
| Click -> first visual acknowledgement | Browser performance mark at activation, next paint of pending/selected state; include keyboard activation |
| Click -> meaningful content | Mark when the destination's useful list/artifact/interactive canvas is ready, not just its heading or skeleton |
| Server/render timing | Request correlation and safe Server-Timing/span instrumentation for auth, org, setup, shell and page data; avoid secrets/content |
| DB request count/time | Count actual Supabase HTTP/RPC requests and durations per navigation; separate Auth, DB and Storage signing; memoized helper calls count zero extra requests |
| Payload | Document/RSC/JS transfer and decoded size; selected task list versus detail/comments; board metadata/elements/images separately |
| Interaction readiness | Hydration/long-task trace plus time until a task can open or canvas can pan/select; downloading data alone is not readiness |

Report raw observations, median and p95 (flag the small sample), failures and
environment for before/after; preserve traces locally without private content.
Functional gates: zero document reloads for routine workspace Link navigation,
stable shell, no initial task comment bodies, and no six-dataset onboarding gate.
Initial aspirational budgets on the recorded reference environment: visual
acknowledgement p95 <=100ms; warm meaningful text/list content p95 <=500ms;
cold text/list content p95 <=1.5s; representative board interactive p95 <=2s.
These are proposed budgets, not measured claims or unconditional SLAs. Record
exceptions with trace-backed causes; do not silently relax targets. Repeat with
slow network, keyboard input, Marketing disabled, VIEWER and switched/revoked org.

REDESIGN-009 repeats the full matrix and NVDA/responsive QA. Each earlier task
must still measure its changed transitions; profiling is not postponed entirely
to the final phase.

## 36. Migration and invariants

Keep data, URLs/query state, immutable versions and exact research provenance.
First change navigation composition; keep legacy URLs as canonical entrypoints
with the new parent selected. Only introduce a redirect once a real destination
exists, preserving task/conversation/version/archived filters and safe return
paths. No `/boards` route or renamed SQL table is needed for the label “Boards.”
Old bookmarks and notification targets must work at every phase.

Workspace route groups must preserve login, organization setup, onboarding and
invitation behavior. Keep public/auth routes outside the authenticated shell.
Ensure moving Workers/Marketing under a common gate does not accidentally remove
currently allowed direct setup behavior; add regression coverage for the intended
setup flow before consolidation. Layout sharing must not bypass fresh server
checks or retain another organization's private data.

No database or application change occurs in REDESIGN-001. Later sections/groups,
entity references, votes and comment resolution may need forward migrations with
RLS, composite tenant constraints and lifecycle tests. Visual changes alone do
not justify new persistence or rewrites of applied migrations. Preserve private
Storage access, leases/retries/cancellation, local operation history and Realtime
security. Worker connections stay outbound, offline heavy work stays queued and
Ollama is never exposed publicly.

Marketing remains a plugin and Core has no Marketing-private imports. All model
execution stays behind ModelGateway. TASK-015/016/017/018/020 contracts remain
unchanged by navigation, including their distinct call, context and stopping
limits. Working information becomes durable Company Knowledge only through an
explicit approved promotion action. Agency stays isolated and TASK-019 deferred.

## 37. Implementation phases and owner decisions

These tasks are specified, **not started or independently authorized**. A later
task must inspect the then-current main, existing local changes and tests again.

| Task | Exact intent and exit gate |
| --- | --- |
| REDESIGN-002 | Capture baseline; establish V2 shared visual foundation, persistent workspace shell/route groups and five global entries; add landing/settings links for moved routes using existing URLs; replace sidebar anchors; narrow setup gate and deduplicate render-only context reads; content-level loading/navigation feedback; two-column auth with existing behavior. Test shell persistence, routes, setup, invitations, plugin-disabled and member revocation. Remove inert global search. No new search backend, task drawer, Boards mechanics, Marketing workflow rebuild, Settings feature migration, business logic or schema changes. |
| REDESIGN-003 | Home attention hierarchy and timezone consistency; Tasks views/toolbar/detail drawer, lazy comments and bounded list/detail loading. Preserve reminders, task lifecycle, read-only and archive contracts. |
| REDESIGN-004 | Boards label/list/template foundation, immersive BoardShell, vertical toolbar/Shapes, sections, images, selection/group/alignment/layers/lock and zoom/minimap. Preserve private assets/collaboration/history; migrations only for necessary new object invariants. No Marketing imports or execution. |
| REDESIGN-005 | Public entity reference/opening and conversion contracts, native cards, conversion recovery, voting/reactions and comments refinement. Establish selection authorization/context preview for later AI; storyboard exact-version handoff only if explicitly included. Deliver P0 integrations before optional P1 breadth; P2 AI execution is a separately approved scope. |
| REDESIGN-006 | Marketing local shell and Studio stage workspace, Ask Council as advisory mode, structured outputs/history. Preserve all existing workflow contracts; no new input domains or model calls. |
| REDESIGN-007 | Research hierarchy/Competitors consolidation, Campaign detail and secondary Performance/human-brief surfaces. New entity relations only when explicitly scoped; preserve evidence/snapshot semantics. |
| REDESIGN-008 | Settings internal consolidation and advanced surface presentation, with unchanged read/manage distinctions and direct legacy URLs. |
| REDESIGN-009 | Full before/after profile, responsive/contrast/keyboard/NVDA acceptance, remaining measured fixes, release QA and documentation. |

Dependency adjustment: REDESIGN-002 must add discoverable Settings/Marketing
landing links immediately, even though full internal redesign belongs to 006–008;
otherwise removing global links temporarily hides functionality. P0 native Board
integration follows 004 in 005 because it needs public Core/plugin contracts.
No future functionality starts merely because its contract is described here.

Owner decisions before their implementation: accept proposed global IA and the
Boards label; confirm Knowledge remains discoverable under member-readable
Settings; accept retaining Performance as a named secondary destination; confirm
the default visible-voting policy before P1; agree benchmark device/fixture and
budgets before enforcing performance thresholds. These are review decisions,
not blockers to completing this specification or a request for another approval
round now. Anonymous voting, global search, new AI selection workflows and a URL
rename remain separate future scope decisions.

## 38. Acceptance criteria

Documentation acceptance for REDESIGN-001:

- The five reference files are read, differentiated and treated as inspiration;
  source limitations and extraction errors are explicit.
- All page routes and non-page entrypoints are inventoried, including Performance,
  Example, invitations, setup and auth recovery; no function disappears.
- One visual contract and shared interaction contract align with this product
  specification; older conflicting pastel guidance is superseded explicitly.
- BoardShell, list, templates, geometry, images, links, keyboard/outline,
  collaboration, native entities, conversions and P0/P1/P2 boundaries are defined.
- All ten performance hypotheses have evidence-based verdicts; unmeasured
  latency stays unmeasured; remediation and repeatable benchmarks are specified.
- Authorization, RLS, plugin boundaries, memory isolation, evidence provenance,
  exact versions and explicit user intent are preserved.
- Only the seven redesign/status/decision Markdown files change; no application,
  dependency, worker, migration, data or reference asset changes.
- Scoped Markdown formatting, local link/route inventory validation and
  `git diff --check` pass. Record lint/typecheck and focused existing tests
  separately; no full suite or production build is necessary for prose-only work.
- Commit documentation only on the requested branch; do not merge/push or start 002.

Future implementation acceptance applies at each phase: preserve direct and
back-navigation routes, enforce role/tenant/plugin checks server-side, show
immediate honest loading/error state, pass relevant permanent isolation and
workflow tests plus lint/typecheck/build, and verify desktop/tablet/mobile and
keyboard/NVDA behavior for changed surfaces. V2 is not shipped until these
implementation gates and final measured acceptance pass.
