# Contributing to Stylus

Start with the [public documentation](docs/README.md) and
[self-host guide](docs/SELF_HOSTING.md). For implementation changes, also read
[AGENTS.md](AGENTS.md), the current project state and the relevant architecture
and tests. Keep changes focused; discuss a new business module before building it.

## Development and review

Use Node.js 24 LTS and `npm ci`. Run a local Supabase stack for authenticated work;
do not use a shared or production database for tests. Never commit environment
files, credentials, real tenant content or browser profiles. Follow the documented
checks in [development](docs/DEVELOPMENT.md) and include relevant validation in
your pull request. Keep schema changes forward-only and preserve existing tests.

Core may use only public plugin interfaces. Preserve server authorization, RLS,
organization isolation and company/marketing/agency memory boundaries. Working
notes, Boards, Tasks and drafts never become Company Knowledge automatically.

## AI assistance

AI-assisted contributions are welcome. You remain responsible for understanding
and reviewing the change, testing it, explaining its behavior and responding to
review. Disclose material assistance when useful to a reviewer. Do not submit
unreviewed bulk-generated changes; maintainers may close them and invite a smaller,
reviewed contribution. These expectations apply equally to all contributors.

## Copyright and license

Contributors retain copyright in their contributions. Unless separately agreed
in writing, contributions are offered under the project's AGPL-3.0-only license:
inbound equals outbound. Include provenance and preserve third-party notices.
There is no copyright assignment, CLA or mandatory DCO sign-off in this project.

This policy does not grant blanket permission to relicense other contributors'
work. Any future commercial/dual-licensing plan requires an ownership/permissions
review and appropriate legal advice; it is not promised by contributing today.

## Useful starting points

Reproduce an existing issue before proposing a fix. Suitable small contributions
include improving a confusing self-host troubleshooting step, adding keyboard
coverage for an existing menu, or documenting an observed browser limitation.
Tenant authorization, migrations and credential handling require experienced
review and are not beginner tasks. See [support](SUPPORT.md) and our
[code of conduct](CODE_OF_CONDUCT.md).
