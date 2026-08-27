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

## TASK-014 Media Capability

TASK-014 uses FFmpeg/ffprobe plus the official `whisper.cpp` `whisper-cli`
executable. Python, faster-whisper, PyAV, and CTranslate2 are not TASK-014
runtime prerequisites. PyAV 18.1.0 was removed after Windows Smart App Control
blocked its unsigned `av/video/frame.pyd` on the manual-QA machine. Stylus does
not require or recommend disabling or weakening Smart App Control, Code
Integrity, or another application-control policy.

Install FFmpeg/ffprobe on PATH. Download a Windows x64 release from the official
`https://github.com/ggml-org/whisper.cpp/releases` page, extract the complete
release (including adjacent runtime DLLs) under an operator-owned tools folder,
and download the multilingual base model from the official model repository:

```powershell
$whisperRoot = 'C:\Tools\Stylus\whisper.cpp'
$modelRoot = Join-Path $whisperRoot 'models'
New-Item -ItemType Directory -Force -Path $whisperRoot, $modelRoot
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\whisper-bin-x64.zip" -DestinationPath $whisperRoot -Force
Start-BitsTransfer -Source 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin' -Destination (Join-Path $modelRoot 'ggml-base.bin')
```

Find the extracted `whisper-cli.exe`, keeping its release DLLs beside it, then
verify the exact executable is permitted by the machine's existing policy:

```powershell
$whisperCli = (Get-ChildItem -LiteralPath $whisperRoot -Filter whisper-cli.exe -Recurse | Select-Object -First 1).FullName
& $whisperCli --help
ffmpeg -version
ffprobe -version
ffmpeg -i .\short-sample.mp4 -vn -ac 1 -ar 16000 -c:a pcm_s16le -y .\short-sample.wav
& $whisperCli --model "$modelRoot\ggml-base.bin" --file .\short-sample.wav --language auto --output-json --output-file .\short-sample --no-prints
Get-Content .\short-sample.json
```

Only use media that is safe to expose during this local operator check. Delete
the test WAV/JSON afterward. If Windows blocks `whisper-cli.exe`, retain the
security policy and use an organization-approved signed/build artifact; do not
allowlist it ad hoc. Until it runs successfully, the Marketing capability stays
unavailable and its jobs remain queued.

Configure the worker process (or equivalent persistent user environment) with
fixed operator-owned paths:

```powershell
$env:STYLUS_WORKER_WHISPER_CPP_PATH = $whisperCli
$env:STYLUS_WORKER_WHISPER_MODEL_PATH = "$modelRoot\ggml-base.bin"
# Optional only when FFmpeg tools are not already on PATH:
# $env:STYLUS_WORKER_FFMPEG = 'C:\Tools\ffmpeg\bin\ffmpeg.exe'
# $env:STYLUS_WORKER_FFPROBE = 'C:\Tools\ffmpeg\bin\ffprobe.exe'
npm.cmd run worker:pair
npm.cmd run worker:start
```

The worker advertises `marketing.competitor-reels.analyze` only after ffmpeg and
ffprobe execute, the configured model is a readable non-empty file, and the
configured whisper CLI executes an inexpensive help probe exposing the required
model, file, JSON, and output-file options. A missing, incompatible, or
application-control-blocked runtime disables only this capability; the worker
echo diagnostic remains available. Re-pair whenever the advertised capability
set changes.

The repository-owned handler passes only its generated mono 16 kHz WAV and
operator configuration to `spawn` with `shell: false`. JSON is written inside
the isolated OS temp directory, size/schema/timestamps/language are validated,
and source MP4, WAV, and JSON artifacts are removed in `finally` after success,
failure, cancellation, or timeout. Models and native binaries must never be
committed and are never downloaded during install, startup, build, tests, or web
requests. Transcription stays local; structured interpretation remains a hosted
ModelGateway operation.
