# Stylus — Design System

## Design Direction

Stylus is a professional startup productivity application.

The interface should feel:

- modern
- restrained
- capable
- calm
- trustworthy
- efficient
- cohesive
- editorial
- human
- creatively confident

The UI should prioritize usability over visual novelty. Neutral structural
chrome should frame deliberate pastel section blocks, not a field of uniformly
boxed cards. Color communicates hierarchy, identity or meaning rather than
decoration.

---

# Inspiration

General product-quality direction may draw from professional tools such
as:

- Linear
- Notion
- Vercel
- modern project-management and developer tools

Do not directly copy another product.

---

# Icons

Use Lucide React.

Do not use emojis as UI icons.

Use consistent:

- icon size
- stroke weight
- alignment
- spacing

Icons should support comprehension rather than decoration.

---

# Color

Use:

- neutral application backgrounds
- one primary accent
- semantic colors for state

Semantic concepts:

Success:
completed/success

Warning:
deadline approaching / attention

Danger:
overdue / destructive / failure

Information:
active/in progress/informational

Do not create random per-page color schemes.

---

# Typography

Use a clean professional sans-serif interface font.

Maintain clear hierarchy between:

- page titles
- section titles
- body text
- metadata
- labels

Avoid oversized dashboard headings.

---

# Spacing

Use a consistent spacing scale.

Prefer an 8px-based rhythm where practical.

Do not arbitrarily choose spacing for individual screens.

---

# Borders and Shadows

Prefer subtle borders and surface hierarchy.

Use shadows sparingly.

Avoid large floating-card shadows throughout the application.

---

# Radius

Use restrained consistent corner radii.

Do not make every container heavily rounded.

---

# Layout

Desktop productivity layout:

- persistent sidebar
- top application controls
- page header
- main content area

Sidebar should support collapse.

Smaller screens should use responsive navigation/drawer behavior.

---

# Application Navigation

Planned primary navigation:

- Home
- Tasks
- Whiteboards
- Company Knowledge

Marketing section:

- Overview
- Reels
- Competitors
- Research
- Campaigns

Platform:

- AI
- Apps
- Team
- Settings

Navigation should use Lucide icons.

---

# Components

Prefer reusable components including:

- Button
- IconButton
- Input
- Textarea
- Select
- Checkbox
- Radio
- Switch
- Dialog
- Drawer
- Popover
- Tooltip
- DropdownMenu
- Tabs
- Table
- DataTable
- Badge
- Avatar
- PageHeader
- EmptyState
- LoadingState
- ErrorState
- SearchInput
- Sidebar
- Topbar
- Breadcrumb

---

# Interaction

Interactions should be:

- fast
- predictable
- keyboard accessible
- visually clear

Avoid unnecessary animation.

Animations that exist should communicate:

- state changes
- hierarchy
- movement
- feedback

not decoration.

---

# Accessibility

Require:

- keyboard navigation
- visible focus states
- semantic HTML
- ARIA where appropriate
- accessible contrast
- understandable error messages
- adequate target sizes

---

# Theme

The production theme supports:

- Light
- Dark
- System

The preference is device-local under `stylus-theme`; a pre-hydration document
script applies the resolved class to avoid a visible incorrect-theme flash.
System follows `prefers-color-scheme` changes.

The canonical Stylus brand color is `#0D98BA`. UI code consumes semantic tokens
(`primary`, hover/active/subtle/muted/border/foreground and ring) rather than
hard-coding the brand throughout components. Success, warning, destructive and
information colors are reserved for meaning and always retain text or icon
labels. The approved mark is stored at `assets/brand/stylus-logo-source.png`;
the optimized transparent web mark is `public/brand/stylus-mark.png`.

The shared semantic accent registry provides accessible cyan, violet, coral,
amber, green, blue, pink and indigo foreground/subtle/border combinations for
meaningful task, activity and Marketing specialist/status treatments. These
tokens have explicit light and dark values and do not replace text labels.

Whiteboard collaborators use a deterministic curated eight-family identity
palette: blue, coral, violet, amber, magenta, green, indigo and red. The active
set resolves preferred-color collisions to unused, widely separated families
while preserving existing assignments during joins and leaves. Compact initial
avatars and remote cursor/name labels consume the same canonical assignment,
so one trusted user keeps one visual identity across sessions and components.
Every label uses a tested foreground/background pair; names and initials remain
visible so color is never the only identity signal. The local avatar is
identified as `You`; overflow is summarized as `+N`, and the adjacent count
always means unique authenticated people currently on the board.

The canonical brand remains `#0D98BA`. In light mode, filled primary controls
use the derived `#087690` surface with white text for 5.24:1 normal-text
contrast; hover and active states darken further. Dark mode uses a brighter cyan
surface with a deep foreground. Disabled controls remain visibly disabled,
focus rings remain explicit, and compact icon controls retain 40px targets.

Editorial section tokens provide lilac, mint, cream, coral, pink, lime and
indigo surfaces with explicit foregrounds and borders in both themes. Use one
or two such surfaces to establish page rhythm, separated by neutral canvas;
never tint every card or use large saturated reading surfaces.

Shared Marketing record creation/editing uses the Radix-backed Dialog at mobile
through desktop widths. Creative surfaces use the centralized
`specialist-visuals.tsx` Lucide mapping; icons support, but never replace,
readable specialist names.

Theme support should use design tokens/CSS variables rather than
duplicated page styles.

---

# Prohibited UI Patterns

Avoid:

- emoji navigation
- excessive gradients
- glassmorphism-heavy layouts
- neon/glowing elements
- giant rounded cards
- huge headings
- random decorative illustrations
- unnecessary status pills
- excessive drop shadows
- arbitrary colors
- animation for decoration
