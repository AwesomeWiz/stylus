# Stylus — Design System V2

Status: DEFINED for future implementation in REDESIGN-002 onward. No CSS or
component implementation changes are made by REDESIGN-001.

[Product Experience](STYLUS_V2_PRODUCT_EXPERIENCE.md) owns feature direction,
route placement and implementation scope. This document owns shared visual
rules. [UI Patterns](UI_PATTERNS.md) owns interaction and state behavior.

## Identity and visual hierarchy

**Quiet interface, expressive product.** Preserve canonical Stylus cyan
`#0D98BA` and the approved mark at `assets/brand/stylus-logo-source.png` (repository
root), served through `apps/web/public/brand/stylus-mark.png`. Normal chrome is
neutral; team content provides expression. Avoid dashboard-template composition,
giant headings and colorful feature launchers.

**Quiet work surfaces. Expressive moments of identity.** Authentication,
onboarding and selected first-run/brand moments may use original, art-directed
abstract visuals. This is a bounded identity treatment, not permission to color
Home, Tasks, Settings or ordinary workspace chrome. REDESIGN-003.1 implements
this exception only for login/signup: flat organic SVG planes, contour lines,
sparse structure and one short headline, with the existing quiet form alongside.
No workflow-card stack, floating dashboard, glass, glow, generic AI imagery,
external artwork or new font is needed.

Auth artwork uses scoped `--auth-*` custom properties with authored light/dark
palettes; canonical brand/action tokens remain unchanged. Decorative strokes
are not status colors. Essential copy/form contrast still follows the rules below.
Keep the composition complete when static. Desktop pointer response is subtle
and local; smaller screens, coarse pointers and reduced motion use static art.

Use existing semantic tokens in `apps/web/src/app/globals.css`, current UI
primitives and Radix foundations. No new component library or font dependency.
Rules below are V2 targets; existing components are not assumed to satisfy them.
When implementing, change shared primitives/tokens before creating page variants.

## Color and theme

Directional normal-application balance: about 90% neutral surfaces, 7% primary
accent, 3% semantic/status. These are qualitative review proportions; user images,
intentional board objects and collaborator identity are not chrome color quotas.

| Role | V2 rule |
| --- | --- |
| Brand | Keep `--brand: #0D98BA` in both themes; use for approved identity |
| Filled primary action | Retain light `--primary: #087690` with white foreground; dark `#42C2DE` with existing deep foreground. Verify all states on their actual surfaces |
| Hover/active | Retain derived primary state tokens; do not hard-code page colors |
| Selection/current area | Small primary indicator or subtle cyan surface plus text/weight; not an entire colored page section |
| Page/chrome | Existing `background`, `sidebar`, `card`, `muted`, `popover`, foreground and border tokens; keep chroma low |
| Status | Success, warning, destructive and information tokens with a text/icon label; unknown is neutral |
| Specialist identity | Existing centralized Lucide mapping plus name/status. Remove reliance on unique specialist-colored reading blocks |
| Human identity | Preserve tested eight-family active-set collaborator allocation, including avatar/cursor/name agreement and multi-tab deduplication |
| Editorial accent | Rare, small callout only when meaning is explicit; no per-feature/index pastel assignment |

Normal text contrast must be at least 4.5:1; large text and meaningful non-text
controls at least 3:1. The canonical cyan is not a blanket white-text button fill.
Do not assume muted labels, skeletons, disabled controls or board objects inherit
safe contrast from the page. Keep focus rings visible against adjacent surfaces.

Retain Light/Dark/System using existing device-local `stylus-theme`, pre-hydration
resolution and system preference listener. No organization database setting.
Every new semantic pair must be reviewed in both themes. Never apply a dark-mode
filter to user images. Canvas content colors preserve authorship while editing
controls and text equivalents remain accessible.

Earlier guidance recommending one or two pastel section blocks per page is
superseded. Existing pastel tokens need not be deleted; stop assigning them as
default structure in each phase. Collaborator palettes and meaningful semantic
colors remain. See ADR-040 in [Decisions](DECISIONS.md).

## Typography

Keep the current `Inter, ui-sans-serif, system-ui, ...` fallback stack; no new
download is required. Express sizes in rem at a 16px browser default and respect
user scaling. Use sentence case. Tight tracking is optional only on short titles;
body and metadata track normally. Do not reproduce reference marketing sizes or
proprietary font metrics.

| Token/role | Size / line height | Weight | Application |
| --- | --- | --- | --- |
| Page title | 24 / 32px | 600 | Home, Tasks, Settings and normal area titles |
| Workspace title | 20 / 28px | 600 | Active Studio artifact or workspace heading |
| Section title | 16 / 24px | 600 | Attention, evidence, production sections |
| Body / long-form AI output | 15 / 24px | 400 | Main prose, reviewed findings and production brief |
| Dense list / table body | 14 / 20px | 400; title 500 | Task rows, research lists and database-like views |
| Form label / control | 14 / 20px | 500 / 400 | Explicit labels and control content; inputs become 16px on mobile |
| Metadata / table header | 12 / 18px | 400 / 500 | Dates, evidence provenance, secondary labels; no essential instruction below 12px |
| Canvas object label | 16 / 24px at 100% zoom | 400; section 600 | Defaults for new objects; preserve authored styles |
| Board header title | 14 / 20px | 600 | Compact chrome, independent of canvas zoom |

Use 72ch maximum reading width for prose and reviews; Studio's inspector is
metadata, not the primary place to read an entire report. Structure AI content
with headings, short paragraphs, findings, citations and uncertainty. Use the
same hierarchy as human content. No AI-specific font, tiny disclosures, raw JSON
wall or giant specialist headings. Numeric metadata may use tabular numerals.

## Spacing and geometry

Use the 8px-derived scale `4, 8, 12, 16, 24, 32, 40, 48, 64`. The 4px and 12px
subdivisions serve dense label/icon relationships, not arbitrary page margins.

| Context | Canonical target |
| --- | --- |
| Desktop shell | 224px expanded sidebar, 56px collapsed; 48px topbar |
| Page margin | 24px desktop/tablet; 16px mobile |
| Main section separation | 32px; 16px between related subsections |
| Page header to toolbar/content | 24px; 8px title-to-description |
| Standard control | 40px minimum target/height; 44px on touch; 16px icons, 20px where needed |
| Dense list row | 48px minimum; content may wrap; 12–16px horizontal padding |
| Content card | 16px padding; 24px for substantive isolated forms |
| Dialog/drawer | 24px padding desktop; 16px mobile; 16px field gap |
| Task detail | 480px desktop target, viewport-bounded; full-screen mobile |
| Context inspector | 320px Board slot; 288px Studio slot; single optional right panel |
| Canvas toolbar/control offset | 16px from edges plus safe-area inset; 8px control-group gap |
| Board header | 48px minimum; wraps/uses overflow before hiding essential save state |

At desktop (>=1200px), normal overview/settings content caps at 1200px, while
operational lists use available width. Prose caps at 72ch. Studio can use the
available workspace width; canvas has neither page margins nor a reading cap.
At tablet (768–1199px) collapse global navigation as needed; below 768px use a
navigation drawer and focused single-pane work. Do not shrink text to force the
desktop grid onto a phone. Full responsive behavior is in the product spec.

## Surfaces, borders, radius and elevation

Prefer page sections and dividers to a container around every section. Neutral
surface differences express hierarchy; cards group distinct objects or actions.

| Primitive | Rule |
| --- | --- |
| App surface | Neutral background, flat |
| Sidebar/topbar | Neutral, opaque; one subtle dividing border |
| List/table | Neutral content surface or direct page content, subtle row separators |
| Card | Neutral, 1px semantic border, no decorative shadow |
| Popover/menu | Neutral overlay with border and one subtle shadow if needed |
| Dialog/drawer | Neutral, border, restrained overlay/shadow; no floating marketing card treatment |
| Canvas controls | Neutral opaque groups above canvas; border and minimal separation shadow only |

Radius scale: 4px compact indicators/menu items, 6px controls and list groups,
8px object cards/tool groups, 12px dialogs. A drawer flush to a viewport edge
need not round that edge. Full-circle radius is for avatars or actual swatches,
not every input or action. Reuse shared variants instead of per-page values.

Use 1px semantic borders; do not rely on an extremely faint border as the sole
affordance for a control. Avoid large shadows, stacked floating panels, glow,
glass/backdrop blur as normal chrome, decorative gradients and saturated
reading surfaces. Board content may be expressive; editor chrome remains quiet.

## Icons and reusable primitives

Use Lucide consistently: 16px default, 20px for larger actions, approximately
1.75–2px stroke. Keep icon and label alignment stable. Never use emoji interface
icons. Decorative icons are hidden from assistive technology; icon-only buttons
have an accessible name and tooltip visible on keyboard focus as well as hover.
Color never replaces labels, shape distinctions or status text.

Reuse Button/IconButton, Input/Textarea/Select, Dialog/Sheet, Avatar, PageHeader,
status labels and semantic helpers. Implement missing menu/tooltip/detail-panel
variants on the existing foundation when needed. A diagram of future primitives
does not authorize speculative component infrastructure.

## Focus, motion and state visuals

Use a visible 2px focus ring with separation from the control edge, including
menus, canvas tools, text links and swatches. Do not remove outlines without a
replacement. Selected/pressed/current states need semantic attributes as well as
visual indicators. Errors combine plain language, icon where useful and field
association. An unread dot or status badge needs an accessible text equivalent.

Keep normal transitions 120–180ms. Show navigation acknowledgement immediately;
never animate fake workflow stages. Honor `prefers-reduced-motion` with static
skeletons and immediate panel/viewport changes. Existing reduced-motion support
is retained. Layout shifts must not move the active action under the pointer.

## Visual acceptance in implementation

Review shared primitives first, then Home, Tasks, auth, Studio, Research,
Settings and both Board list/editor. Verify light/dark, keyboard focus, high zoom,
320px reflow and touch targets. Test actual text/surface pairs; no extracted
reference token is automatically accessible. Numeric values above are proposed
implementation targets, not proof of current compliance.
