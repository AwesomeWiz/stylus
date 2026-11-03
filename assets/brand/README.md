# Stylus Brand Assets

Canonical source: the user-selected blue–coral Stylus logo.

## Assets

### Source

- `source/stylus-logo-source.png`
  - Untouched uploaded source.

### Full logo

- `logos/stylus-logo.png`
  - Full-color emblem + original dark wordmark for light backgrounds.
- `logos/stylus-logo-light.png`
  - Full-color emblem + white wordmark for dark backgrounds.

### Emblem / mark

- `marks/stylus-mark.png`
  - Full-color emblem on a transparent square canvas.
- `marks/stylus-mark-dark.png`
  - Monochrome charcoal mark.
- `marks/stylus-mark-light.png`
  - Monochrome white mark.

### Icons

Common square exports at:
32, 48, 64, 128, 180, 192, 256, and 512 px.

## Recommended product usage

- Light application chrome: `stylus-logo.png`
- Dark application chrome: `stylus-logo-light.png`
- Collapsed sidebar / favicon / app icon: `stylus-mark.png`
- Single-color contexts: monochrome mark variants

## Note

The selected source is raster artwork. These files preserve it faithfully.
No fake SVG wrappers are included. If a true vector master is required later,
rebuild/trace the approved mark deliberately in a vector editor.

## Runtime integration (REDESIGN-004.1)

See [brand usage](../../docs/BRAND.md) for the canonical mapping. The Next app
serves the supplied runtime exports unchanged from `apps/web/public/brand/`; root `public/` is not
its runtime asset directory. The historical root-level `stylus-logo-source.png`
is inactive. Canonical primary is cobalt `#4F5BD5`; the approved raster artwork
is preserved without CSS recoloring. Wordmarks switch through the root theme.
