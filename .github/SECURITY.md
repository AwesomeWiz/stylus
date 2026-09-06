# Security policy

## Supported versions

Security fixes are developed on the latest `main` branch. After the first public
release, maintainers may also patch the latest tagged release. Older commits,
forks, and modified deployments are not supported unless explicitly stated.

| Version | Supported |
| --- | --- |
| `main` | Yes |
| Latest tagged release | After an initial release exists |
| Older versions | No |

## Report a vulnerability privately

Do not open a public issue or pull request for a suspected vulnerability.

Use GitHub Private Vulnerability Reporting from the repository's **Security**
tab and select **Report a vulnerability**. If that option is unavailable, do not
publish exploit details; contact the repository owner through an existing
private channel and ask for a private reporting route.

Before the repository is made public, maintainers must enable Private
Vulnerability Reporting and verify that the form is available.

Include, where possible:

- affected commit or version and deployment type;
- a concise description and likely impact;
- affected components and security boundary;
- reproducible steps or a minimal proof of concept;
- whether credentials or personal data may have been exposed;
- suggested remediation or mitigations; and
- a safe way to coordinate follow-up.

Please redact live credentials, private organization data, and unrelated user
information. Do not include service-role credentials, provider keys, worker
credentials, or exploit details for a live deployment in public content.

Maintainers will acknowledge the report when it is reviewed, assess severity and
scope, coordinate a fix and disclosure plan, and provide updates when material
progress occurs. Response and remediation time depends on complexity and impact;
this policy does not promise a fixed service-level agreement.

Please allow maintainers a reasonable opportunity to investigate and remediate
before public disclosure. Good-faith research that avoids privacy violations,
data destruction, service disruption, social engineering, and access beyond the
minimum needed to demonstrate the issue is appreciated; this statement is not a
legal safe-harbor guarantee.

Relevant scope includes authentication, authorization, organization isolation,
RLS, memory-domain isolation, worker authentication, secret handling, private
Storage/Realtime access, AI/provider boundaries, and external-fetch controls.
See [the security architecture](../docs/SECURITY.md) for design details.
