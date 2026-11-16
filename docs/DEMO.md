# Fictional evaluation workspace

The optional **Paper Orbit · Fictional demo** workspace demonstrates the real
operating loop. It is authored demo content, not a real startup or customer study.
Nothing is seeded at startup or during migrations.

It contains a company profile/team, Tasks and prerequisite, Milestone, working
Note, Board with native references, exact fictional Evidence, manual Research Note,
Hypothesis, Experiment, Campaign and reviewed Learning. Results explicitly describe
synthetic sessions. The Evidence fixture's research run is cancelled; it never
claims a successful provider/model execution. No external account, resource ID,
calendar event, personal address or real company data is used.

On your **local development backend**, after migrations and environment setup:

```sh
npm run demo:seed -- --confirm-demo-memory
```

This explicit command creates three fictional Auth users, one isolated organization
and its demo records. The optional flag confirms one fictional Learning's promotion
through the existing reviewed Memory RPC; no ordinary work is promoted implicitly.
The seeder needs the server-only service key for Auth setup and uses real
authenticated owner APIs for operational work. Immutable fictional research
fixtures use the supported Supabase CLI SQL workflow: the local stack must
already be running, or the explicitly selected development project must be
linked with the CLI authenticated. This avoids widening private grants or
enqueueing real research work merely to create demo content.
It invokes no model or external provider.

Organization verification uses the signed-in fictional owner's RLS read path,
not the Auth-administration client's table privileges. It selects the exact
recorded organization UUID and checks the returned UUID, creator UUID and name.
Cleanup signs in that same owner before performing the identical ownership
check; all account-ID, row-inventory and atomic deletion guards remain required.
`npm run test:demo` checks seed-through-verification and cleanup control flow with
synthetic transport/in-memory files. Actual organization RLS has separate SQL
coverage; these unit checks do not claim a complete live Supabase seed run.

Random credentials and exact record IDs are saved only in ignored
`.release-qa/demo.json`, never printed or committed. Use the first account to
sign in. Other accounts demonstrate MEMBER and VIEWER roles. Preserve this file
until you deliberately remove the fixture.

The command refuses a hosted backend unless an exact development project is
explicitly selected with `--allow-hosted-project=YOUR_PROJECT_REF`. Never use it
against an unapproved or production backend. A separate explicit environment file
can be supplied with `--env-file=PATH`; do not copy real credentials into docs.

```sh
npm run demo:cleanup
```

Cleanup checks the exact recorded backend, organization name/creator and account
ID/email pairs. It compares the complete primary-key/creator inventory of that
exact new organization with the recorded manifest and stops on a mismatch. It
calls the existing OWNER organization-deletion RPC, verifies all organization
rows are gone, removes only those fixture accounts and verifies each is absent.
It does not inventory existing tenants or discover/delete data by a loose name
prefix. Passwords are removed from the cleaned manifest. A partial seed retains
its manifest for review/guarded cleanup instead of silently creating another copy.

If setup stops, `npm run demo:seed -- --resume --confirm-demo-memory` resumes only
the same unfinished local fixture. Hosted resume and cleanup also require the
exact `--allow-hosted-project=YOUR_PROJECT_REF` flag. Account, organization and
cached row identities are rechecked; successful operations are reused. UUIDs are
journaled before RPC writes and immediately after returned inserts. Archive the
cleaned manifest before deliberately creating another fixture; it is never
silently overwritten.

Demo/media checks are separate from the required complete authenticated fresh
local-stack test. That Docker-dependent check remains pending on the current
Windows validation host; no seeding result substitutes for it.
