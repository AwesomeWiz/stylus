# Stylus — Design System V2

Status: Shared brand, typography and auth identity implemented in REDESIGN-004.1
(2026-11-03). Feature-specific V2 targets remain subject to their delivery phase.

[Product Experience](STYLUS_V2_PRODUCT_EXPERIENCE.md) owns feature direction,
route placement and implementation scope. This document owns shared visual
rules. [UI Patterns](UI_PATTERNS.md) owns interaction and state behavior.

## Identity and visual hierarchy

**Calm where people work. Expressive where the product speaks.** Cobalt
`#4F5BD5` supersedes canonical cyan. Home, Tasks, Settings, navigation, inspectors
and reading surfaces remain neutral. Expressive authentication, template previews
and selected editorial moments use the supporting palette purposefully. Features
do not receive permanent colors. User-authored Board content and collaborator
identity keep their separate systems. See [Brand](BRAND.md) and ADR-044.

Use the exact approved blue–coral artwork in `assets/brand/`, served from
`apps/web/public/brand/`. Auth and expanded navigation use theme-specific full
wordmarks; collapsed navigation and compact contexts use the mark. No CSS tinting.

Auth is a full-height architectural tile field with one concise content card.
Its decorative client wrapper adds bounded local lift, tilt and directional
light/shadow in finite animation-frame bursts. Static server-rendered geometry
remains complete without JavaScript, on smaller/coarse-pointer screens and with
reduced motion. No WebGL, external artwork or graphics library is required.

Reuse semantic tokens in `apps/web/src/app/globals.css`, current UI primitives
and Radix foundations. Geist is self-hosted with its original redistribution
license; no runtime font CDN or new component library.

## Color and theme

Directional normal-application balance: about 90% neutral surfaces, 7% primary
accent, 3% semantic/status. These are qualitative review proportions; user images,
intentional board objects and collaborator identity are not chrome color quotas.

| Role                   | V2 rule                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Brand                  | `--brand: #4F5BD5`; approved artwork remains unchanged                                                                              |
| Filled primary action  | Light `#4F5BD5` / white; dark `#A1AAFF` / `#171B35`. Hover and active have tested separate values                                   |
| Hover/active           | Retain derived primary state tokens; do not hard-code page colors                                                                   |
| Selection/current area | Small primary indicator or subtle cobalt surface plus text/weight; not an entire colored page section                               |
| Page/chrome            | Existing `background`, `sidebar`, `card`, `muted`, `popover`, foreground and border tokens; keep chroma low                         |
| Status                 | Success, warning, destructive and information tokens with a text/icon label; unknown is neutral                                     |
| Specialist identity    | Existing centralized Lucide mapping plus name/status. Remove reliance on unique specialist-colored reading blocks                   |
| Human identity         | Preserve tested eight-family active-set collaborator allocation, including avatar/cursor/name agreement and multi-tab deduplication |
| Editorial accent       | Rare, small callout only when meaning is explicit; no per-feature/index pastel assignment                                           |

Normal text contrast must be at least 4.5:1; large text and meaningful non-text
controls at least 3:1. Brand artwork colors do not automatically qualify as button fills.
Do not assume muted labels, skeletons, disabled controls or board objects inherit
safe contrast from the page. Keep focus rings visible against adjacent surfaces.

Retain Light/Dark/System using existing device-local `stylus-theme`, pre-hydration
resolution and system preference listener. No organization database setting.
Every new semantic pair must be reviewed in both themes. Never apply a dark-mode
filter to user images. Canvas content colors preserve authorship while editing
controls and text equivalents remain accessible.

Earlier guidance recommending one or two pastel section blocks per page is
superseded. Legacy pastel names are compatibility aliases derived from the approved supporting palette; stop assigning them as
default structure in each phase. Collaborator palettes and meaningful semantic
colors remain. See ADR-040 in [Decisions](DECISIONS.md).

### Resolved palette

| Role                      | Light                             | Dark                              |
| ------------------------- | --------------------------------- | --------------------------------- |
| Canvas / surface / raised | `#F7F6F2` / `#FFFFFF` / `#F0EFEB` | `#111216` / `#191B20` / `#202228` |
| Ink / muted               | `#191A1D` / `#66676E`             | `#F4F3EF` / `#A1A3AB`             |
| Divider / control border  | `#DDDCD7` / `#85858B`             | `#303238` / `#737680`             |
| Cobalt artwork            | `#4F5BD5`                         | `#4652AE`                         |
| Apricot / mint            | `#F49372` / `#69C5A5`             | `#B87560` / `#528C77`             |
| Butter / sky              | `#EFCB68` / `#72ACD5`             | `#B49A5D` / `#547F9F`             |

Supporting colors are optional artwork/editorial fills, never unlabeled state.
Success/warning/destructive/information use independent semantic tokens. Dividers
are decorative; input boundaries and focus rings meet 3:1 against adjacent
neutral surfaces. Dark primary is tuned for readable text and controls rather
than using white text on a light blue fill.

## Typography

Use self-hosted Geist variable Sans (100–900 available, body 400, labels 500,
headings 600) with ui-sans-serif/system-ui fallbacks. The unmodified WOFF2 and
SIL OFL 1.1 license come from Vercel's official `geist@1.7.0` package. Font
loading uses a same-origin preload and `font-display: swap`. No Mono download
is needed; existing technical code retains system monospace. Express sizes in
rem at a 16px browser default and respect scaling. Short headings use tight
tracking; body and metadata track normally. Auth alone has expressive headline
type. No giant marketing type in work surfaces.

| Token/role                 | Size / line height     | Weight           | Application                                                                       |
| -------------------------- | ---------------------- | ---------------- | --------------------------------------------------------------------------------- |
| Page title                 | 24 / 32px              | 600              | Home, Tasks, Settings and normal area titles                                      |
| Workspace title            | 20 / 28px              | 600              | Active Studio artifact or workspace heading                                       |
| Section title              | 16 / 24px              | 600              | Attention, evidence, production sections                                          |
| Body / long-form AI output | 15 / 24px              | 400              | Main prose, reviewed findings and production brief                                |
| Dense list / table body    | 14 / 20px              | 400; title 500   | Task rows, research lists and database-like views                                 |
| Form label / control       | 14 / 20px              | 500 / 400        | Explicit labels and control content; inputs become 16px on mobile                 |
| Metadata / table header    | 12 / 18px              | 400 / 500        | Dates, evidence provenance, secondary labels; no essential instruction below 12px |
| Canvas object label        | 16 / 24px at 100% zoom | 400; section 600 | Defaults for new objects; preserve authored styles                                |
| Board header title         | 14 / 20px              | 600              | Compact chrome, independent of canvas zoom                                        |

Use 72ch maximum reading width for prose and reviews; Studio's inspector is
metadata, not the primary place to read an entire report. Structure AI content
with headings, short paragraphs, findings, citations and uncertainty. Use the
same hierarchy as human content. No AI-specific font, tiny disclosures, raw JSON
wall or giant specialist headings. Numeric metadata may use tabular numerals.

Board-authored content has a narrow REDESIGN-004.3 exception to application
typography: the existing Geist plus licensed self-hosted Lora and Geist Mono.
Only used faces download; real weights and Lora italic are explicit and
synthetic styling is disabled. This does not change chrome, Auth or global
brand tokens. See [font sources](../apps/web/public/fonts/boards/README.md).

## Spacing and geometry

Use the 8px-derived scale `4, 8, 12, 16, 24, 32, 40, 48, 64`. The 4px and 12px
subdivisions serve dense label/icon relationships, not arbitrary page margins.

| Context                        | Canonical target                                                         |
| ------------------------------ | ------------------------------------------------------------------------ |
| Desktop shell                  | 224px expanded sidebar, 56px collapsed; 48px topbar                      |
| Page margin                    | 24px desktop/tablet; 16px mobile                                         |
| Main section separation        | 32px; 16px between related subsections                                   |
| Page header to toolbar/content | 24px; 8px title-to-description                                           |
| Standard control               | 40px minimum target/height; 44px on touch; 16px icons, 20px where needed |
| Dense list row                 | 48px minimum; content may wrap; 12–16px horizontal padding               |
| Content card                   | 16px padding; 24px for substantive isolated forms                        |
| Dialog/drawer                  | 24px padding desktop; 16px mobile; 16px field gap                        |
| Task detail                    | 480px desktop target, viewport-bounded; full-screen mobile               |
| Context inspector              | 320px Board slot; 288px Studio slot; single optional right panel         |
| Canvas toolbar/control offset  | 16px from edges plus safe-area inset; 8px control-group gap              |
| Board header                   | 48px minimum; wraps/uses overflow before hiding essential save state     |

At desktop (>=1200px), normal overview/settings content caps at 1200px, while
operational lists use available width. Prose caps at 72ch. Studio can use the
available workspace width; canvas has neither page margins nor a reading cap.
At tablet (768–1199px) collapse global navigation as needed; below 768px use a
navigation drawer and focused single-pane work. Do not shrink text to force the
desktop grid onto a phone. Full responsive behavior is in the product spec.

## Surfaces, borders, radius and elevation

Prefer page sections and dividers to a container around every section. Neutral
surface differences express hierarchy; cards group distinct objects or actions.

| Primitive       | Rule                                                                             |
| --------------- | -------------------------------------------------------------------------------- |
| App surface     | Neutral background, flat                                                         |
| Sidebar/topbar  | Neutral, opaque; one subtle dividing border                                      |
| List/table      | Neutral content surface or direct page content, subtle row separators            |
| Card            | Neutral, 1px semantic border, no decorative shadow                               |
| Popover/menu    | Neutral overlay with border and one subtle shadow if needed                      |
| Dialog/drawer   | Neutral, border, restrained overlay/shadow; no floating marketing card treatment |
| Canvas controls | Neutral opaque groups above canvas; border and minimal separation shadow only    |

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
