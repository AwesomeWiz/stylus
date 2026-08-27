# Stylus — Plugin Architecture

## Purpose

Stylus plugins add business capabilities without placing their implementation in
Core. The framework is a modular-monolith boundary, not a marketplace or sandbox.
Plugins are trusted repository modules compiled and deployed with Stylus.

Core collaboration features—authentication, organizations, Team, tasks,
notifications, activity, whiteboards and Company Profile—are not optional
plugins.

## Dependency Boundary

The allowed direction is:

```text
Business plugin
  -> public Stylus Core plugin contract
```

Plugin implementations live under `apps/web/src/plugins/<plugin-id>` and may
import `@/core/plugins/public`. They must not import arbitrary files from Core or
another plugin's private directory. Core/application hosts may import the static
`@/plugins` composition root but never a plugin-private subpath.

`architecture-boundary.test.ts` enforces these rules. Cross-plugin cooperation
must use capabilities, explicit public APIs or events.

## Trusted Static Discovery

`apps/web/src/plugins/index.ts` explicitly imports each trusted built-in plugin
and constructs a fresh `PluginRegistry`. Static discovery is deterministic and
works in Next.js/serverless builds. There is no runtime filesystem scanning,
remote URL import, npm download, uploaded code, `eval`, MCP or third-party script
execution.

Invalid definitions fail during module import/build. Duplicate plugin IDs and
exclusive capability identifiers fail registration before the conflicting
definition becomes visible.

## Manifest Contract

`@/core/plugins/public` exports the Zod schema, types, `definePlugin`, and
registry. A manifest contains only bounded declarative metadata:

- stable lowercase machine-safe `id`
- display `name`, `description`, semantic `version`, and category
- controlled Lucide `icon` identifier
- declared permissions and exclusive capabilities
- navigation contributions under `/apps/<plugin-id>`
- explicit event subscriptions
- approved memory-domain names
- future AI tool metadata without an executor

Permission and tool IDs must be owned by the plugin namespace. Routes cannot
escape it. Persistent database metadata never stores JSX, components, URLs,
handlers or executable code.

Plugin IDs are durable security/application identifiers and must not be renamed
after persistent organization state or business data uses them.

## Registry and Capabilities

The registry is instance-scoped rather than hidden global mutable state. It can:

- register, get and deterministically list plugin definitions
- find the owner of an exclusive capability
- expose a capability only when its plugin is enabled
- collect enabled navigation contributions in stable order
- dispatch declared handlers for enabled plugins

Capabilities are identifiers and discovery metadata in TASK-008. The framework
does not execute Marketing workflows or AI tools.

## Organization Enablement

`organization_plugins` stores one non-destructive availability row per
organization/plugin ID. OWNER and ADMIN may change state through the guarded
database function. MEMBER and VIEWER may read their organization's state only.
Application actions derive the organization and accept only IDs present in the
static registry. Database RLS prevents cross-organization access and direct
browser writes.

The SQL layer validates a safe ID shape rather than duplicating the TypeScript
registry as a brittle enum. A well-formed but unregistered row is inert: it has no
manifest, route, navigation, capability or handler.

Disabling a plugin:

- removes its navigation
- makes its capabilities unavailable
- excludes it from normal event dispatch
- denies its guarded feature routes
- prevents new guarded workflows from starting

Disabling does not delete plugin data, configuration, memory or historical
activity. It is not an uninstall operation.

## Navigation and Icons

The application shell combines stable Core groups with enabled plugin
contributions after one organization-state query. Contributions specify a
validated label, namespaced route, order and icon ID. Icon IDs resolve through
the fixed Lucide registry in `core/plugins/icons.ts`; arbitrary component code is
not accepted.

Hiding a link is only presentation. Every plugin page must call the shared server
route guard, which verifies authentication, organization membership, static
registration and current organization enablement. Disabled or unknown plugin
routes return not found without redirect loops.

## Permissions

Manifest permissions declare what a plugin expects, such as `marketing.read` or
`marketing.approve`. They are not organization roles and grant nothing by
themselves. Existing OWNER/ADMIN/MEMBER/VIEWER behavior remains authoritative.
A custom permission editor or mapping system is deliberately deferred until a
real plugin requires it.

## Events and Failure Policy

Subscriptions and handlers are explicit and must match exactly. TASK-008
dispatch is synchronous and in-process, in deterministic plugin order. A failing
handler does not stop later handlers and does not implicitly roll back the source
business transaction. Dispatch returns structured failures and accepts a failure
observer so callers can surface or log them; errors are never silently discarded.

No background jobs are introduced for plugin events. Long-running reactions must
later use the persisted job infrastructure.

TASK-011 supplies that infrastructure without making event dispatch implicitly
asynchronous. A plugin may statically register typed job definitions through the
public Core jobs contract. Job type and capability must belong to the plugin, the
capability must be declared by its manifest, and current organization enablement
is checked again at enqueue and manual retry. Disabling a plugin blocks new jobs
but does not erase queued or terminal history.

TASK-012 adds an external worker adapter but no new plugin authority. Future
plugin-owned worker handlers must still be statically registered, capability-
declared, organization-enabled and routed through the same trusted job boundary.

## AI Tools and Memory Domains

TASK-008 manifest tool entries remain discovery metadata: ID, name and
description. TASK-009 adds a separate trusted server tool-definition registry
with an owning plugin, required capability, Zod schemas and `read`, `write` or
`external_side_effect` classification. It does not add an autonomous tool loop.

A model-produced tool name is untrusted data. Future execution must resolve an
explicit registered tool and independently verify current organization, actor,
plugin enablement, capability, schemas, memory policy and side-effect approval.
The model cannot register or select arbitrary functions, URLs or credentials.

Plugins may use the normalized contracts from `@/core/ai/public` and the
server-only gateway entrypoint from `@/core/ai/server`. They must not import
provider adapters, model configuration or provider environment values.

Memory-domain declarations are also metadata and never authorize retrieval.
Core policy recognizes only `company`, `marketing`, and `agency` and establishes:

- future Marketing may request `company` and `marketing`
- future Web Agency is restricted to `agency` by default
- installing either plugin never grants the other's domain

TASK-009 copies these declared domains into safe AI run context for audit only.
Future memory code must still independently enforce organization and domain
scope at the database/application boundary. Declaration is not authorization and
no memory records are queried by the ModelGateway.

## Configuration and Secrets

TASK-008 does not add a generic configuration editor because the example plugin
needs no settings. Generic JSON must not become an unvalidated credential store.
Future integrations require typed configuration and a dedicated server-side
secret/integration boundary.

## Example Plugin

The built-in `example` plugin is explicitly categorized as development. It has
one capability, one guarded placeholder route, one navigation contribution, one
harmless `plugin.enabled` handler and one metadata-only future tool declaration.
It exists only to verify the framework and contains no Marketing functionality.

## Adding a Future Plugin

1. Create `src/plugins/<stable-id>`.
2. Import only the public Core plugin contract.
3. Define and validate the manifest and any explicit handlers.
4. Register it statically in `src/plugins/index.ts`.
5. Add namespaced guarded routes and business-owned migrations.
6. Add capability, event, enablement, route and isolation tests.
7. Document any public Core API genuinely required by the plugin.

TASK-013 follows this process: `marketing` is statically registered with six
guarded navigation contributions and only the read/write capabilities required
by its manual foundation. Its declared memory domains remain `company` and
`marketing`, but ordinary Marketing CRUD performs no memory retrieval or write.
Disabling the plugin hides navigation and blocks route/data access without
deleting plugin records; re-enabling restores access.

Marketing remains outside Core.
Web Agency can later use the same public contracts while retaining its separate
system and agency-only memory boundary.
