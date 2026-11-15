# Stylus

**From evidence to execution.**

Stylus is an open-source operating system for early-stage teams to turn customer
and market evidence into experiments, decisions, execution and learning.

An early beta for teams that need a shared place to decide what to test, do the
work and remember what they learned. Core works without AI or connected providers.

![Stylus Home with the fictional Paper Orbit team's daily attention](docs/media/home.png)

## Why Stylus

Evidence is easy to collect and easy to lose. A task list alone rarely explains
why the work matters. Stylus links an observation, a testable belief, an experiment,
execution work and a reviewed conclusion.

```text
Evidence → Hypothesis → Experiment → Tasks and decisions → Learning
                                                            ↓
                                             explicit Company Memory
```

The links are canonical records with exact provenance. A Board card points to the
original work. A Learning becomes Company Memory only through reviewed promotion.

![Navigating fictional Evidence, Hypothesis, Experiment, execution context and Learning](docs/media/operating-loop.gif)

## A workspace for the operating loop

- **Daily execution:** Home highlights attention; Tasks support owners, deadlines,
  prerequisites and Milestones. Detail opens without losing the list.
- **Visual work:** Boards combine Sections, notes, images and native Stylus cards,
  with collaboration, comments, visible voting and Section presentation.
- **Growth and learning:** Marketing connects Evidence, Hypotheses, Experiments,
  Campaigns and Learnings. Creative Studio and Ask Council are distinct bounded workflows.
- **Context:** working Notes stay separate from approved Company Memory.
  Onboarding supplies explicit company context.
- **Connected tools:** link GitHub repositories/Issues/PRs/Commits, Drive metadata
  and Calendar events. Calendar creation is explicit; there is no automatic sync.

![Board placement followed by a native Task card and contextual arrangement menu](docs/media/boards.gif)

<details>
<summary>More product views</summary>

![Tasks with a prerequisite and Milestone in the detail panel](docs/media/tasks.png)
![A fictional experiment with its hypothesis, test plan and reviewed result](docs/media/experiment.png)
![Manual research notes retain their human provenance](docs/media/research.png)
![Optional integrations show explicit operator setup states](docs/media/integrations.png)

</details>

Media uses the fictional Paper Orbit workspace. Results are synthetic examples,
not customer outcomes. [Full-size video, capture provenance and sizes](docs/MEDIA.md).

## Run it yourself

Use Node.js 24 LTS, npm and Supabase. For a new local development stack on a
machine with a working Docker-compatible engine:

```sh
git clone https://github.com/AwesomeWiz/stylus.git
cd stylus
npm ci
npx --no-install supabase start
node scripts/setup-local-env.mjs
npm run dev
```

Open `http://localhost:3000`, create an account/organization and finish onboarding.
The helper creates an ignored local environment file and refuses to overwrite one.
First-time backend downloads can take longer than the application install.

The [self-host guide](docs/SELF_HOSTING.md) covers your own hosted Supabase project,
forward migrations, production hosting and troubleshooting. There is no dependency
on the maintainer's backend. [Release verification](docs/RELEASE_AUDIT.md) records
executed/pending checks, including the pending full local-stack authenticated
clean-install gate. This pre-release candidate is not a production SLA.

Try the [optional fictional demo](docs/DEMO.md), or start empty.

## Optional AI and integrations

Configured AI operations run through ModelGateway using logical capabilities and
bounded, auditable workflows. Existing adapters support Ollama and OpenAI-compatible
endpoints; no paid OpenAI account is required. An optional outbound Windows worker
handles heavy media jobs, which remain queued while it is offline.

End users connect the deployment's configured GitHub/Google app. Only self-hosting
operators create provider apps and manage encryption keys.
[Integration setup](docs/INTEGRATIONS.md) documents those roles and exact scopes.
Drive's restricted metadata scope can require Google's public-deployment verification.
File ingestion, GitHub writes and automatic Calendar sync are not implemented.

## Architecture and security

A modular monolith built with Next.js/React/TypeScript and Supabase. Core owns shared
collaboration; Marketing is a plugin behind public contracts. RLS, server
authorization and permanent tests protect tenant/role boundaries. Memory domains
are enforced in code and SQL. Credentials remain server-only; linked metadata
does not change provider sharing permissions.

Read the [architecture overview](docs/ARCHITECTURE_OVERVIEW.md),
[security policy](SECURITY.md), [privacy responsibilities](docs/PRIVACY.md) and
[documentation](docs/README.md). These are safeguards, not a security certification.

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md), [SUPPORT.md](SUPPORT.md) and the
[code of conduct](CODE_OF_CONDUCT.md). Contributors retain copyright and contribute
under the project license; no CLA or copyright assignment is required. AI-assisted
contributions are welcome with review and responsibility for the submitted change.

Stylus was built with extensive use of Codex as an implementation agent. Product
direction, architecture, review, testing, maintenance and release responsibility
remain human-directed.

## License and beta status

Original code is [AGPL-3.0-only](LICENSE). Dependencies/fonts retain their
[own terms](docs/THIRD_PARTY.md); see [trademark guidance](TRADEMARKS.md).
Modified network deployments must review corresponding-source requirements.
Future commercial/dual licensing is not promised by contributor terms.

The proposed first public version is **0.1.0-beta.1**. Read the
[release notes](docs/RELEASE_NOTES.md) and [audit](docs/RELEASE_AUDIT.md) for known
limitations and gates that must close before publication.
