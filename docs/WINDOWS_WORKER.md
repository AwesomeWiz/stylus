# Stylus Windows Worker

TASK-012 adds an optional outbound Node.js worker for trusted
`EXTERNAL_WORKER` jobs. Stylus Core and DATABASE Cron jobs remain fully usable
while every Windows worker is offline.

## Architecture and credentials

The worker calls bounded `/api/worker/*` broker routes on the hosted Stylus web
application. It never receives a Supabase service-role key, user session, direct
table access, organization selector or arbitrary job definition. The broker's
server-only service key calls credential-validating PostgreSQL functions.

OWNER/ADMIN creates a 256-bit one-time pairing code on `/workers`. Only its
SHA-256 digest is stored. It expires after 15 minutes, is invalidated by a newer
request and is consumed atomically. Pairing returns one 256-bit durable bearer
credential once; PostgreSQL stores only its digest. Revocation invalidates it
immediately. Re-pair after revocation to rotate credentials.

The one-time display provides an explicit Copy control with short-lived success
or failure feedback. Copying is user initiated; the raw code is not placed in
browser storage and cannot be recovered by refreshing or revisiting the page.

The local config is `%LOCALAPPDATA%\Stylus\worker.json` (falling back to
`%APPDATA%` or the current user's `.stylus` directory). It contains the Stylus
URL, scoped worker/organization IDs, display name and credential—never service
keys or human passwords. Keep the Windows account protected; the file is
created user-local and must not be copied into the repository.

## Runtime

The worker advertises only the compiled `core.worker.echo` capability, polls
about every eight seconds, backs off to one minute on transient failures,
heartbeats when starting and through lease renewal, and runs one job at a time.
Idle claim polling throttles persisted worker-presence updates to at most once
per 30 seconds. ONLINE means `last_seen_at` is within 120 seconds. Revoked
workers lose all heartbeat, claim and lifecycle access; running work is
recovered through its TASK-011 lease after expiry.

Claims remain atomic with `FOR UPDATE SKIP LOCKED`, organization, execution
class, schedule, attempt, capability and concurrency checks. The worker renews a
60-second-or-shorter lease every 20 seconds. Cancellation uses the existing
`CANCEL_REQUESTED` state and cooperative AbortSignal. The diagnostic timeout is
30 seconds. A lost lease prevents completion.

Handlers are static code keyed by job type. There is no dynamic import, remote
code, `eval`, shell job, executable field or arbitrary command endpoint. Future
FFmpeg, browser, transcription or Ollama handlers must be compiled registrations
with schemas and controlled capabilities. TASK-012 downloads no binaries and
does not move ModelGateway routing.

## Windows setup

```powershell
npm.cmd install
npm.cmd run worker:pair
npm.cmd run worker:status
npm.cmd run worker:start
```

Enter the hosted Stylus origin (for example `https://stylus.example`) and the
one-time code. Use Ctrl+C for graceful shutdown. Remove only the local credential
with `node apps/worker/dist/cli.js logout`; revoke the server registration from
`/workers` whenever access must end.

For two-worker QA, use two Windows user accounts or set `LOCALAPPDATA` to two
separate temporary directories before pairing and starting each process. Never
share one credential between processes.

## Hosted requirements

- Apply `20260825001200_windows_workers.sql`.
- Configure `SUPABASE_SERVICE_ROLE_KEY` only in the hosted Next.js server.
- No Edge Function, pg_net, Cron change, inbound firewall rule or public laptop
  port is required.
- Keep existing DATABASE Cron enabled independently.

If the broker is unavailable, the worker backs off. If the PC is off, external
jobs remain queued. Restarting a crashed worker never assumes an expired claim;
TASK-011 stale recovery remains authoritative. Diagnostic logs contain only safe
identity/lifecycle summaries and never credential, pairing code, input, output
or authorization headers.

The broker includes bounded request bodies and a basic per-server-instance rate
limit. Deployments that need distributed abuse controls should add them at the
trusted ingress without changing the worker credential or PostgreSQL boundaries.
The `/api/worker/*` namespace bypasses human browser-session redirects only;
pairing-code or durable-worker authentication remains mandatory in the broker.
Every broker result is JSON. The worker validates the response content type and
discards unexpected HTML without printing it.
