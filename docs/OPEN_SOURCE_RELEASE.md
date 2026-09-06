# Open-source release guide

This document prepares Stylus for a future public release. It does not authorize
changing repository visibility, publishing a tag, or creating a GitHub release.
Visibility must remain private until a maintainer completes every applicable
manual gate and reviews the final audit.

## Audit snapshot

Audit date: 2026-09-06

Audited base: `origin/main` at `5b7e76a0fe6a4e80f17e14c04b119a84b43668a9`

Required production merge: `8b8d39990ebfcb4fe58debcdb41ece04090dd00c` is reachable from the audited base

Repository license: Apache-2.0

### Refs and reachable history

- No tags existed at audit time.
- All 25 historical local task/roadmap branches and all 24 remote task/roadmap
  branches were ancestors of `origin/main`; none contained a unique commit.
- Git contained 88 reachable base commits: 64 non-merge commits and 24 merge
  commits.
- The audit branch was created directly from the fetched `origin/main`.
- Git author metadata includes the maintainer identity and email recorded in
  commits. It was not treated as accidental file content and was not rewritten.

No branch was deleted and history was not rewritten. Re-run the ref and history
audit immediately before changing visibility because new refs may have appeared.

### Secret and confidential-data audit

- Gitleaks 8.30.1 Windows x64 was downloaded temporarily from its official
  release, verified against the published SHA-256 checksum, and used with full
  redaction.
- The tracked base tree produced zero findings.
- The complete final candidate tree, including new uncommitted release files,
  produced zero findings before commit.
- Gitleaks history mode with explicit all-ref/full-history merge-diff options
  scanned all 88 reachable base commits and produced zero findings.
- Independent high-signal key/JWT/private-key/database-URL searches produced no
  matches. Historical sensitive-filename review found only `.env.example`.
- `.env.example` contains localhost defaults and empty/placeholding optional
  secrets. The three `NEXT_PUBLIC_*` values are intentionally browser-safe;
  provider, service-role, Cron, Reddit, Tavily, and worker credentials are
  server-only or worker-local.
- Test identities use reserved `example.test`/`example.com` addresses and
  deterministic fixture UUIDs. No customer data, phone number, postal address,
  private deployment URL, or production project identifier was identified.

Generated scanner reports and the scanner binary are temporary audit material
and must never be committed. Repeat both current-tree and full-history scans
after all release changes and immediately before publication.

### Web Agency boundary

The repository contains only architectural statements that the separate Web
Agency is deferred and that its memory domain is isolated. It contains no Agency
source tree, endpoint, credential, customer data, integration contract, or
private strategy. TASK-019 remains deferred.

### Dependency licenses

The lockfile audit covered 666 installed-package entries. License metadata was:

| SPDX/license metadata | Count | Assessment |
| --- | ---: | --- |
| MIT / MIT-0 | 525 | Permissive |
| Apache-2.0 | 39 | Permissive |
| ISC | 32 | Permissive |
| BSD-2-Clause / BSD-3-Clause / 0BSD | 20 | Permissive |
| BlueOak-1.0.0 / CC0-1.0 / Python-2.0 | 7 | Permissive |
| MPL-2.0 | 25 | File-level copyleft transitive dependencies |
| LGPL-3.0-or-later or composite metadata containing it | 14 | Optional platform `sharp`/libvips packages |
| CC-BY-4.0 | 1 | `caniuse-lite` data package |
| Missing | 3 | Internal private Stylus workspaces, covered by the root license |

No GPL, AGPL, SSPL, BSL/BUSL, proprietary, or unknown external dependency was
found in `package-lock.json`. The MPL/LGPL/CC-BY entries are separately licensed
transitive packages installed from npm; their source is not copied into this
repository and Apache-2.0 does not relicense them. If a future binary/container
distribution bundles dependency files, generate and ship the licenses and
attributions required by that exact artifact before release.

Apache NOTICE obligations were not identified in material redistributed by the
current source repository.

**NOTICE FILE: NOT REQUIRED FOR CURRENT DISTRIBUTION.**

`CODE_OF_CONDUCT.md` is adapted from Contributor Covenant 2.1 and retains its
required attribution and CC BY 4.0 license link. It is not relicensed by the
repository's Apache-2.0 license.

### Assets and branding

The only committed media are:

- `assets/brand/stylus-logo-source.png`, whose embedded C2PA provenance identifies
  OpenAI Media Service, `gpt-image` 2.0, and trained-algorithmic media; and
- `apps/web/public/brand/stylus-mark.png`, a derived runtime mark introduced in
  the same commit.

No bundled fonts, Figma exports, screenshots, stock images, sample videos,
transcripts, model weights, FFmpeg/whisper.cpp binaries, or third-party logos
were found. `TRADEMARKS.md` distinguishes software licensing from project-name
and logo use without claiming a registered trademark.

If maintainers replace or add an asset, they must record its creator/source,
license or permission, modifications, and redistribution terms before commit.

## Public CI design

`.github/workflows/ci.yml` uses a read-only token and no repository secrets. The
application job runs `npm ci`, formatting, lint, worker/web typechecks, worker/web
tests, both production builds, and a tracked-diff check on Ubuntu with Node
20.19.0. It supplies only localhost/browser-safe placeholder configuration and
makes no paid AI, research, worker, or hosted Supabase call.

The database job starts an isolated local Supabase stack on the GitHub-hosted
runner, rebuilds it exclusively from repository migrations, runs schema lint and
all pgTAP suites, and stops the stack even after failure. It uses no production
project, link, service-role credential, or hosted mutation.

CI must pass on the release pull request before publication. A local machine
without Docker can validate application gates but cannot substitute for the
database job.

## Self-hosting path

An external contributor can set up Stylus without StyBay infrastructure,
private repositories, Codex, a paid model API, or a developer laptop:

```bash
git clone https://github.com/AwesomeWiz/stylus.git
cd stylus
npm ci
npx supabase start
npx supabase db reset
cp .env.example apps/web/.env.local
npm run dev
```

Use the local Supabase URL and publishable key in `apps/web/.env.local`. The core
application starts with AI, Reddit, Tavily, and the Windows worker unconfigured.
Tests use the fake model provider and builds make no live external calls.

For verification:

```bash
npm run verify
npm run db:lint
npm run test:db
```

See [README](../README.md), [Deployment](DEPLOYMENT.md), and
[Windows Worker](WINDOWS_WORKER.md) for details.

## Public demo and screenshot rules

The initial repository does not include product screenshots. Capture them
manually only from a disposable demo organization using fictional names, email
addresses, campaigns, competitors, research, metrics, and timestamps. Do not
show production IDs, real teammates, private StyBay plans, provider output,
credentials, internal URLs, or browser/account chrome containing personal data.

Recommended future captures are Home, Tasks, Whiteboards, Marketing Overview,
Creative Studio, Ask Council, Research, and dark mode. Store approved images in
`docs/assets/screenshots/` and record their creator/source and permission.

## Recommended contribution flow

```text
fork or focused branch
  -> pull request
  -> public CI
  -> maintainer review
  -> merge
```

External contributors do not need direct push access. Direct public writes to
`main` should not be allowed. Contributions are licensed under Apache-2.0 as
described in `CONTRIBUTING.md`; no mandatory DCO bot or CLA is configured.

## Manual GitHub settings before public release

Do not mark an item complete unless it has been verified in repository settings.

- [ ] Keep repository visibility **PRIVATE** until final approval.
- [ ] Enable Issues.
- [ ] Enable Private Vulnerability Reporting and verify **Report a vulnerability** is visible.
- [ ] Enable Dependabot alerts.
- [ ] Enable Dependabot security updates.
- [ ] Enable secret scanning.
- [ ] Enable push protection if available for the repository plan.
- [ ] Enable GitHub Actions and approve the repository workflow.
- [ ] Add a `main` ruleset or branch protection.
- [ ] Require a pull request before merge.
- [ ] Require the application and local-Supabase CI checks.
- [ ] Require conversation resolution where appropriate.
- [ ] Block force pushes to `main`.
- [ ] Block deletion of `main`.
- [ ] Confirm `.github/CODEOWNERS` resolves to the active maintainer account.
- [ ] Verify the security and conduct-reporting routes from a non-owner account.

These settings are recommendations that use standard GitHub repository
features. Do not configure a required control that is unavailable on the chosen
plan; document and approve an equivalent control instead.

## Initial release recommendation

Recommended tag: `v0.5.0`. The product is substantial, but the public API and
feature set are still evolving and do not represent a stable v1 commitment. The
private npm workspace version remains `0.1.0` until maintainers deliberately
adopt a package-versioning policy.

### Draft: Stylus v0.5.0 — Initial Open Source Release

Stylus is an open-source operating system for startup teams. The initial release
includes organizations and RBAC, tasks, notifications and activity,
collaborative whiteboards, Company Knowledge and explicit memory, a trusted
plugin platform, provider-neutral AI infrastructure, durable jobs, and an
optional outbound Windows worker.

The first business plugin, Marketing, includes campaigns and Reel Ideas,
competitor intelligence, bounded external research, Creative Studio, Strategic
Review, Ask Council, and deterministic Performance Learning. Social-platform
transports are not active; they remain deferred until official access and data
lifecycle requirements are satisfied.

Do not create the tag or GitHub release as part of repository-readiness work.

## Public release checklist

### Code

- [ ] `main` contains the intended release commit.
- [ ] Application and database CI pass from a clean checkout.
- [ ] Production builds pass.
- [ ] The intended migration set is complete and no migration is pending.

### Security

- [ ] Current-tree secret scan is clean.
- [ ] Full reachable-history secret scan is clean.
- [ ] No private or customer data is present.
- [ ] Every leaked credential, if any, has been rotated.
- [ ] History was rewritten only with explicit approval if a leak required it.

### Legal and rights

- [ ] Apache-2.0 `LICENSE` is present and metadata is consistent.
- [ ] Third-party dependency licenses were reviewed for the exact release.
- [ ] Every shipped asset has recorded redistribution provenance.
- [ ] The trademark/branding notice was reviewed.

### Community

- [ ] `CONTRIBUTING.md` is current.
- [ ] `CODE_OF_CONDUCT.md` has a working private reporting route.
- [ ] `.github/SECURITY.md` has a working private reporting route.
- [ ] Issue templates and the pull request template render correctly.
- [ ] `SUPPORT.md` reflects the supported deployment surface.

### GitHub

- [ ] CI is green on the release candidate.
- [ ] Branch protection or a ruleset protects `main`.
- [ ] Secret scanning and push protection are enabled where available.
- [ ] Private Vulnerability Reporting is enabled.
- [ ] Issues and Dependabot are enabled.

### Release

- [ ] Any screenshots use reviewed fictional demo data.
- [ ] README links and public claims received a final review.
- [ ] The initial tag and release notes were approved.
- [ ] Repository visibility is changed only after every preceding gate passes.
