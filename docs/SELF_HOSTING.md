# Self-host Stylus

Use Node.js **24 LTS**, npm and the committed lockfile. `npm ci` is the supported
install path. A complete backend is Supabase: PostgreSQL, Auth, PostgREST, private
Storage and Realtime. PostgreSQL alone is not a drop-in application backend.
AI, GitHub/Google apps, a Windows worker and paid services are optional.

This is a beta. [Release verification](RELEASE_AUDIT.md) distinguishes executed
checks from pending ones. In particular, the complete Docker-dependent local
Supabase authenticated clean-install path is pending on the current Windows
validation machine. It must pass in a suitable environment before public release.
Do not enable virtualization features on an unstable machine just to run Stylus.

## Local development with Supabase

For supported-host clean-install release verification, configure CircleCI to read
[`.circleci/config.yml`](../.circleci/config.yml) directly. It uses a fresh Ubuntu
24.04 machine VM with direct Docker access, real local Supabase/Auth and all
repository migrations, SQL/RLS, JWT role, web/worker and browser gates. No hosted
backend or optional AI/GitHub/Google credentials are required. This is a native
CircleCI pipeline with **Docker-backed Supabase**, not Supabase's experimental
native runtime. The retained [GitHub workflow](../.github/workflows/ci.yml) is a
separate supported CI configuration. Native machine-run acceptance passes in
CircleCI #21 at `5c99aaea122338556d96703f0b32e90b6de4ed83`; see the exact
[gate evidence and remaining manual checks](RELEASE_AUDIT.md#final-native-acceptance--2026-11-16).
Seeded login/Core/browser workflows do not close the separate unexecuted
signup/organization/onboarding walkthrough above.

Docker-compatible containers are required by the pinned Supabase CLI's local
stack. Start Docker only on a machine where it is supported and working. The
following is the public setup path to validate in CI/a suitable development host:

```sh
git clone https://github.com/AwesomeWiz/stylus.git
cd stylus
npm ci
npx --no-install supabase start
node scripts/setup-local-env.mjs
npm run dev
```

The first local start initializes a new database and applies repository migrations;
downloads can take time. The setup helper reads **local** CLI status and writes
ignored `apps/web/.env.local` without printing keys. It refuses to overwrite an
existing environment file or use a non-loopback backend. Use `npm.cmd`/`npx.cmd`
in PowerShell if its execution policy blocks the `.ps1` npm launcher.

Open `http://localhost:3000`, sign up, create an organization and finish onboarding.
The development Auth configuration permits immediate signup without confirmation;
production must configure confirmation/SMTP as appropriate. The local mail inbox
and Studio URLs are shown by the CLI. Do not publish local keys or expose the
development stack to the internet.

Keep a consistent browser/site origin. The canonical origin comes from
`NEXT_PUBLIC_SITE_URL`; authentication confirmation and invitation returns must
match the deployment's Supabase Auth settings.

## Hosted Supabase development backend

Create a **new development project** if local containers are unavailable. Do not
copy another developer's backend or credentials. Configure Auth's site/redirect
URLs for your application origin. Copy `.env.example` to `apps/web/.env.local`
and replace only the required public Supabase/site values first.

Inspect migrations before applying them:

```sh
npx --no-install supabase login
npx --no-install supabase link --project-ref YOUR_PROJECT_REF
npx --no-install supabase migration list --linked
npx --no-install supabase db push --linked --dry-run
npx --no-install supabase db push --linked
```

Replace `YOUR_PROJECT_REF` with your development project reference. Login tokens
stay in the CLI's secure local configuration, never the repository. A dry run is
not a backup: inspect pending SQL and back up an existing installation first.
Never reset a shared/hosted database or rewrite applied migration files. An
upgrade from the pre-integration schema is covered by the isolated upgrade test;
complete hosted/native rollout verification remains the operator's responsibility.

## Environment

`.env.example` is the authoritative variable list, grouped by function with
required/optional and client/server exposure explained. Only the three
`NEXT_PUBLIC_*` values are browser configuration. Service-role, Cron, AI, provider
and encryption values are server-only. Never put secrets behind a `NEXT_PUBLIC_`
name or commit a real environment file.

`SUPABASE_SERVICE_ROLE_KEY` is optional for normal Core use. Configured integration
credential storage, worker broker and trusted server-side workflows require it.
It is required by the optional demo seeder so it can create fictional Auth users.
Do not give it to a browser or worker. Variables copied into a production browser
build are fixed at build time; rebuild after changing public backend/site values.

## Production

```sh
npm ci
npm run build
npm run start --workspace @stylus/web
```

Provide the actual deployment environment before building. Use TLS and a supported
Node runtime/process host, or a Next.js-compatible serverless host. Configure
Supabase Auth redirects and SMTP, verify private Storage and private Realtime
channels, review RLS/migrations, configure backups and test restoration. Do not
expose a service-role key, development mail service, Studio or a worker broker
without its intended authentication.

[Deployment operations](DEPLOYMENT.md) covers reminder/database Cron and bounded
serverless job scheduling. If serverless scheduling is enabled, generate a strong
server-only `CRON_SECRET` in the host secret store. Missing optional compute or
providers must leave Core useful; pending jobs remain queued.

If you modify Stylus and offer it over a network, review AGPL section 13 and provide
the corresponding source to those users. Publish the exact deployed source and
required notices, including third-party/native-library obligations. Configure a
clear source-code offer in your deployment; a link to an unrelated upstream version
is insufficient for a modified fork. Set `STYLUS_SOURCE_URL` to a public HTTPS URL
for the exact corresponding source; Settings exposes it to members. This is
operational guidance, not legal advice.

## Optional services

- **AI:** configure an existing ModelGateway adapter only when needed. Ollama is
  supported for an operator-reachable local deployment; an OpenAI-compatible
  endpoint is another option. No paid OpenAI account is required. Never expose
  a developer laptop's Ollama port publicly. See [AI architecture](AI.md).
- **Integrations:** a self-hoster creates deployment-level GitHub/Google apps once;
  normal users only connect/authorize that configured app. Exact permissions,
  callbacks and keyring setup are in [INTEGRATIONS.md](INTEGRATIONS.md). Google
  Drive's restricted metadata scope may require public-deployment verification.
- **Worker:** pair an optional Windows worker from Settings. Run `npm run worker:pair`,
  then `npm run worker:start`, and enter the origin/one-time code when prompted.
  Install media tools separately if needed; see [worker operations](WINDOWS_WORKER.md).
- **Demo:** never required at startup. See [fictional demo setup](DEMO.md).

## Troubleshooting

| Symptom                                              | Next step                                                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment validation fails                         | Check the three required public values in `apps/web/.env.local`; remove accidental whitespace and use actual backend values, not placeholders.                            |
| CLI local start cannot connect to Docker             | Use a supported container host or your own new hosted development backend. Isolated SQL tests do not require Docker, but do not replace authenticated application checks. |
| Setup helper refuses to overwrite                    | Preserve the existing file and update it manually; never overwrite another environment's secrets.                                                                         |
| Login returns to setup or waits for an administrator | Finish onboarding as OWNER/ADMIN; membership and current organization are checked on the server.                                                                          |
| Board save reports a missing column/function         | Inspect the exact migration ledger and pending forward SQL; do not reset the database.                                                                                    |
| Integration says setup is incomplete                 | Core can continue. The deployment operator configures the app/keyring once; end users should not create personal OAuth apps.                                              |
| Optional analysis stays queued                       | Check worker/provider availability and authorized Jobs diagnostics; keep the job identity for retry.                                                                      |
| Build/type imports refer to `.next/dev/types`        | Next regenerates `next-env.d.ts`; do not hand-edit or transfer generated development files between checkouts.                                                             |

For help, include version/commit and fictional reproduction steps; see
[SUPPORT.md](../SUPPORT.md). Never attach real environment files or private data.
