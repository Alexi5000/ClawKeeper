# ClawKeeper v2.0 Design

Date: 2026-07-07
Status: Draft for Alex review
Repo: Alexi5000/ClawKeeper

## Decision

ClawKeeper v2.0 should optimize for a client-ready production demo first, then package that proof like a strong public GitHub showcase.

The v2.0 story is:

> ClawKeeper is an auditable SMB finance-agent control plane. Agents can propose finance work, but deterministic policy, approval gates, tenant boundaries, and evidence logs decide what can run.

This release should not add more agent count, broad integrations, or speculative features. The core job is to make the existing product provable, runnable, reviewable, and professionally packaged.

## Current Reality

ClawKeeper already has a strong base:

- TypeScript backend with policy-gated agent execution.
- OpenClaw manifest and deterministic policy engine.
- Tenant-aware memory store with pgvector semantic search.
- Agent hierarchy, finance-domain orchestrators, skills, dashboard source, Dockerfile, and security docs.
- Backend quality gate currently passes locally: typecheck, lint, and 139 tests.

The release is not yet v2-ready because:

- Dashboard build fails after installing dependencies.
- There is no `.github/workflows` directory on `main`, so public CI proof is missing.
- Root dependency audit reports known vulnerabilities.
- Existing docs make some production-style claims that need stronger proof artifacts.
- There is no FDE-style typed contract, evaluator, benchmark, proof bundle, or notebook surface.

## Target User

Primary v2 reviewer:

- A technical client, buyer, or engineering peer evaluating whether ClawKeeper is real enough to trust as a finance-agent foundation.

Secondary v2 reviewer:

- A GitHub visitor deciding whether this is one of the best open finance-agent repositories worth starring, forking, or discussing.

The first reviewer needs proof. The second reviewer needs proof packaged clearly.

## Non-Goals

The v2.0 release should not:

- Add another large batch of agents.
- Add live Stripe, Plaid, QuickBooks, or Xero production writeback.
- Claim autonomous payment execution.
- Add paid provider dependencies to the default demo.
- Build a broad SaaS billing system.
- Rewrite the backend framework.
- Rebrand away from ClawKeeper.

## v2.0 Architecture

### 1. Proof Spine

The proof spine is the release backbone. Every public claim should point to one of these surfaces:

- Local quality gate.
- GitHub CI gate.
- Deterministic FDE benchmark.
- One-command demo run.
- Proof bundle artifact.
- Security/audit evidence.

The proof spine should answer:

- Can a reviewer install and run it?
- Does backend policy actually block unsafe finance actions?
- Does the dashboard build?
- Does Docker build?
- Are dependency risks visible and handled?
- Can a reviewer inspect what happened after a finance-agent run?

### 2. FDE Package

Add a small FDE package that mirrors the proven pattern from prior repo work:

- Typed versioned sprint contracts.
- Planner -> Generator -> Evaluator harness.
- Four-axis grading.
- Plateau detection.
- Deterministic finance scenarios.
- Committed benchmark summary.

The harness should be offline by default and should not need live LLM keys.

Recommended scenarios:

1. Invoice intake and validation.
2. Reconciliation exception review.
3. Approval-gated payment intent.
4. Audit-trail reconstruction.

The benchmark should grade:

- Policy safety.
- Financial correctness.
- Evidence completeness.
- Operator usability.

### 3. Dashboard Repair

Dashboard build must pass before v2.0 is called production-ready.

Minimum scope:

- Restore missing orchestration exported types.
- Restore missing API client methods used by agent pages.
- Fix reconciliation page typing.
- Remove unused imports flagged by TypeScript.
- Keep UI behavior stable unless a broken page cannot honestly be supported.

This is a repair track, not a redesign track.

### 4. CI and Release Gates

Add GitHub workflows for:

- Backend typecheck, lint, tests.
- Dashboard build.
- Dependency audit.
- Docker build.
- FDE benchmark/contracts check.

CI should run on pull request and push to `main`.

The default branch should remain simple: one active branch, no stale PRs, no disabled quality story.

### 5. Security and Dependency Cleanup

v2.0 should address or explicitly document dependency audit results.

Priority:

- Upgrade patch/minor dependencies that fix known vulnerabilities.
- Avoid major dependency jumps unless required.
- Keep financial policy behavior unchanged unless tests prove the migration.
- Add a short security note explaining what v2.0 does and does not protect.

### 6. Proof Bundle

Add a committed proof bundle under `docs/proof/v2.0/`.

Minimum files:

- `README.md`: how to verify the release.
- `benchmark.json`: deterministic FDE benchmark output.
- `demo-run.md`: one-command demo transcript or summarized run.
- `audit-evidence.json`: redacted policy/audit events from the demo.
- `screenshots/`: dashboard proof images if the dashboard can be run locally.

The proof bundle should be generated by scripts, not hand-written as a marketing artifact.

### 7. Public Packaging

After the proof spine is green, update public packaging:

- README.
- release notes.
- badges.
- architecture diagram if stale.
- short demo path.
- topic list if needed.

The README should lead with:

- What it is.
- What is proven.
- How to verify it in 5 minutes.
- What it deliberately does not do.

Avoid vague AI hype. Use concrete, inspectable claims.

## Data Flow For Demo

The demo should use seeded synthetic SMB finance data:

1. Seed tenant, users, vendors, invoices, transactions, and agent scenarios.
2. Run invoice validation.
3. Run reconciliation matching or exception detection.
4. Submit a payment intent that requires approval.
5. Show policy decision before execution.
6. Record redacted audit event.
7. Export proof bundle.

No real money movement occurs in v2.0.

## Error Handling

Expected failure states should be explicit:

- Missing database URL: setup exits with clear instructions.
- Missing optional provider key: live provider step is skipped, not failed.
- Policy denial: recorded as a successful safety outcome when expected.
- Dashboard API unavailable: dashboard shows controlled empty/error states.
- Dependency audit finding: CI fails unless the finding is explicitly waived in a tracked file.

## Testing Strategy

Required gates before v2.0 release:

- Backend typecheck.
- Backend lint.
- Backend unit tests.
- Dashboard build.
- FDE contracts check.
- FDE benchmark run.
- Docker build.
- Dependency audit.
- Proof bundle validation.

Optional after the proof spine:

- Playwright smoke for dashboard.
- Live database demo with Supabase or local Postgres.
- Public demo video/GIF.

## Release Criteria

v2.0 is ready when:

- `main` is clean.
- CI is green.
- Dashboard builds.
- Backend quality gate passes.
- Docker builds.
- Dependency audit is clean or documented with accepted risk.
- Proof bundle exists and can be regenerated.
- README points to the proof bundle.
- Release notes clearly describe v2.0 claims and limits.

## Open Questions

1. Should the v2 demo use local Docker Postgres only, or also include a Supabase proof path?
2. Should the first dashboard proof be a build-only gate, or should we add Playwright screenshots before public launch?
3. Should v2.0 keep OpenClaw as the main external positioning, or shift copy toward a framework-neutral finance-agent control plane?

## Recommended Implementation Order

1. Fix dashboard build.
2. Add CI workflows.
3. Resolve dependency audit findings.
4. Add FDE contracts and harness.
5. Add deterministic benchmark scenarios.
6. Add proof bundle generator.
7. Add Docker/demo validation.
8. Update README/release docs.
9. Cut v2.0 release after all gates pass.

