# Public beta release checklist

Release work starts at `72b990e221a2c353697f8edb5f64466d115feb6c` on
`codex/redesign-009-release-hardening`. The dedicated worktree started clean.
The root checkout and the previous worktree's generated Next.js type-path change
remain untouched. No push, merge, tag or publication is authorized.

This checklist was created before implementation. An unchecked item is not a
passing gate. Final evidence must identify an exact release-candidate commit.

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

- [ ] Deterministic clean install and all required web/worker quality gates.
- [x] Isolated database runner: 53 migrations from zero, real pgcrypto, 30 suites /
      1,115 assertions. Native CI execution remains separate.
- [x] Pre-integration upgrade preserves organization/Task/Board/object data and
      authorized writes; no existing database is reset.
- [ ] Public self-host/optional-service/environment instructions tested.
- [ ] Docker-dependent full local clean-clone signup, organization, onboarding and
      Core smoke: pending by owner instruction, not passed or waived.
- [x] Hosted ledger/ACL read-only inspection and supported dry run identify exactly
      one required forward Board grant correction. Owner-authorized application is
      complete; all 52 hosted versions and explicit column/RPC checks match.
- [ ] Remote GitHub Actions run on the exact candidate. Pending unless a push is
      separately authorized; workflow inspection alone is not remote execution proof.
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
- [ ] Formatting, links, whitespace, secrets/history, vulnerabilities/licenses,
      fonts/assets and private-data/artifact scans on the candidate tree.
- [ ] Exact candidate SHA, known limitations and remaining manual actions recorded.
- [x] No failing or unexecuted required gate reported as PASS.
- [x] No merge, push, release tag or repository visibility change performed.
