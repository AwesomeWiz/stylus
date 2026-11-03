# Stylus brand identity

REDESIGN-004.1 · 2026-11-03.

**Calm where people work. Expressive where the product speaks.**

Cobalt `#4F5BD5` is the canonical brand primary, superseding cyan `#0D98BA`.
Home, Tasks, Boards chrome, navigation and reading surfaces stay neutral. Auth,
small template diagrams and intentional editorial moments may use supporting
apricot, mint, butter and sky. Semantic state and collaborator identity remain
separate systems. [Design System](DESIGN_SYSTEM.md) owns resolved theme values.

## Approved assets

The user-selected blue–coral emblem and original wordmark are final artwork.
No replacement logo, CSS tint, filter or synthetic text wordmark is used.
The original checkout's supplied package was copied unchanged into this task.

| Purpose                   | Canonical source                                  | Runtime export                                       |
| ------------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| Full logo, light surfaces | `assets/brand/logos/stylus-logo.png`              | `apps/web/public/brand/stylus-logo.png`              |
| Full logo, dark surfaces  | `assets/brand/logos/stylus-logo-light.png`        | `apps/web/public/brand/stylus-logo-light.png`        |
| Compact mark              | `assets/brand/marks/stylus-mark.png`              | `apps/web/public/brand/stylus-mark.png`              |
| Monochrome dark/light     | `assets/brand/marks/stylus-mark-{dark,light}.png` | `apps/web/public/brand/stylus-mark-{dark,light}.png` |
| Favicon                   | `assets/brand/icons/stylus-icon-32.png`           | `apps/web/public/brand/favicon-32.png`               |
| Apple icon                | `assets/brand/icons/stylus-icon-180.png`          | `apps/web/public/brand/apple-touch-icon.png`         |
| App icons                 | `assets/brand/icons/stylus-icon-{192,512}.png`    | `apps/web/public/brand/stylus-icon-{192,512}.png`    |

`assets/brand/source/stylus-logo-source.png` is the supplied source. The older
`assets/brand/stylus-logo-source.png` remains a historical, inactive asset; no
application reference uses it. Do not modify the supplied files to match tokens.
BrandLogo centralizes mark/full-logo usage. The supplied runtime color mark is a 512px export of the 1024px master; it is
kept byte-identical to the user package. Both wordmarks have identical reserved
geometry; the pre-hydration `.dark` class selects the correct image without an
account fetch or layout shift. Auth uses the full logo; collapsed navigation uses
the mark. Full logos have empty alt text inside an explicitly named home link.

## Typeface provenance

Geist variable Sans is copied unmodified from Vercel's official `geist@1.7.0`
package, `dist/fonts/geist-sans/Geist-Variable.woff2` (69,436 bytes). Sources:
[Vercel's repository](https://github.com/vercel/geist-font) and
[official font page](https://vercel.com/font). Copyright belongs to Vercel in
collaboration with basement.studio. The full SIL Open Font License 1.1 is retained
at `apps/web/public/fonts/geist/LICENSE.txt` beside the font.

SHA-256: `e24cec106619c03f0b3519e31b9bc55e0d5e926b6a95b8d798cd8cef215b1505`.

Only the exact font and license URLs are excluded from the session proxy;
private routes and similarly named paths remain protected.

A same-origin preload and CSS `@font-face` serve the font without an external
runtime request or package dependency. `font-display: swap` and system fallbacks
keep text available. Body remains 400, labels 500 and headings 600 with normal
body tracking. Only the auth editorial headline uses 550 and tighter tracking.
Existing code/technical metadata uses system monospace; no unused Mono font ships.

## Authentication artwork

An original architectural field fills the entire left panel: cobalt planes,
warm paper, one apricot region, smaller mint/butter/sky accents and shaped tile
corners. One opaque content card carries the proposition. There are no dashboard
mockups, fake statistics, neon effects or generative imagery. Dark artwork has
its own deep cobalt, charcoal, muted coral/mint and warm highlight tokens.

Deterministic geometry is rendered before interaction. A small client wrapper
updates CSS variables through refs and requestAnimationFrame; pointer movement
never rerenders React children. Proximity has squared falloff across neighboring
tiles. Maximum nominal response is 24px Z lift, 3px lateral motion and 7 degrees
of tilt; directional shadow/light follows the same bounded influence. Exponential
easing settles and stops requesting frames. There is no ambient/idle loop.
Coordinates are ephemeral and never logged, persisted or transmitted.

Desktop fine pointers at 1200px or wider receive motion. Tablet is a static field;
below 768px the form leads with a three-piece static accent. Reduced motion,
coarse pointers, missing media-query support and hidden documents keep/reset the
static composition. CSS independently suppresses transforms under those media
conditions. Cleanup removes listeners and cancels frames. WebGL, shader, canvas
and graphics libraries are not used; the form never depends on the artwork.

Artwork is aria-hidden with no focus stops or keyboard handlers. Card copy is
readable ordinary content. Form labels, autocomplete, confirmation, errors,
validation, safe `next` and auth actions are untouched. Redundant login/signup
subtitles and obvious Tasks/Boards descriptions were removed; Home retains the
organization name. Read-only, first-use, ordering, password and recovery guidance
remain. Focused setup/recovery/invitation descriptions remain available.

## Scope and next work

Tokens flow into existing Home/Tasks/Boards presentation. Template diagrams use
small primary/apricot accents only; persisted template/object colors and behavior
are unchanged. Shared button focus now uses a solid separated outline. Database,
RLS, auth provider, task rules, Board operations/Realtime/images and Marketing
workflows are unchanged. No worker or ModelGateway code changes.

REDESIGN-005 remains unstarted: public Core entity reference/resolver/opener and
creation contracts, fresh tenant/plugin/entity checks and exact versions, then
native insertion/conversion previews with idempotency and recovery. Prioritize
P0 integration before explicitly scoped comment resolution, visible votes and
reactions. Selection/context preview contracts grant no AI execution or memory
authority; new AI, follow/history and storyboard execution need bounded scope.

Verification results and limitations are recorded in [Project State](../PROJECT_STATE.md).
