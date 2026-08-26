# Stylus — AI Architecture

## Principle

AI is an optional Core platform capability. Business modules and plugins never
call provider SDKs, Ollama, provider endpoints or credentials directly.

```text
Core or enabled plugin
  -> Stylus AI public contract
  -> ModelGateway
  -> deterministic ModelRouter
  -> configured provider adapter
  -> model
```

Core collaboration remains usable when organization AI is disabled, no model is
configured, or a local provider is offline.

## Public Contract and Server Boundary

`core/ai/public.ts` defines provider-neutral messages, logical tiers, usage and
normalized text/structured results. Messages currently support `system`, `user`
and `assistant`; the shape can later add trusted tool-result messages without
exposing vendor objects.

`core/ai/server.ts` is the server-only execution entrypoint. It derives the
authenticated actor, active organization membership and a fresh run UUID. An
ordinary browser request cannot supply organization, actor, run ID, provider,
model or base URL. Raw provider clients and raw responses never cross this API.

Provider adapters, endpoint configuration and API keys live only under
server-only modules and non-`NEXT_PUBLIC` environment variables.

## ModelGateway

`ModelGateway` exposes normalized text and Zod-typed structured generation. It:

1. validates bounded messages and generation options;
2. creates a metadata-only RUNNING record;
3. obtains deterministic policy-compliant candidates from `ModelRouter`;
4. invokes only statically configured provider adapters;
5. normalizes usage, finish reason and provider failures;
6. validates structured output before returning typed data;
7. estimates cost only when model pricing and token usage are known; and
8. records one terminal run transition.

It does not implement agents, memory retrieval, autonomous tools, streaming,
multi-agent orchestration or persisted background jobs.

## Provider Adapters

The adapter contract receives normalized messages, configured provider model,
optional temperature, maximum output tokens, optional structured-output schema
and an AbortSignal. It returns normalized text, usage, finish reason and an
optional provider request identifier. Unsupported capabilities remain explicit
model metadata rather than being assumed.

TASK-009 provides:

- a small OpenAI-compatible HTTP adapter for deployment-configured endpoints;
- Ollama/local support through its OpenAI-compatible chat endpoint; and
- a deterministic fake adapter for automated success, malformed-output,
  unavailable, rate-limit, timeout, cancellation, usage and retry tests.

Endpoints are server deployment configuration, must use HTTP(S), and cannot
contain embedded credentials, query strings or fragments. Browser-supplied URLs
are never accepted, preventing Stylus from becoming an arbitrary SSRF proxy.
Provider availability is evaluated at explicit health/execution boundaries, not
on every render or during application startup.

## Model Registry and Logical Tiers

Each registered model has a stable Stylus ID, provider ID/model name, enabled
state, priority, logical tiers, local/remote classification, structured-output
and tool capability flags, optional context window, relative cost class and
optional deployment-maintained pricing metadata.

The initial logical tiers are:

- `fast`: low-latency classification and simple transformation;
- `balanced`: normal summaries and generation; and
- `reasoning`: higher-effort future strategic work.

Plugins request a tier and required capabilities, not a vendor model. Duplicate
model IDs fail registration; disabled and unsupported models are unavailable.
Pricing is optional configuration, not volatile business logic.

## Routing and Fallback

The router filters and orders candidates deterministically by:

- requested/default logical tier;
- required structured/tool capability;
- enabled model state and configured adapter;
- organization execution mode;
- organization provider allowlist; and
- estimated remote-cost ceiling.

Candidates retain explicit priority order and traces store a safe selection
reason. Fallback occurs only after a transient candidate failure and only among
the already filtered candidates.

`LOCAL_ONLY` removes every remote model before invocation. It can never fall back
remotely. `REMOTE_ALLOWED` permits configured remote candidates but does not
require them; lower-priority remote fallback may follow a local unavailable
result. Disabled policy selects nothing. Reaching a hard estimated-cost ceiling
blocks paid remote candidates before any provider request; local and explicitly
zero-cost models remain eligible.

## Organization AI Policy

`organization_ai_policies` is optional; absence means disabled. OWNER and ADMIN
manage:

- `DISABLED`, `LOCAL_ONLY` or `REMOTE_ALLOWED` execution mode;
- FAST, BALANCED or REASONING default tier;
- optional configured-provider allowlist; and
- optional monthly estimated remote-cost ceiling.

MEMBER and VIEWER may inspect policy. MEMBER may execute only future explicitly
authorized operations; VIEWER cannot execute. Provider URLs and credentials are
not organization policy fields and never appear in the UI.

## Plugin Execution Context and Memory Domains

Every plugin-originated request requires:

- authenticated active membership;
- server-derived organization and actor;
- a statically registered plugin currently enabled for that organization;
- an exactly declared plugin capability; and
- a server-generated run ID.

Memory domains are copied from the validated plugin manifest into run metadata.
They are audit context only. They do not query memory and do not authorize future
retrieval. A future memory service must independently enforce organization,
workspace and domain scope. Marketing remains limited to `company` and
`marketing`; Web Agency remains limited to `agency` by default.

## Structured Output

`generateStructured` accepts a Zod schema. The schema is translated to JSON
schema for providers that support compatible constrained output. Regardless of
provider claims, returned text is parsed as JSON and validated again with Zod.
Malformed JSON or a schema mismatch becomes `invalid_response`, records a failed
run and never reaches application code as typed data.

Plain text generation returns only normalized text, stable model/provider IDs,
usage, estimated cost, finish reason and run ID. Raw provider response objects
are not returned.

## Future Tool Boundary

The trusted server tool registry defines:

- stable namespaced ID and description;
- owning plugin and required capability;
- Zod input and optional output schema;
- `read`, `write` or `external_side_effect` classification; and
- an explicitly registered execution function.

Model output is untrusted input. A generated tool name does not authorize or
execute anything. Future execution must recheck registry membership, active
organization/actor, plugin enablement, capability, schemas, memory policy and
side-effect approval. TASK-009 intentionally has no autonomous tool-calling loop
or approval workflow.

## Run Lifecycle and Diagnostics

`ai_runs` uses controlled PENDING, RUNNING, SUCCEEDED, FAILED, CANCELLED and
TIMED_OUT states. Current synchronous execution creates RUNNING directly and
permits one terminal transition. Stable IDs prevent accidental duplicate run
creation; optional parent IDs support future bounded composition without
implementing it now.

Stored metadata includes organization, database-derived actor, plugin/Core
origin, operation, capability, requested tier, selected model/provider,
local/remote flag, timing, token usage, estimated cost, safe error category and
bounded trace metadata. The `/ai` diagnostics view shows these operational fields.

Complete prompts, model responses, provider error bodies, credentials and hidden
chain-of-thought are not stored or displayed. Trace JSON rejects common raw
content keys and application tracing stores counts/selection data only. Production
code does not log prompt content to the console.

### Connection Diagnostic

`/ai` provides OWNER, ADMIN and MEMBER with a fixed-input connection test. Its
Server Action calls `generateAIText` with `core.ai.connection-test`, the `fast`
tier, an eight-token output ceiling and a 15-second timeout. It accepts no prompt,
organization, actor, plugin, provider URL/ID or model ID from the browser.

The request therefore follows the same authenticated organization context,
policy routing, provider configuration and `ai_runs` lifecycle as every trusted
AI consumer. `LOCAL_ONLY` cannot fall back remotely, `DISABLED` is denied and
VIEWER has no execution control. The UI discards model text and exposes only
success/failure, provider, selected model, duration and normalized error category.

## Usage, Cost and Budgets

Adapters report input/output/total tokens when available. Unknown usage remains
`null`; Stylus does not invent token counts. Cost is an estimate only when both
deployment pricing metadata and required usage are available. Local models use
an estimated API cost of zero while still consuming local hardware.

Monthly remote spend sums successful remote run estimates. It is not a provider
invoice or billing platform. A configured hard ceiling prevents another paid
remote selection once recorded estimated spend reaches the ceiling.

## Errors, Timeouts, Cancellation and Retries

Provider failures normalize to:

- `provider_unavailable`
- `authentication_failed`
- `rate_limited`
- `timeout`
- `invalid_response`
- `context_limit`
- `budget_exceeded`
- `policy_denied`
- `cancelled`
- `unknown`

Public errors never include credentials or large provider bodies. Requests use a
configurable 1–120 second timeout with a 30-second default and accept an external
AbortSignal. Timeout and cancellation receive distinct terminal states.

Only provider-unavailable, rate-limit and unknown transient failures receive one
retry. Authentication, policy, budget, invalid response, timeout and cancellation
are not retried. This avoids retry storms and unexpected paid-provider cost.

## Zero-Cost Local Development

No paid API, local model or network call is required for installation, build or
tests. Automated tests use the fake adapter.

For optional local execution:

1. Install and operate Ollama separately; Stylus never downloads model weights.
2. Choose a small quantized model appropriate for the Windows machine.
3. Set server-only `STYLUS_AI_OLLAMA_BASE_URL` (normally
   `http://127.0.0.1:11434`) and `STYLUS_AI_OLLAMA_MODEL`.
4. Restart the local Next.js server.
5. Apply the TASK-009 migration and set organization policy to LOCAL_ONLY.

If Ollama is stopped, execution returns `provider_unavailable`; the application
and Core collaboration continue normally.

## Hosted Deployment Limitation

A hosted Stylus server cannot reach an Ollama process bound to a developer
laptop's localhost. TASK-009 does not create tunnels, expose Ollama publicly or
solve remote worker networking. Hosted deployments must configure a provider
reachable from the server environment. A later authenticated outbound worker/job
architecture may safely use the optional laptop for heavy work.

## Deferred Work

TASK-010 will add Company Knowledge and memory with explicit promotion and domain
isolation. Later tasks add jobs/workers, agents, workflows and Marketing. None of
those systems are implemented by TASK-009.
