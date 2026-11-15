# Third-party licenses

Stylus original code is AGPL-3.0-only. Dependencies and bundled fonts retain their
own terms. This is a source-distribution compatibility review, not an assertion
that every future binary/image distribution automatically meets all obligations.

Run `npm run audit:licenses` after changing the lockfile, then review the diff.
CI checks that [the inventory](licenses/dependencies.json) matches the exact
lockfile and every shipped font binary. It includes development, runtime,
optional and other-platform package entries; it does not silently omit packages
that cannot be installed on the audit machine. Upstream package metadata is not
relicensed or edited to obtain a passing result.

## Reviewed expressions

| License family                                                | Components/obligations                                                                                                                                                                                                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MIT, MIT-0, ISC, BSD-2/3-Clause, 0BSD, BlueOak-1.0.0, CC0-1.0 | Preserve applicable copyright/license notices; compatible permissive source dependencies.                                                                                                                                                                           |
| Apache-2.0                                                    | Preserve licenses/required notices and modification notices where applicable. These dependencies remain Apache-licensed, although original Stylus code uses AGPL.                                                                                                   |
| Python-2.0                                                    | `argparse`; retain its license. This is the modern GPL-compatible Python license, not an unspecified historical Python release.                                                                                                                                     |
| MPL-2.0                                                       | `lightningcss` and its platform packages; development `axe-core`. Retain file-level notices and make modifications to covered files available under MPL. No covered files are modified here.                                                                        |
| LGPL-3.0-or-later and Apache/LGPL/MIT conjunctions            | Sharp native bundles and libvips. Retain all included notices; preserve users' ability to replace/relink covered libraries and fulfill corresponding-source obligations when distributing binaries. No native library is modified or vendored into this repository. |
| CC-BY-4.0                                                     | `caniuse-lite` data, derived from Can I Use by Alexis Deveria and contributors. Preserve attribution and license when redistributing the data.                                                                                                                      |
| OFL-1.1                                                       | All 15 Board/UI font families, with complete adjacent upstream notices. Fonts are separately licensed, not converted to AGPL.                                                                                                                                       |

The inventory contains no SSPL, BSL, proprietary or unknown/custom expression.
No standalone GPL/AGPL npm component is present; LGPL combinations are explicitly
reviewed above. PGlite's Apache-licensed package embeds PostgreSQL under its
permissive PostgreSQL License; pgcrypto is a PostgreSQL component. The pgTAP
extension retains upstream Artistic-2.0 terms alongside its Apache-licensed
PGlite wrapper. These development tools are not browser runtime dependencies.

Source installs obtain dependency license/source information from their exact
registry packages and upstream projects. Packaging a server, native worker or
container is a separate distribution: include dependency notices, the LGPL/GPL
texts and required corresponding-source/relink materials. Do not strip native
package license files or assume a compiled image has only Stylus's license.

## Fonts and assets

The machine inventory lists all 23 WOFF2 binaries. The Board manifest records
distribution URLs, byte sizes and SHA-256 hashes; the Geist UI font hash and
upstream source are recorded in [brand documentation](BRAND.md). These are
upstream Latin distributions, not custom modifications/subsets made by Stylus.
Each family's full OFL notice ships beside the font. Reserved-name and font-only
sale restrictions continue to apply.

Lucide icons retain ISC licensing; React Flow retains MIT licensing. Original
auth geometry, error-page SVG and template diagrams are project-authored code.
See [asset provenance](ASSET_PROVENANCE.md) for the maintainer-authorized brand,
fictional demo assets and captured UI media. Private design references are not
distributed. No third-party photograph, stock illustration or music is required.

Gitleaks 8.30.1 is a checksum-verified external MIT tool downloaded into ignored
QA storage. Playwright is Apache-2.0; downloaded browser/FFmpeg distributions
retain their own bundled notices and are not committed. Media encoding does not
redistribute the encoder. Recheck licensing before bundling any such executable.

## Sources and future licensing

Compatibility conclusions follow the [GNU license list](https://www.gnu.org/licenses/license-list.html),
[GNU compatibility guidance](https://www.gnu.org/licenses/license-compatibility.en.html),
[MPL FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/),
[Sharp licensing](https://sharp.pixelplumbing.com/install/#licensing),
[OFL FAQ](https://openfontlicense.org/ofl-faq/) and the actual upstream notices.
Canonical project text comes from the [SPDX AGPL-3.0-only text](https://github.com/spdx/license-list-data/blob/main/text/AGPL-3.0-only.txt).
There was no Apache project LICENSE at the accepted starting commit; the old
README explicitly recorded its absence. Historical third-party Apache notices
are retained. Future commercial/dual licensing needs a rights review and legal
advice; [contributor terms](../CONTRIBUTING.md) do not assign contributors' copyright.
