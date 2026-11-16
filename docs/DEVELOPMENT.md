# Development and verification

Use Node.js 24 LTS and `npm ci`. Root scripts run worker/web tasks sequentially;
the release workflow uses one job. Keep `.env.local`, `.release-qa`, `.next`,
browser profiles, reports and screenshots out of commits. Public product media
is reviewed separately before being copied into `docs/media/`.

```sh
npm run lint
npm run typecheck
npm test
npm run test:db:isolated
npm run test:db:upgrade
npm run build
npm run format:check
npm run docs:check
npm run audit:licenses:check
```

`test:db:isolated` creates an empty in-memory PGlite PostgreSQL database, loads
real pgcrypto/pgTAP, bootstraps minimal Supabase platform schemas, applies every
migration unchanged and runs every SQL suite. It reads no environment file and
cannot reach hosted Supabase. No crypto stubs, policy bypasses or public privilege
aliases are used. The bootstrap is a test fixture, not an application backend.
Run an individual SQL suite by appending its exact filename.

`test:db:upgrade` creates the relevant pre-integration schema, inserts a fictional
organization/task, applies the remaining forward migrations and verifies the
records and authenticated-owner read survive. It discards the whole in-memory
instance afterward, without deleting data from any existing database.

Native platform verification remains a separate gate:

```sh
npx --no-install supabase start
npm run test:db
```

The GitHub workflow initializes a fresh native Supabase stack on its isolated
Linux runner, tests migrations/RLS, seeds fictional data, builds and runs browser
smoke checks, and stops only that job's stack. No hosted project/token or repository
secret is required. Remote execution is pending until a separately authorized
branch push; inspecting a workflow is not evidence that it ran.

## Browser tests

```sh
npx --no-install playwright install chromium firefox webkit
npm run test:e2e
```

Use only an explicitly created fictional demo. Keep workers at one; engines are
recorded separately. Automated semantic/keyboard checks are not manual NVDA or
WCAG certification. Physical-device/engine limitations belong in the release audit.
Full local authenticated Supabase validation is pending on the current Windows
machine by owner instruction; do not enable WSL/virtualization to bypass that limit.

## Security and supply chain

`npm run audit:secrets` installs checksum-verified Gitleaks 8.30.1 in ignored QA
storage and scans all reachable Git history with fully redacted output. Run a
separate current-tree/private-data review too. Never publish an unredacted report.

Run `npm audit --audit-level=high`; this still reports lower-severity findings.
`npm run audit:secrets:tree` scans an export of Git-visible candidate files,
including current changes and new files, while excluding ignored environments
and QA artifacts. It complements the complete reachable-history scan.
Known development-only moderate findings and their reachability are documented
in the release audit. Do not use `--force` or silently ignore runtime advisories.
Regenerate/review the dependency/font license inventory after lockfile changes.

Legacy engineering Markdown formatting is retained. `docs:check` separately checks
public Markdown formatting and repository-relative links, so the legacy Markdown
ignore does not hide new public documentation errors. New code uses shared UI,
strict schemas and permanent authorization tests. See [CONTRIBUTING.md](../CONTRIBUTING.md).
