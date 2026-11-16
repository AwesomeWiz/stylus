# Data and deployment responsibilities

Stylus is self-hostable software, not a promise that every deployment has the same
operator, privacy policy or retention schedule. A public hosted service must name
its operator and publish appropriate terms/privacy information for its users.
Get legal advice for that deployment's jurisdiction and provider use; this document
does not replace a service-specific privacy notice.

## Information handled

The configured Supabase project stores authentication, memberships, operational
work, private uploads, explicitly approved Company Memory, AI run metadata and
workflow records. Organization access and user-private connections are separately
authorized. Operators control backups, log retention, deletion requests, database
regions and storage. Archival is often intentional history preservation, not
immediate deletion from backups.

Google/GitHub connection credentials are encrypted on the server. Google refresh
credentials and private connection identity remain user-scoped; GitHub App access
is organization-scoped and restricted to selected repositories. Explicit links
share bounded provider metadata with readers of the Stylus object. They do not
change the provider's sharing permissions. Disconnect clears local secrets/cache;
provider-side App authorization may also need revocation. See
[integrations](INTEGRATIONS.md) for scopes, limits and key management.

Core works without AI. When enabled, explicit bounded operations send authorized
context through ModelGateway to the selected operator-configured provider. Read
that provider's terms before using private material. Boards, Notes, Tasks,
comments and drafts are not automatically promoted into permanent Company Memory.

Do not log tokens, OAuth responses, request bodies or private content when
troubleshooting. Production error UI suppresses exception bodies; infrastructure
logs still need access controls and retention limits. The repository configures
no product analytics tracker or automatic third-party error-reporting service.
Any operator-added telemetry needs its own disclosure and privacy review.

For vulnerabilities use [SECURITY.md](../SECURITY.md). For normal data/account
requests contact your deployment operator, not an unrelated self-hosting project.
