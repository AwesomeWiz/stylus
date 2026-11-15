# Integrations and external context

REDESIGN-008 · accepted through REDESIGN-008.1. The owner's closure brief records
successful live GitHub, Google Drive and Google Calendar QA. No credentials or
real external resource names are included in this document.

Settings → Integrations manages GitHub, Google Drive and Google Calendar. Existing
trusted business plugins remain managed through Apps. Integrations are optional:
signup, onboarding, Tasks, Notes, Boards and Marketing work without provider
configuration. There is no new global navigation destination.

## Server configuration

For normal users of a configured deployment, open Settings → Integrations,
choose Connect, authorize the deployment's App and (for GitHub) select permitted
repositories. Normal users do not create OAuth apps or supply deployment keys.
The server setup below is performed once by the self-hosting operator. Test-app
guidance concerns QA; public deployments need their own provider approvals,
privacy notice and applicable Google restricted-scope verification.

Keep values in the hosting secret store or ignored `apps/web/.env.local`. Never
paste credentials into chat, commit them or prefix secret names with `NEXT_PUBLIC`.
Use the existing `NEXT_PUBLIC_SITE_URL` as the canonical application origin; there
is no second integration base URL. HTTPS is required outside localhost.

| Variable | Purpose |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Existing server-only credential store access |
| `STYLUS_INTEGRATION_KEY_ID` | Active encryption key ID, for example `k1` |
| `STYLUS_INTEGRATION_KEYS` | JSON object mapping key IDs to base64 encoded 32-byte random keys |
| `STYLUS_GITHUB_APP_ID` | Numeric GitHub App ID (different from client ID) |
| `STYLUS_GITHUB_APP_SLUG` | App URL slug |
| `STYLUS_GITHUB_CLIENT_ID` | GitHub App OAuth client ID |
| `STYLUS_GITHUB_CLIENT_SECRET` | GitHub App OAuth client secret |
| `STYLUS_GITHUB_PRIVATE_KEY` | App RSA private key PEM; literal `\n` is supported |
| `STYLUS_GOOGLE_CLIENT_ID` | Google Web application OAuth client ID |
| `STYLUS_GOOGLE_CLIENT_SECRET` | Google Web application OAuth client secret |

Generate each encryption key using a cryptographically secure generator, for
example Node's `crypto.randomBytes(32).toString('base64')`, and put it directly in
your secret store. The value of `STYLUS_INTEGRATION_KEYS` has the shape
`{"k1":"<base64 32-byte key>"}`. This example is a placeholder, not a working key.
Encryption uses Node AES-256-GCM with a fresh nonce, authenticated record identity,
version and key ID. Keep old keys in the keyring while existing ciphertext still
uses them; changing the active ID affects new writes. Never remove an old key
before re-encrypting its records or reconnecting affected accounts. Back up keys
separately from the database. A lost key requires reconnecting affected accounts.

Missing provider configuration yields setup guidance rather than a startup
failure. Apply the forward migrations before testing configured integrations;
never reset an existing database to install this feature.

## Exact callbacks

Register each exact URL below, replacing the origin with `NEXT_PUBLIC_SITE_URL`:

| Provider | Local callback | Hosted callback |
| --- | --- | --- |
| GitHub | `http://localhost:3000/integrations/github/callback` | `https://YOUR-STYLUS-HOST/integrations/github/callback` |
| Google Drive | `http://localhost:3000/integrations/google-drive/callback` | `https://YOUR-STYLUS-HOST/integrations/google-drive/callback` |
| Google Calendar | `http://localhost:3000/integrations/google-calendar/callback` | `https://YOUR-STYLUS-HOST/integrations/google-calendar/callback` |

Use a consistent host/port in the browser and environment. Do not add wildcards,
query parameters, arbitrary return URLs or a second base URL. OAuth always returns
to `/settings/integrations`. State is one-time, ten-minute, browser-bound and tied
to the current authenticated user and organization; code exchange uses S256 PKCE.
Changing user or organization during consent rejects the callback. Reconnect
after switching back. Concurrent reconnect/disconnect is protected by a connection
generation check.

## GitHub App

Create a **GitHub App**, not a personal access token or a general OAuth App.
Set its homepage to Stylus and its user authorization callback to the GitHub URL
above. Disable webhooks and device flow. Do not configure a setup URL that trusts
an `installation_id`; Stylus performs a separate authenticated OAuth selection.
Install the App in an isolated test account/organization, selecting only fictional
test repositories. The Settings install link opens GitHub's normal install flow;
return to Stylus and choose Connect to authorize and select repositories.

Repository permissions, all **Read-only**:

- Metadata (GitHub's mandatory baseline)
- Issues
- Pull requests
- Contents (required to read commit metadata; Stylus does not browse file content)

No organization/account write permission, Actions permission, webhook subscription
or additional OAuth repository scope is requested. GitHub App permissions determine
access; the temporary user OAuth token proves the intersection of App and user
access. Stylus verifies the configured App installation and each chosen repository,
then issues installation tokens restricted to the explicitly selected repository
IDs and read permissions. At most 20 repositories are selected per connection.
OWNER/ADMIN manage this organization connection. Members browse/link selected
repositories; VIEWER only reads existing links. Repository, Issue, PR and Commit
are READ/LINK/OPEN only. No issue, comment, branch, merge or other GitHub write API
is provided. OAuth user tokens are discarded after bounded installation selection;
normal use derives short-lived installation tokens server-side from the App key.

See [GitHub App user authorization](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)
and [installation access tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app).

## Google Cloud OAuth

Create an isolated Google Cloud project; enable **Google Drive API** and **Google
Calendar API**. Configure the consent screen and add isolated test accounts while
the app is in Testing. Create a **Web application** OAuth client, adding both exact
Google redirect URLs above. Configure the two `STYLUS_GOOGLE_*` server variables.
No browser Google SDK, service account, domain-wide delegation or Google API key
is required.

Drive and Calendar have separate logical, user-private connections so each has
its own explicit grant, health and disconnect state. They share the Google OAuth
client configuration but may use different Google identities. This keeps a Drive
authorization from implying Calendar access. Google itself may remember previous
grants; Stylus adapters only call the capability the user explicitly connected.
Connections are bound to the current Stylus organization as well as the user;
switching organizations grants no access to another organization's connection.

Drive requests exactly:

- `openid`
- `email`
- `https://www.googleapis.com/auth/drive.metadata.readonly`

The last scope is a **restricted Google scope**. Public deployments must follow
Google's applicable verification requirements; do not substitute `drive.file` to
avoid verification because that scope permits writes. Only bounded file metadata
is requested. No `alt=media`, downloads, document text, revisions, uploads, Drive
write API, indexing, embeddings or AI processing is implemented.

Calendar requests exactly:

- `openid`
- `email`
- `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
- `https://www.googleapis.com/auth/calendar.events.readonly`
- `https://www.googleapis.com/auth/calendar.events.owned`

Calendar read grants allow the owner's event picker; the owned-events grant is
used only for explicit event creation in an **owned** calendar. The broader
`calendar` scope is not requested. Event projections omit attendees, descriptions,
conference links and private extended properties. Creating an event uses an
explicit confirmed title/date/time/calendar form for a dated Task, Milestone or
Experiment. It sends no invitations. A persisted intent and deterministic event
ID recover a lost response/link failure without a second event. Unlinking never
deletes the Google event. Changing Stylus dates does not update Google; there is
no automatic synchronization or event deletion feature.

See [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server),
[Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth),
[Calendar scopes](https://developers.google.com/workspace/calendar/api/auth) and
[Calendar event creation](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert).

## Sharing, degradation and lifecycle

Only the Google connection owner can browse/search their files, calendars or
events. Attaching a resource explicitly shares its bounded title, link and event
time with readers of the selected Stylus entity. It never changes provider
permissions; Google may deny another member opening the file/event. Private
connection identity, credentials and unrelated search results remain private.

Core's existing entity-reference and canonical opener contracts authorize Task,
Note, Hypothesis and Experiment; a scoped Milestone projection covers checkpoints.
The trusted host registers plugin adapters. Generic links use one model rather
than per-provider/domain join tables. Database target registrations are trusted
migration-only, with membership, role, archive and enabled-plugin checks repeated
at link boundaries. Core imports no Marketing persistence. Notes and external
references remain working context; nothing promotes Company Knowledge or runs AI.

At most 20 links attach to an object. Linked rows load in pages of five, separate
from Core rendering. Search uses 25-result provider pages and a debounced picker.
The short metadata cache is scoped by connection, generation and resource, with
a maximum 60-second freshness window. Explicit refresh bypasses it. Authentication,
permission, deletion and provider failures suppress metadata rather than present
an old title as current. A disconnected/removed owner's connection cannot serve
cached metadata. Unrelated Core work stays usable. There is no polling daemon,
webhook platform, automatic synchronization or provider-wide mirroring.

Disconnect confirms and atomically clears local credentials, cached metadata and
active connection state, retaining Stylus objects/references. It does not uninstall
the GitHub App or delete external data. Users can additionally revoke the App grant
in GitHub/Google account settings. Google refresh credentials are encrypted; expired
or revoked grants require reconnecting. Short cache freshness means an out-of-band
provider revocation can take up to 60 seconds to suppress an already cached title.

Open panels also expire resource titles after at most 60 seconds, including on
focus/visibility restoration; expiry does not poll providers. Refresh checks
authorization again. Calendar pagination retains its exact query/window. Calendar
choices are limited to the first 25 available calendars; creation requires ownership.
The optional upcoming Home widget is deferred to preserve the existing attention
hierarchy. Calendar pickers show a bounded upcoming 90-day window. Update/delete,
external Board cards, Slack, Gmail, Outlook, Notion, Jira, Linear, Figma, arbitrary
webhooks, automation builders, Drive ingestion, GitHub writes, file mirroring,
provider analytics, automatic Memory and integration-powered AI are deferred.

## Verification status

Local provider/security and component tests, real Supabase JWT isolation smoke,
authenticated optional-configuration browser checks and hosted schema/RLS checks
are recorded in PROJECT_STATE. Full web (264 files / 1,512 tests), worker tests,
lint, both typechecks and the production build pass. The new 54-assertion RLS suite
passes locally and hosted; all 51 migration versions match. REDESIGN-008.1 repairs
legacy SQL setup and fixture-scopes service-side cache counts without changing
application code, provider adapters, OAuth, RLS or migrations. All 29 suites pass
1,018 assertions in isolated PostgreSQL with real pgcrypto and no privilege aliases.
Native hosted rollback-only checks pass Ask Council 35, Competitor 23, Workers 23
and integration isolation 54. Focused integration web tests pass 92; final lint,
web/worker typechecks and production build pass. Full web/worker runtime suites
are not repeated for fixture-only changes.

The owner reports live GitHub installation/OAuth/discovery, repository selection,
repository/Issue/PR/Commit links, external opening, unlink/relink and connection
persistence as passed. Drive consent, private metadata search, linking, external
opening and unlink passed. Calendar consent, private event search/linking, explicit
real event creation and no automatic sync passed. **LIVE PROVIDER QA: PREVIOUS PASS
REMAINS VALID**; provider retesting was not required by these SQL-only repairs.
This records the supplied live acceptance, separately from automated mock results.
REDESIGN-008 is PASS and ready for review; REDESIGN-009 is not started. Manual NVDA,
physical device/other-engine QA and optional deferred features remain outside this
closure. Detailed baseline causality, fixture fixes and verification are in
PROJECT_STATE. Hosted tests roll back; no task credentials or QA artifacts ship.
