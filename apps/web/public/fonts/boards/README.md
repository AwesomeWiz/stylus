# Board content fonts

The application UI keeps its existing Geist font. Board text can additionally
use Lora or Geist Mono. This deliberately small set covers sans, serif and
monospace without loading six similar families.

| Asset | Bytes | Supplied styles |
| --- | ---: | --- |
| `lora.woff2` | 37,788 | Normal, variable weight 400–700 |
| `lora-italic.woff2` | 40,772 | True italic, variable weight 400–700 |
| `geist-mono.woff2` | 23,128 | Normal, variable weight 100–900 |

The controls expose weights 400/500/600/700. Synthetic styles are disabled;
italic is offered for Lora only. Files are Latin subsets, self-hosted unchanged
from the official Google Fonts distribution. Other scripts use system fallback.
There is no runtime CDN request or font package dependency. The editor-only CSS
uses `font-display: swap`, with no preload: a face downloads when actual Board
content uses it. Auto-height measurement loads only the selected face.

[Lora upstream](https://github.com/google/fonts/tree/main/ofl/lora) and
[Geist upstream](https://github.com/vercel/geist-font) supply open fonts under the
SIL Open Font License. The accompanying `lora-OFL.txt` and `geist-mono-OFL.txt`
retain their license notices. `sources.json` records exact download URLs,
retrieval date, byte sizes and SHA-256 hashes.
