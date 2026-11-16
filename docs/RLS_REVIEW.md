# Public beta RLS review

REDESIGN-009 - updated 2026-11-16 - Fresh isolated catalog; native transport remains a separate gate.

This inventory is derived from 53 migrations in fresh isolated PostgreSQL; all
53 production migration files remain unchanged by this test-role repair.
The runner uses real pgcrypto/pgTAP and no permissive policies. Its former blanket
public-table grant to service_role masked test-side privileged inspection. That
test-only grant is removed; production migrations and grants are unchanged.
Tenant roles and denial behavior are exercised by the permanent domain suites, not inferred solely from RLS flags.

The corrected isolated result is **30 suites / 1,134 assertions**. The owner reports
fresh Docker Supabase and all 53 migrations passing on CircleCI at `06ecb41`;
native SQL rerun and remaining authenticated release checks are still pending.

| Direct service_role SELECT contract                                                                      | Expected access                  | Verification                                |
| -------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------- |
| `worker_registrations`, `jobs`, `task_reminder_deliveries`                                               | Denied; use guarded service RPCs | Catalog privileges plus actual 42501 reads  |
| `marketing_ask_council_turns`, `marketing_ask_council_conversations`                                     | Denied; use guarded service RPCs | Catalog privileges plus actual 42501 reads  |
| `marketing_creative_council_runs`, `marketing_external_research_runs`, `marketing_strategic_review_runs` | Denied; use guarded service RPCs | Catalog privileges plus actual 42501 reads  |
| Six integration adapter tables granted explicitly by `20261111000100`                                    | Allowed for service persistence  | Explicit SELECT grants retained and checked |

Fixture ID lookups and post-operation inspection use the postgres test connection.
Domain RPCs keep their original service/authenticated/anonymous roles; test-local
UUID settings confer no application authority. Ask Council verifies the reset
after a real role-scoped operation. The regression suite fails with the original
permissive bootstrap, so accidental broad service table grants cannot hide this
class of fixture failure again. Application behavior, RLS and migrations do not change.

All 71 organization-keyed tables and `organizations` have RLS enabled.
The two connection-keyed integration secret/cache tables have RLS and no browser CRUD.
`job_definitions` is a code-owned service registry without tenant rows or browser CRUD.
Service-only access still requires trusted server authorization at the calling boundary.

| Table                                         | Identity scope        | RLS              | Anonymous CRUD | Authenticated CRUD     | Policies |
| --------------------------------------------- | --------------------- | ---------------- | -------------- | ---------------------- | -------- |
| `activity_events`                             | Organization          | Enabled          | None           | SELECT                 | 1        |
| `ai_runs`                                     | Organization          | Enabled          | None           | SELECT                 | 1        |
| `audience_profiles`                           | Organization          | Enabled          | None           | INSERT, SELECT, UPDATE | 3        |
| `board_comment_mentions`                      | Organization          | Enabled          | None           | SELECT                 | 1        |
| `board_comments`                              | Organization          | Enabled          | None           | SELECT                 | 1        |
| `board_elements`                              | Organization          | Enabled          | None           | SELECT                 | 3        |
| `board_entity_conversions`                    | Organization          | Enabled          | None           | SELECT                 | 1        |
| `board_reactions`                             | Organization          | Enabled          | None           | SELECT                 | 1        |
| `board_votes`                                 | Organization          | Enabled          | None           | SELECT                 | 1        |
| `board_voting_sessions`                       | Organization          | Enabled          | None           | SELECT                 | 1        |
| `boards`                                      | Organization          | Enabled          | None           | SELECT                 | 3        |
| `brand_profiles`                              | Organization          | Enabled          | None           | INSERT, SELECT, UPDATE | 3        |
| `company_profiles`                            | Organization          | Enabled          | None           | INSERT, SELECT, UPDATE | 3        |
| `competitors`                                 | Organization          | Enabled          | None           | INSERT, SELECT, UPDATE | 3        |
| `external_resource_links`                     | Organization          | Enabled          | None           | SELECT                 | 1        |
| `integration_calendar_intents`                | Organization          | Enabled          | None           | None                   | 0        |
| `integration_connections`                     | Organization          | Enabled          | None           | SELECT                 | 1        |
| `integration_oauth_states`                    | Organization          | Enabled          | None           | None                   | 0        |
| `integration_resource_cache`                  | Connection            | Enabled          | None           | None                   | 0        |
| `integration_secrets`                         | Connection            | Enabled          | None           | None                   | 0        |
| `job_definitions`                             | Code registry         | Service registry | None           | None                   | 0        |
| `jobs`                                        | Organization          | Enabled          | None           | SELECT                 | 1        |
| `knowledge_memories`                          | Organization          | Enabled          | None           | None                   | 1        |
| `marketing_ask_council_context_refs`          | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_ask_council_conversations`         | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_ask_council_messages`              | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_ask_council_specialist_results`    | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_ask_council_turns`                 | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_campaigns`                         | Organization          | Enabled          | None           | INSERT, SELECT, UPDATE | 3        |
| `marketing_competitor_reel_analyses`          | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_competitor_reel_transcripts`       | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_competitor_reels`                  | Organization          | Enabled          | None           | INSERT, SELECT, UPDATE | 3        |
| `marketing_competitor_social_profiles`        | Organization          | Enabled          | None           | INSERT, SELECT, UPDATE | 3        |
| `marketing_competitors`                       | Organization          | Enabled          | None           | INSERT, SELECT, UPDATE | 3        |
| `marketing_creative_briefs`                   | Organization          | Enabled          | None           | INSERT, SELECT, UPDATE | 3        |
| `marketing_creative_council_evidence`         | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_creative_council_runs`             | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_creative_council_stages`           | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_experiment_links`                  | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_experiments`                       | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_external_research_evidence`        | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_external_research_reports`         | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_external_research_runs`            | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_external_research_sources`         | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_hypotheses`                        | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_hypothesis_sources`                | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_learnings`                         | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_performance_learning_evidence`     | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_performance_learnings`             | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_performance_snapshots`             | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_profiles`                          | Organization          | Enabled          | None           | INSERT, SELECT, UPDATE | 3        |
| `marketing_published_content`                 | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_reel_brief_versions`               | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_reel_ideas`                        | Organization          | Enabled          | None           | INSERT, SELECT, UPDATE | 3        |
| `marketing_research`                          | Organization          | Enabled          | None           | INSERT, SELECT, UPDATE | 3        |
| `marketing_strategic_council_review_versions` | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_strategic_review_runs`             | Organization          | Enabled          | None           | SELECT                 | 1        |
| `marketing_strategic_review_stages`           | Organization          | Enabled          | None           | SELECT                 | 1        |
| `memberships`                                 | Organization          | Enabled          | None           | SELECT                 | 1        |
| `milestones`                                  | Organization          | Enabled          | None           | SELECT                 | 1        |
| `note_links`                                  | Organization          | Enabled          | None           | SELECT                 | 1        |
| `notes`                                       | Organization          | Enabled          | None           | SELECT                 | 1        |
| `notifications`                               | Organization          | Enabled          | None           | SELECT                 | 1        |
| `onboarding_drafts`                           | Organization          | Enabled          | None           | SELECT                 | 1        |
| `onboarding_progress`                         | Organization          | Enabled          | None           | INSERT, SELECT, UPDATE | 3        |
| `organization_ai_policies`                    | Organization          | Enabled          | None           | SELECT                 | 1        |
| `organization_invitations`                    | Organization          | Enabled          | None           | None                   | 0        |
| `organization_plugins`                        | Organization          | Enabled          | None           | SELECT                 | 1        |
| `organizations`                               | Organization identity | Enabled          | None           | SELECT                 | 2        |
| `task_comments`                               | Organization          | Enabled          | None           | SELECT                 | 2        |
| `task_dependencies`                           | Organization          | Enabled          | None           | SELECT                 | 1        |
| `task_reminder_deliveries`                    | Organization          | Enabled          | None           | None                   | 0        |
| `tasks`                                       | Organization          | Enabled          | None           | SELECT                 | 3        |
| `worker_pairing_requests`                     | Organization          | Enabled          | None           | None                   | 0        |
| `worker_registrations`                        | Organization          | Enabled          | None           | None                   | 0        |

Table grants are only one layer: RLS predicates, column grants, foreign keys and bounded RPC authorization still apply.
A browser SELECT grant is not unrestricted access. Policies retain active membership, tenant, author/manager,
plugin, archive, memory-domain and exact-version conditions according to the relevant domain.

The new release suite dynamically discovers tenant tables and adds 86 assertions for RLS flags,
empty application security-definer search paths, credential/OAuth/cache/worker CRUD denial and
service-only connection activation. Existing domain suites test actual cross-tenant/role mutations.
All 149 application security-definer functions in the catalog pin an empty search path.

Reviewed boundaries include public task and Board reads, private Storage path checks, private Board
Realtime topics, worker lease/pairing secrets, explicit Company Memory promotion, ModelGateway-only
AI calls, plugin resolvers and OAuth credential/state/cache ownership. No policy or applied migration
was changed during this review. A new forward migration removes broad inherited Board
grants and restores explicit supported column writes. Full SQL results and platform/CI limits belong in the
[release audit](RELEASE_AUDIT.md).

The additional owner-confirmed tenant-deletion repair is separately approved and
deployed. It adds validated organization lifecycle references and defers
existing composite checks during that bounded cascade, without changing RLS or
reference keys. History mutation remains denied while the organization exists.
Populated Core/Research/Performance/Council deletion and unrelated-tenant
preservation are permanent tests; the complete local gate has 1,115 assertions.

Reproduce: `node scripts/database/test-isolated.mjs --catalog`. The ignored catalog report includes
table columns/grants/policy names and function configuration; no tenant records or credentials.
