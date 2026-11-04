# Board content fonts

The application UI keeps its existing Geist font. Board content has a curated
15-family library; this does not change the global UI typography.

| Category | Families | Exposed weights |
| --- | --- | --- |
| Sans | Geist, Manrope, Plus Jakarta Sans, Space Grotesk, DM Sans, Sora, Outfit | 400, 500, 600, 700 |
| Serif | Lora, Fraunces, Cormorant Garamond | 400, 500, 600, 700 |
| Serif | Libre Baskerville | 400, 700 |
| Display | Bebas Neue | 400 |
| Display | Playfair Display | 400, 500, 600, 700 |
| Monospace | Geist Mono, JetBrains Mono | 400, 500, 600, 700 |

Synthetic styles are disabled. True italic is available for Plus Jakarta Sans,
DM Sans, Lora, Fraunces, Libre Baskerville, Cormorant Garamond, Playfair Display
and JetBrains Mono. A family change chooses the nearest supported weight and
clears unsupported italic. Files are Latin subsets, self-hosted unchanged from
the official Google Fonts distribution. Other scripts use system fallback.
There is no runtime CDN request or font package dependency. The editor-only CSS
uses `font-display: swap`, with no preload: a face downloads when actual Board
content uses it. Auto-height measurement loads only the selected face. The
searchable picker previews a face only when it is already loaded; opening or
searching the picker does not request the whole library. The same variable
Libre Baskerville binary supplies its two exposed weights.

All families use the SIL Open Font License 1.1. Each additional family retains
its complete upstream notice in its adjacent `*-OFL.txt`; the existing Geist UI
license lives at `../geist/LICENSE.txt`. [Google Fonts upstream](https://github.com/google/fonts/tree/main/ofl)
and [Geist upstream](https://github.com/vercel/geist-font) provide the sources.
`sources.json` records exact distribution/CSS/license URLs, retrieval dates,
byte sizes and SHA-256 hashes. The permanent font-library test verifies those
assets against the manifest and checks that the CSS remains local and lazy.
