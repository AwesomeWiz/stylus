# Public beta release checklist

Release work starts at `72b990e221a2c353697f8edb5f64466d115feb6c` on
`codex/redesign-009-release-hardening`. The dedicated worktree started clean.
The root checkout and the previous worktree's generated Next.js type-path change
remain untouched. Later 009.1 instructions authorized normal task-branch pushes;
no merge, tag, publication or visibility change is authorized.

This checklist was created before implementation. An unchecked item is not a
passing gate. Final evidence must identify an exact release-candidate commit.

Engineering/native CI acceptance is **PASS** at exact tested candidate
`5c99aaea122338556d96703f0b32e90b6de4ed83`, native CircleCI #21. Final logs and
the distinction from its following documentation-only record are in
[the audit](RELEASE_AUDIT.md#final-native-acceptance--2026-11-16).
READY TO MAKE PUBLIC remains **NO** while manual checks below remain open.

## Initial inspection

- [x] Read the release brief, engineering rules and current project records.
- [x] Verify exact starting SHA, status, last ten commits and diff.
- [x] Inspect README, configuration, deployment/integration docs and asset manifests.
- [x] Inventory community/license/CI files: no project LICENSE or CI workflow is
      present at this baseline; README explicitly records the missing license.
- [x] Preserve the existing 008 generated development-path change.
- [x] Confirm brand redistribution provenance with the maintainer.
- [x] Record version history, dependency licenses and third-party compatibility
      before adding AGPL-3.0-only metadata.

## Legal and community

- [x] Canonical AGPL-3.0-only license and consistent package/document metadata.
- [x] Dependency licenses, all font binaries/notices and asset provenance reviewed.
- [x] Contributor copyright policy, AI disclosure and AI-assisted contribution rules.
- [x] Contribution, conduct, support, security, ownership and issue/PR templates.
- [x] Privacy/deployment responsibilities and manual GitHub settings documented;
      actual repository settings still require maintainer verification.

## Security

- [x] Current Git-visible tree and complete reachable Git history scans: zero findings;
      repeat on the exact final candidate.
- [x] Private/personal review; one Git author mailbox flagged, no history rewrite.
- [x] Vulnerability remediation and controlled dev-only moderate assessment recorded;
      repeat the audit on the final candidate.
- [x] Authentication, tenant/role/RLS, storage, URLs, serialization and logging review.
- [x] Jobs, worker, plugin and memory-domain boundaries reviewed.
- [x] OAuth, credential envelopes, keyrings and external-reference review.
- [x] Adversarial regression tests expose and protect the corrected Board grant gap.

## Reproducibility and CI

- [x] Deterministic clean install and all required web/worker quality gates.
- [x] Isolated database runner: 53 migrations from zero, real pgcrypto, 30 suites /
      1,138 assertions. Native CI execution remains separate.
- [x] Pre-integration upgrade preserves organization/Task/Board/object data and
      authorized writes; no existing database is reset.
- [x] Fresh-clone install/example configuration/build/public-browser instructions
      pass without optional services. Native authenticated setup remains below.
- [ ] Docker-dependent full local clean-clone signup, organization, onboarding and
      Core smoke: pending by owner instruction, not passed or waived.
- [x] Native CircleCI diagnostic #17 at `6ac08ac`: fresh Supabase, both complete
      demo seed/verification/exact-cleanup rounds, real Auth/JWT role checks,
      unchanged baseline and final control/asset/account absence. This does not
      replace the full signup/onboarding/browser acceptance above.
- [x] Hosted ledger/ACL read-only inspection and supported dry run identify exactly
      one required forward Board grant correction. Owner-authorized application is
      complete; the final ledger has 53 versions and column/RPC checks pass.
- [x] Native CircleCI `release-machine-ci` #21 completes every pipeline gate at
      exact candidate `5c99aaea122338556d96703f0b32e90b6de4ed83`, including all
      30 native SQL/RLS suites / 1,138 assertions, actual Auth/JWT, nine browser
      cases and final guarded cleanup. The full signup/onboarding walkthrough
      remains separate and unexecuted above.
- [x] Additional populated-tenant deletion migration: full isolated gate passes,
      supported dry run lists only `20261115000200`; separate hosted approval and
      exact demo cleanup are complete. Initial failed cleanup rolled back.

## Product and public presentation

- [x] Fictional optional demo workspace, guarded exact cleanup and verified absence.
- [x] README/documentation entry point, architecture and beta release notes drafted;
      actual reviewed media is complete; publication remains gated.
- [x] Actual UI screenshots and two concise interaction GIFs with reviewed provenance.
- [x] Themed 404 and reset-capable sanitized unexpected/global errors implemented;
      unit reset/redaction and production public semantic/focus/axe checks pass.
- [x] Empty/loading/failure/dead-control/link/metadata audit.
- [x] Available Chromium/Edge/Firefox/WebKit checks, responsive/keyboard/contrast,
      reduced motion and honest screen-reader smoke record.
- [x] Task payload/related-detail investigation, bounded integration loads and
      200/300/500-object Board regression checks.

## Candidate validation

- [x] Final full web and worker suites; complete SQL/RLS gate.
- [x] Fresh and upgrade migration paths, lint, both typechecks and production builds.
- [x] Formatting, links, whitespace, secrets/history, vulnerabilities/licenses,
      fonts/assets and private-data/artifact scans on the candidate tree.
- [x] Exact candidate identified by `git rev-parse HEAD` and final handoff; known
      limitations and remaining manual actions recorded in the audit.
- [x] No failing or unexecuted required gate reported as PASS.
- [x] No merge, release tag, publication or repository visibility change performed;
      only expressly authorized normal task-branch pushes were used for CI.

## Manual publication gates — still open

- [ ] Complete supported-host clean-clone signup/organization/onboarding/Core
      walkthrough without enabling the owner's disabled virtualization.
- [ ] Record physical Windows NVDA and any required physical-device acceptance.
- [ ] Verify live GitHub vulnerability reporting, dependency alerts, available
      secret/push protection, branch rules, required native check and review rules.
- [ ] Approve historical author email and sample business/domain metadata privacy.
- [ ] Confirm artifact notices/source obligations and operator-specific public
      service legal/privacy requirements; no compliance approval is inferred.
- [ ] For a public Google-enabled service, confirm applicable OAuth verification,
      including restricted Drive scope requirements; earlier test QA is separate.
- [ ] Obtain explicit authorization for any merge/publication/tag/visibility action.
