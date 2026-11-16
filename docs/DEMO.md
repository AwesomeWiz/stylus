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
The seeder needs the server-only service key for Auth administration and bounded
research service RPCs. Operational work uses real authenticated user sessions.
The complete interaction/privilege audit is [recorded below](#identity-and-permission-audit).
It invokes no model, external retrieval adapter or external provider.

Organization verification uses the signed-in fictional owner's RLS read path,
not the Auth-administration client's table privileges. It selects the exact
recorded organization UUID and checks the returned UUID, creator UUID and name.
Cleanup signs in that same owner before performing the identical ownership
check; all account-ID, row-inventory and atomic deletion guards remain required.
`npm run test:demo` retains identity/cleanup denial checks and executes the complete
seed and cleanup twice against all actual migrations in isolated PostgreSQL.
Its synthetic Auth/Storage transport does not substitute for the real Supabase
round-trip gate on CircleCI.

Random credentials and exact record IDs are saved only in ignored
`.release-qa/demo.json`, never printed or committed. Use the first account to
sign in. Other accounts demonstrate MEMBER and VIEWER roles. Preserve this file
until you deliberately remove the fixture.

The release seeder now refuses every hosted backend, including the old
`--allow-hosted-project` override. Use an isolated loopback Supabase stack only.
A separate explicit environment file can be supplied with `--env-file=PATH`;
do not copy real credentials into docs.

```sh
npm run demo:cleanup
```

Cleanup checks the exact recorded backend, organization name/creator and account
ID/email pairs. It compares the complete primary-key/creator inventory of that
exact new organization with the recorded manifest and stops on a mismatch. It
verifies the private image's exact Storage ID, path and SHA-256 before removing
that single asset under the OWNER session. It calls the existing OWNER
organization-deletion RPC, verifies all organization
rows are gone, removes only those fixture accounts and verifies each is absent.
It does not inventory existing tenants or discover/delete data by a loose name
prefix. Passwords are removed from the cleaned manifest. A partial seed retains
its manifest for review/guarded cleanup instead of silently creating another copy.

If setup stops, `npm run demo:seed -- --resume --confirm-demo-memory` resumes only
the same unfinished local fixture. Account, organization and
cached row identities are rechecked; successful operations are reused. UUIDs are
journaled before RPC writes and immediately after returned inserts. Archive the
cleaned manifest before deliberately creating another fixture; it is never
silently overwritten.

## Identity and permission audit

The original `42501` came from direct `service_role` membership insertion.
Bypassing RLS does not grant table privileges, and direct membership writes bypass
the application's invitation contract. The previous research fixture also used
administrative SQL inserts; it is replaced rather than broadening privileges.
No production grant, RLS policy, migration or application behavior changes.

| Operation / interface                                                                                                                              | Executing identity                                                   | Required authority and fresh-schema contract                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth `createUser`, `getUserById`, `deleteUser`                                                                                                     | Auth Admin API, service key                                          | Platform account administration only; exact returned IDs journaled immediately; no application-table reads/writes                                                     |
| Password sign-in, `getUser`, sign-out                                                                                                              | Public key + actual OWNER/MEMBER/VIEWER password sessions            | Server-verified matching user ID/email; no service impersonation                                                                                                      |
| `create_organization`                                                                                                                              | Authenticated fictional owner                                        | Existing atomic organization/OWNER bootstrap RPC                                                                                                                      |
| Exact `organizations` SELECT                                                                                                                       | Authenticated OWNER                                                  | Active membership/RLS; exact UUID, creator and name checked                                                                                                           |
| `create_organization_invitation`                                                                                                                   | OWNER                                                                | Existing manager-only RPC; exact email/role/token hash/expiry; returned invitation UUID recorded                                                                      |
| `accept_organization_invitation`                                                                                                                   | Each invited MEMBER/VIEWER                                           | Existing matching-authenticated-email acceptance RPC; token held only in ignored manifest                                                                             |
| `memberships` SELECT                                                                                                                               | Each invited user; OWNER during verification                         | Exact current organization/user/active role; no direct membership mutation                                                                                            |
| `set_organization_plugin_enabled`                                                                                                                  | OWNER                                                                | Existing manager authorization; MEMBER/VIEWER denial retained in real Auth gate                                                                                       |
| `company_profiles`, `audience_profiles`, `brand_profiles`, `marketing_profiles`, `onboarding_progress` INSERT/returning SELECT                     | OWNER                                                                | Existing authenticated profile collaborator grants/RLS; organization and actor fields validated                                                                       |
| Six `tasks` INSERT/SELECT                                                                                                                          | OWNER                                                                | Existing editor grants, task RLS and server-generated activity; actual teammate assignment                                                                            |
| `save_milestone`, `set_task_milestone`, `set_task_dependency`                                                                                      | OWNER                                                                | Existing bounded Core RPCs and same-organization references                                                                                                           |
| `save_core_note`, `set_core_note_link`                                                                                                             | OWNER                                                                | Existing note ownership, link/tenant validation; working data stays outside Memory                                                                                    |
| `marketing_research`, `marketing_campaigns`, `marketing_competitors`, `marketing_reel_ideas` INSERT/SELECT                                         | OWNER                                                                | Existing Marketing editor/plugin-enabled RLS; manual records remain distinct                                                                                          |
| `enqueue_marketing_external_research`, `claim_serverless_job`, `begin_marketing_external_research`, `record_marketing_external_research_retrieval` | Service key, existing service RPCs only                              | Existing bounded actor/plugin/job/lease contracts; exact invocation/run/job IDs; explicitly authored fictional provenance; no direct internal-table grants or inserts |
| `request_job_cancellation` / `acknowledge_job_cancellation`                                                                                        | OWNER / same claimed service executor                                | Cancel immediately after fixture retrieval, before synthesis; run/job must be CANCELLED; zero AI runs/reports verified                                                |
| Research run/source/evidence SELECT                                                                                                                | OWNER                                                                | Exact organization/run/source/evidence identities through existing RLS; no administrative application writes                                                          |
| `save_marketing_hypothesis`, `save_marketing_experiment`, `link_marketing_experiment`, `evaluate_marketing_experiment`, `save_marketing_learning`  | OWNER                                                                | Existing bounded workflow/provenance contracts; immutable evidence linked canonically                                                                                 |
| Experiment `updated_at` SELECT                                                                                                                     | OWNER                                                                | Existing authorized version read; expected timestamp supplied for transitions                                                                                         |
| `promote_marketing_learning`                                                                                                                       | OWNER, only with `--confirm-demo-memory`                             | Existing explicit reviewed promotion through Core Memory API; company domain retained; returned Memory UUID recorded                                                  |
| `create_board_from_template`, `apply_board_operation`                                                                                              | OWNER                                                                | Existing bounded Board API, object identities/Sections/native references/private image path validation                                                                |
| Private `board-images` upload/info/download/remove                                                                                                 | OWNER                                                                | Existing Storage policies; one authored PNG, exact preallocated path, returned Storage UUID and byte hash; no overwrite, list/prefix cleanup or external asset        |
| Cached fixture SELECTs on resume                                                                                                                   | OWNER                                                                | Exact organization and recorded primary key; no title/email fallback; uncertain identities stop                                                                       |
| Catalog and exact tenant row inventory                                                                                                             | Local CLI administrator, SELECT only                                 | Read-only allowlist, loopback only; exact PK/creator/actor inventory across every tenant table; never inserts/updates/grants                                          |
| `delete_owned_organization`                                                                                                                        | Authenticated OWNER                                                  | Existing exact UUID/name-confirmed transactional deletion; all recorded inventory checked first; complete tenant-row absence afterward                                |
| Post-cleanup Auth/Storage absence                                                                                                                  | Auth Admin exact user GET; local read-only exact Storage UUID SELECT | Recorded identities only; no broad predicates or hosted backend                                                                                                       |

The complete SQL contract regression exercises all these application write paths
under actual `authenticated` or `service_role` permissions, with 53 unchanged
migrations and the strict bootstrap that grants no blanket service table access.
The Auth Admin transport creates only platform Auth test users. Storage transport
uses actual Storage object RLS; bytes are synthetic in that local regression.
Existing mismatch/denial assertions stay enabled.

## Real Supabase round-trip release gate

`node scripts/demo/roundtrip.mjs prepare` is restricted to the fresh CircleCI VM
and loopback backend. It creates and journals a separate isolated preservation
control account/tenant/note through existing APIs, snapshots their contents,
runs the entire three-account seed with explicit Memory confirmation, verifies
all fixtures/assets, runs guarded cleanup and verifies exact absence. It checks
that the pre-existing control remains unchanged, then repeats the complete seed.
The second workspace supplies the required real Auth/JWT/role and browser checks.

`node scripts/demo/roundtrip.mjs cleanup` admits only the Auth smoke's two
preallocated task UUIDs and their four validated trigger-event UUIDs into the
existing inventory. Any other change stops cleanup. It repeats guarded cleanup,
checks tenant/Auth/Storage absence and control preservation, then deletes only
the separately recorded control through its owner/API path and checks absence.
All credentials, manifests, logs and traces remain ignored/private.

Preflight branches can run the focused native `seed-diagnostic` job first.
The actual 009 release branch always runs every mandatory SQL, security,
web/worker, build, real Auth/JWT and three-engine browser gate, followed by guarded
cleanup. A diagnostic success alone cannot close release acceptance. Local
Windows Docker/WSL is not required or enabled; real remote verification remains
pending until its exact native run has completed.
